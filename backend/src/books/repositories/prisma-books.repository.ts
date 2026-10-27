import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SortDirection } from '../../common/utils/sort.util';
import { PrismaService, PrismaTx } from '../../prisma/prisma.service';
import {
  BookFilters,
  bookInclude,
  BookSort,
  BookSortField,
  BooksRepository,
  BookWithRelations,
  BookWriteData,
} from './books.repository';

type OrderBy = Prisma.BookOrderByWithRelationInput;

const ORDER_BY: Record<BookSortField, (dir: SortDirection) => OrderBy> = {
  title: (dir) => ({ title: dir }),
  author: (dir) => ({ author: { name: dir } }),
  publisher: (dir) => ({ publisher: { name: dir } }),
  genre: (dir) => ({ genre: { name: dir } }),
  price: (dir) => ({ price: dir }),
  stock: (dir) => ({ stock: dir }),
  isAvailable: (dir) => ({ isAvailable: dir }),
  createdAt: (dir) => ({ createdAt: dir }),
  updatedAt: (dir) => ({ updatedAt: dir }),
};

const connectByName = (name: string) => ({
  connectOrCreate: { where: { name }, create: { name } },
});

@Injectable()
export class PrismaBooksRepository extends BooksRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  buildWhere(filters: BookFilters): Prisma.BookWhereInput {
    // se excluyen los eliminados salvo que se pida la papelera
    const where: Prisma.BookWhereInput = { deletedAt: filters.deleted ? { not: null } : null };
    const search = filters.search?.trim();
    if (search) {
      // ILIKE '%x%' aprovecha los indices GIN trigram de title y authors.name
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { author: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (filters.genreId) where.genreId = filters.genreId;
    if (filters.publisherId) where.publisherId = filters.publisherId;
    if (filters.authorId) where.authorId = filters.authorId;
    if (filters.available !== undefined) where.isAvailable = filters.available;
    return where;
  }

  buildOrderBy(sort: BookSort): OrderBy[] {
    // id como desempate para que la paginacion sea estable
    return [...sort.map(({ field, direction }) => ORDER_BY[field](direction)), { id: 'asc' }];
  }

  async findPage(filters: BookFilters, sort: BookSort, page: number, limit: number) {
    const where = this.buildWhere(filters);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.book.findMany({
        where,
        orderBy: this.buildOrderBy(sort),
        skip: (page - 1) * limit,
        take: limit,
        include: bookInclude,
      }),
      this.prisma.book.count({ where }),
    ]);
    return { items, total };
  }

  findBatch(filters: BookFilters, sort: BookSort, skip: number, take: number) {
    return this.prisma.book.findMany({
      where: this.buildWhere(filters),
      orderBy: this.buildOrderBy(sort),
      skip,
      take,
      include: bookInclude,
    });
  }

  findById(id: string, options: { deleted?: boolean } = {}, tx?: PrismaTx) {
    return (tx ?? this.prisma).book.findFirst({
      where: { id, deletedAt: options.deleted ? { not: null } : null },
      include: bookInclude,
    });
  }

  create(data: Required<Omit<BookWriteData, 'imageUrl'>>, tx?: PrismaTx): Promise<BookWithRelations> {
    return (tx ?? this.prisma).book.create({
      data: {
        title: data.title,
        price: data.price,
        stock: data.stock,
        isAvailable: data.isAvailable,
        author: connectByName(data.authorName),
        publisher: connectByName(data.publisherName),
        genre: connectByName(data.genreName),
      },
      include: bookInclude,
    });
  }

  update(id: string, data: BookWriteData, tx?: PrismaTx): Promise<BookWithRelations> {
    return (tx ?? this.prisma).book.update({
      where: { id },
      data: {
        title: data.title,
        price: data.price,
        stock: data.stock,
        isAvailable: data.isAvailable,
        imageUrl: data.imageUrl,
        author: data.authorName ? connectByName(data.authorName) : undefined,
        publisher: data.publisherName ? connectByName(data.publisherName) : undefined,
        genre: data.genreName ? connectByName(data.genreName) : undefined,
      },
      include: bookInclude,
    });
  }

  async softDelete(id: string, tx?: PrismaTx): Promise<void> {
    await (tx ?? this.prisma).book.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  restore(id: string, tx?: PrismaTx): Promise<BookWithRelations> {
    return (tx ?? this.prisma).book.update({
      where: { id },
      data: { deletedAt: null },
      include: bookInclude,
    });
  }
}
