import { BadRequestException, NotFoundException, StreamableFile } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { makeBook } from '../test-utils/book.fixture';
import { toBookResponse } from './book.mapper';
import { BooksService, EXPORT_BATCH_SIZE, MAX_IMAGE_SIZE } from './books.service';
import { BooksRepository } from './repositories/books.repository';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const ctx = { userId: 'user-1', ip: '127.0.0.1' };

async function readStream(file: StreamableFile): Promise<string> {
  let out = '';
  for await (const chunk of file.getStream()) out += chunk.toString();
  return out;
}

describe('BooksService', () => {
  let service: BooksService;
  let repo: jest.Mocked<BooksRepository>;
  let audit: { record: jest.Mock };
  let storage: jest.Mocked<StorageService>;
  const tx = { tx: true };

  beforeEach(() => {
    repo = {
      findPage: jest.fn(),
      findBatch: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
    } as jest.Mocked<BooksRepository>;
    audit = { record: jest.fn() };
    storage = { save: jest.fn(), delete: jest.fn() } as jest.Mocked<StorageService>;
    const prisma = { $transaction: jest.fn((fn: (t: unknown) => unknown) => fn(tx)) };
    service = new BooksService(
      repo,
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
      storage,
    );
  });

  describe('findAll', () => {
    it('pagina, aplica filtros y orden por defecto', async () => {
      const book = makeBook();
      repo.findPage.mockResolvedValue({ items: [book], total: 11 });

      const result = await service.findAll({ page: 2, limit: 10, search: 'cien', available: true });

      expect(repo.findPage).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'cien', available: true, deleted: false }),
        [{ field: 'createdAt', direction: 'desc' }],
        2,
        10,
      );
      expect(result.items).toEqual([toBookResponse(book)]);
      expect(result.meta).toEqual({ page: 2, limit: 10, total: 11, totalPages: 2 });
    });

    it('pide la papelera cuando deleted=true y respeta el orden recibido', async () => {
      repo.findPage.mockResolvedValue({ items: [], total: 0 });
      await service.findAll({ page: 1, limit: 10, sort: 'price:desc,title' }, true);
      expect(repo.findPage).toHaveBeenCalledWith(
        expect.objectContaining({ deleted: true }),
        [
          { field: 'price', direction: 'desc' },
          { field: 'title', direction: 'asc' },
        ],
        1,
        10,
      );
    });

    it('rechaza campos de orden no permitidos', async () => {
      await expect(service.findAll({ page: 1, limit: 10, sort: 'deletedAt:asc' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOne', () => {
    it('devuelve el libro con el precio como number', async () => {
      repo.findById.mockResolvedValue(makeBook());
      const book = await service.findOne('id');
      expect(book.price).toBe(18990.5);
    });

    it('lanza 404 si no existe', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.findOne('id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const dto = { title: 'T', author: 'A', publisher: 'P', genre: 'G', price: 100, stock: 0 };

    it('deriva la disponibilidad del stock y audita dentro de la transaccion', async () => {
      const created = makeBook({ stock: 0, isAvailable: false });
      repo.create.mockResolvedValue(created);

      await service.create(dto, ctx);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ authorName: 'A', isAvailable: false }),
        tx,
      );
      expect(audit.record).toHaveBeenCalledWith(
        tx,
        ctx,
        expect.objectContaining({ action: AuditAction.CREATE, entityId: created.id }),
      );
    });

    it('marca disponible cuando hay stock', async () => {
      repo.create.mockResolvedValue(makeBook());
      await service.create({ ...dto, stock: 5 }, ctx);
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ isAvailable: true }), tx);
    });
  });

  describe('update', () => {
    it('guarda solo los cambios reales en la auditoria', async () => {
      const before = makeBook({ stock: 3 });
      const after = makeBook({ stock: 0, isAvailable: false });
      repo.findById.mockResolvedValue(before);
      repo.update.mockResolvedValue(after);

      const result = await service.update(before.id, { stock: 0 }, ctx);

      expect(repo.update).toHaveBeenCalledWith(before.id, expect.objectContaining({ stock: 0, isAvailable: false }), tx);
      expect(audit.record).toHaveBeenCalledWith(tx, ctx, {
        action: AuditAction.UPDATE,
        entity: 'Book',
        entityId: before.id,
        changes: { stock: { from: 3, to: 0 }, isAvailable: { from: true, to: false } },
      });
      expect(result.isAvailable).toBe(false);
    });

    it('no recalcula la disponibilidad si no viene stock', async () => {
      repo.findById.mockResolvedValue(makeBook());
      repo.update.mockResolvedValue(makeBook({ title: 'Otro' }));
      await service.update('id', { title: 'Otro' }, ctx);
      expect(repo.update).toHaveBeenCalledWith('id', expect.objectContaining({ isAvailable: undefined }), tx);
    });

    it('no audita un PATCH sin cambios', async () => {
      repo.findById.mockResolvedValue(makeBook());
      repo.update.mockResolvedValue(makeBook());
      await service.update('id', { title: 'Cien años de soledad' }, ctx);
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('lanza 404 si el libro no existe', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.update('id', {}, ctx)).rejects.toThrow(NotFoundException);
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe('remove y restore', () => {
    it('hace soft delete y audita', async () => {
      repo.findById.mockResolvedValue(makeBook());
      await service.remove('id', ctx);
      expect(repo.softDelete).toHaveBeenCalledWith('id', tx);
      expect(audit.record).toHaveBeenCalledWith(tx, ctx, expect.objectContaining({ action: AuditAction.DELETE }));
    });

    it('no elimina libros inexistentes', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.remove('id', ctx)).rejects.toThrow(NotFoundException);
      expect(repo.softDelete).not.toHaveBeenCalled();
    });

    it('restaura solo libros que estan en la papelera', async () => {
      repo.findById.mockResolvedValue(makeBook({ deletedAt: new Date() }));
      repo.restore.mockResolvedValue(makeBook());
      await service.restore('id', ctx);
      expect(repo.findById).toHaveBeenCalledWith('id', { deleted: true }, tx);
      expect(audit.record).toHaveBeenCalledWith(tx, ctx, expect.objectContaining({ action: AuditAction.RESTORE }));
    });

    it('responde 404 al restaurar algo que no esta eliminado', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.restore('id', ctx)).rejects.toThrow(/papelera/);
    });
  });

  describe('uploadImage', () => {
    const file = { buffer: PNG, mimetype: 'image/png', size: PNG.length };

    it('valida presencia, tamaño, mimetype y contenido', async () => {
      await expect(service.uploadImage('id', undefined, ctx)).rejects.toThrow(/adjuntar/);
      await expect(service.uploadImage('id', { ...file, size: MAX_IMAGE_SIZE + 1 }, ctx)).rejects.toThrow(/2MB/);
      await expect(service.uploadImage('id', { ...file, mimetype: 'image/gif' }, ctx)).rejects.toThrow(
        /Formato no permitido/,
      );
      await expect(
        service.uploadImage('id', { ...file, buffer: Buffer.from('<script>') }, ctx),
      ).rejects.toThrow(/no corresponde a una imagen/);
      expect(storage.save).not.toHaveBeenCalled();
    });

    it('guarda la nueva imagen y borra la anterior despues de confirmar', async () => {
      repo.findById.mockResolvedValue(makeBook({ imageUrl: '/uploads/books/old.png' }));
      storage.save.mockResolvedValue({ key: 'books/new.png', url: '/uploads/books/new.png' });
      repo.update.mockResolvedValue(makeBook({ imageUrl: '/uploads/books/new.png' }));

      const result = await service.uploadImage('id', file, ctx);

      expect(storage.save).toHaveBeenCalledWith(
        { buffer: PNG, extension: 'png', contentType: 'image/png' },
        'books',
      );
      expect(audit.record).toHaveBeenCalledWith(
        tx,
        ctx,
        expect.objectContaining({
          action: AuditAction.UPLOAD_IMAGE,
          changes: { imageUrl: { from: '/uploads/books/old.png', to: '/uploads/books/new.png' } },
        }),
      );
      expect(storage.delete).toHaveBeenCalledWith('/uploads/books/old.png');
      expect(result.imageUrl).toBe('/uploads/books/new.png');
    });

    it('no borra nada si el libro no tenia imagen', async () => {
      repo.findById.mockResolvedValue(makeBook());
      storage.save.mockResolvedValue({ key: 'k', url: '/uploads/books/new.png' });
      repo.update.mockResolvedValue(makeBook());
      await service.uploadImage('id', file, ctx);
      expect(storage.delete).not.toHaveBeenCalled();
    });

    it('si falla la BD borra el archivo nuevo y conserva el anterior', async () => {
      repo.findById.mockResolvedValue(makeBook({ imageUrl: '/uploads/books/old.png' }));
      storage.save.mockResolvedValue({ key: 'k', url: '/uploads/books/new.png' });
      repo.update.mockRejectedValue(new Error('db down'));

      await expect(service.uploadImage('id', file, ctx)).rejects.toThrow('db down');
      expect(storage.delete).toHaveBeenCalledTimes(1);
      expect(storage.delete).toHaveBeenCalledWith('/uploads/books/new.png');
    });
  });

  describe('exportCsv', () => {
    it('genera el CSV por lotes con BOM y encabezados', async () => {
      const fullBatch = Array.from({ length: EXPORT_BATCH_SIZE }, () => makeBook());
      repo.findBatch
        .mockResolvedValueOnce(fullBatch)
        .mockResolvedValueOnce([makeBook({ title: 'Último, "especial"', isAvailable: false })]);

      const file = service.exportCsv({ search: 'x', sort: 'title:asc' });
      const csv = await readStream(file);
      const lines = csv.trimEnd().split('\r\n');

      expect(csv.startsWith('﻿ID,Título,Autor')).toBe(true);
      expect(lines).toHaveLength(EXPORT_BATCH_SIZE + 2);
      expect(lines[1]).toContain(',18990.50,3,Sí,');
      expect(lines.at(-1)).toContain('"Último, ""especial"""');
      expect(lines.at(-1)).toContain(',No,');
      expect(repo.findBatch).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ search: 'x' }),
        [{ field: 'title', direction: 'asc' }],
        EXPORT_BATCH_SIZE,
        EXPORT_BATCH_SIZE,
      );
      expect(file.getHeaders()).toMatchObject({
        type: 'text/csv; charset=utf-8',
        disposition: expect.stringMatching(/^attachment; filename="libros-\d{4}-\d{2}-\d{2}\.csv"$/),
      });
    });

    it('valida el orden antes de abrir el stream', () => {
      expect(() => service.exportCsv({ sort: 'nope:asc' })).toThrow(BadRequestException);
    });
  });
});
