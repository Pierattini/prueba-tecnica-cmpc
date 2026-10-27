import { BadRequestException, Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { Readable } from 'node:stream';
import { AuditContext, AuditService } from '../audit/audit.service';
import { CSV_BOM, toCsvRow } from '../common/utils/csv.util';
import { diffFields } from '../common/utils/diff.util';
import { detectImageType, IMAGE_MIME_TYPES } from '../common/utils/file-signature.util';
import { Paginated } from '../common/utils/paginated';
import { parseSort } from '../common/utils/sort.util';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AUDITED_FIELDS, toAuditSnapshot, toBookResponse } from './book.mapper';
import { BookResponseDto } from './dto/book-response.dto';
import { CreateBookDto } from './dto/create-book.dto';
import { BookFiltersDto, QueryBooksDto } from './dto/query-books.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import {
  BOOK_SORT_FIELDS,
  BookFilters,
  BookSort,
  BooksRepository,
  BookWithRelations,
  BookWriteData,
} from './repositories/books.repository';

export const AUDIT_ENTITY = 'Book';
export const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
export const EXPORT_BATCH_SIZE = 500;
const DEFAULT_SORT: BookSort = [{ field: 'createdAt', direction: 'desc' }];

const CSV_HEADERS = [
  'ID',
  'Título',
  'Autor',
  'Editorial',
  'Género',
  'Precio',
  'Stock',
  'Disponible',
  'Creado',
  'Actualizado',
];

export interface UploadedImage {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

@Injectable()
export class BooksService {
  constructor(
    private readonly books: BooksRepository,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
  ) {}

  async findAll(query: QueryBooksDto, deleted = false): Promise<Paginated<BookResponseDto>> {
    const sort = parseSort(query.sort, BOOK_SORT_FIELDS, DEFAULT_SORT);
    const { items, total } = await this.books.findPage(
      { ...this.toFilters(query), deleted },
      sort,
      query.page,
      query.limit,
    );
    return Paginated.of(items.map(toBookResponse), total, query.page, query.limit);
  }

  async findOne(id: string): Promise<BookResponseDto> {
    return toBookResponse(await this.getOrFail(id));
  }

  create(dto: CreateBookDto, ctx: AuditContext): Promise<BookResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      const book = await this.books.create(
        {
          title: dto.title,
          authorName: dto.author,
          publisherName: dto.publisher,
          genreName: dto.genre,
          price: dto.price,
          stock: dto.stock,
          isAvailable: dto.stock > 0,
        },
        tx,
      );
      await this.audit.record(tx, ctx, {
        action: AuditAction.CREATE,
        entity: AUDIT_ENTITY,
        entityId: book.id,
        changes: toAuditSnapshot(book),
      });
      return toBookResponse(book);
    });
  }

  update(id: string, dto: UpdateBookDto, ctx: AuditContext): Promise<BookResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      const before = await this.getOrFail(id, false, tx);
      const data: BookWriteData = {
        title: dto.title,
        authorName: dto.author,
        publisherName: dto.publisher,
        genreName: dto.genre,
        price: dto.price,
        stock: dto.stock,
        isAvailable: dto.stock === undefined ? undefined : dto.stock > 0,
      };
      const after = await this.books.update(id, data, tx);
      const changes = diffFields(toAuditSnapshot(before), toAuditSnapshot(after), [...AUDITED_FIELDS]);

      // un PATCH sin cambios reales no ensucia la auditoria
      if (Object.keys(changes).length > 0) {
        await this.audit.record(tx, ctx, {
          action: AuditAction.UPDATE,
          entity: AUDIT_ENTITY,
          entityId: id,
          changes,
        });
      }
      return toBookResponse(after);
    });
  }

  remove(id: string, ctx: AuditContext): Promise<void> {
    return this.prisma.$transaction(async (tx) => {
      const book = await this.getOrFail(id, false, tx);
      await this.books.softDelete(id, tx);
      await this.audit.record(tx, ctx, {
        action: AuditAction.DELETE,
        entity: AUDIT_ENTITY,
        entityId: id,
        changes: toAuditSnapshot(book),
      });
    });
  }

  restore(id: string, ctx: AuditContext): Promise<BookResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      await this.getOrFail(id, true, tx);
      const book = await this.books.restore(id, tx);
      await this.audit.record(tx, ctx, {
        action: AuditAction.RESTORE,
        entity: AUDIT_ENTITY,
        entityId: id,
      });
      return toBookResponse(book);
    });
  }

  async uploadImage(
    id: string,
    file: UploadedImage | undefined,
    ctx: AuditContext,
  ): Promise<BookResponseDto> {
    if (!file) throw new BadRequestException('Debes adjuntar una imagen en el campo "image"');
    if (file.size > MAX_IMAGE_SIZE) {
      throw new BadRequestException('La imagen no puede superar los 2MB');
    }
    if (!Object.values(IMAGE_MIME_TYPES).includes(file.mimetype)) {
      throw new BadRequestException('Formato no permitido. Usa JPG, PNG o WEBP');
    }
    const type = detectImageType(file.buffer);
    if (!type) {
      throw new BadRequestException('El contenido del archivo no corresponde a una imagen válida');
    }

    const current = await this.getOrFail(id);
    const stored = await this.storage.save(
      { buffer: file.buffer, extension: type, contentType: IMAGE_MIME_TYPES[type] },
      'books',
    );

    let updated: BookWithRelations;
    try {
      updated = await this.prisma.$transaction(async (tx) => {
        const book = await this.books.update(id, { imageUrl: stored.url }, tx);
        await this.audit.record(tx, ctx, {
          action: AuditAction.UPLOAD_IMAGE,
          entity: AUDIT_ENTITY,
          entityId: id,
          changes: { imageUrl: { from: current.imageUrl, to: stored.url } },
        });
        return book;
      });
    } catch (err) {
      // si falla la BD se borra el archivo nuevo y la imagen anterior queda intacta
      await this.storage.delete(stored.url);
      throw err;
    }

    if (current.imageUrl) await this.storage.delete(current.imageUrl);
    return toBookResponse(updated);
  }

  exportCsv(query: BookFiltersDto): StreamableFile {
    // se valida el orden antes de empezar a escribir para poder responder 400
    const sort = parseSort(query.sort, BOOK_SORT_FIELDS, DEFAULT_SORT);
    const stream = Readable.from(this.generateCsv(this.toFilters(query), sort));
    const date = new Date().toISOString().slice(0, 10);
    return new StreamableFile(stream, {
      type: 'text/csv; charset=utf-8',
      disposition: `attachment; filename="libros-${date}.csv"`,
    });
  }

  async *generateCsv(filters: BookFilters, sort: BookSort): AsyncGenerator<string> {
    yield CSV_BOM + toCsvRow(CSV_HEADERS);
    // por lotes para no cargar todo el inventario en memoria
    for (let skip = 0; ; skip += EXPORT_BATCH_SIZE) {
      const batch = await this.books.findBatch(filters, sort, skip, EXPORT_BATCH_SIZE);
      for (const book of batch) {
        yield toCsvRow([
          book.id,
          book.title,
          book.author.name,
          book.publisher.name,
          book.genre.name,
          Number(book.price).toFixed(2),
          book.stock,
          book.isAvailable ? 'Sí' : 'No',
          book.createdAt,
          book.updatedAt,
        ]);
      }
      if (batch.length < EXPORT_BATCH_SIZE) return;
    }
  }

  private toFilters(query: BookFiltersDto): BookFilters {
    return {
      search: query.search,
      genreId: query.genreId,
      publisherId: query.publisherId,
      authorId: query.authorId,
      available: query.available,
    };
  }

  private async getOrFail(
    id: string,
    deleted = false,
    tx?: Parameters<BooksRepository['findById']>[2],
  ): Promise<BookWithRelations> {
    const book = await this.books.findById(id, { deleted }, tx);
    if (!book) {
      throw new NotFoundException(
        deleted ? 'El libro no está en la papelera' : `No existe un libro con id ${id}`,
      );
    }
    return book;
  }
}
