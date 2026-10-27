import { Prisma } from '@prisma/client';
import { SortItem } from '../../common/utils/sort.util';
import { PrismaTx } from '../../prisma/prisma.service';

export const BOOK_SORT_FIELDS = [
  'title',
  'author',
  'publisher',
  'genre',
  'price',
  'stock',
  'isAvailable',
  'createdAt',
  'updatedAt',
] as const;

export type BookSortField = (typeof BOOK_SORT_FIELDS)[number];
export type BookSort = SortItem<BookSortField>[];

export const bookInclude = { author: true, publisher: true, genre: true } as const;
export type BookWithRelations = Prisma.BookGetPayload<{ include: typeof bookInclude }>;

export interface BookFilters {
  search?: string;
  genreId?: string;
  publisherId?: string;
  authorId?: string;
  available?: boolean;
  // true = solo eliminados (papelera)
  deleted?: boolean;
}

export interface BookWriteData {
  title?: string;
  authorName?: string;
  publisherName?: string;
  genreName?: string;
  price?: number;
  stock?: number;
  isAvailable?: boolean;
  imageUrl?: string | null;
}

// abstraccion para que el servicio no dependa de Prisma directamente (DIP)
export abstract class BooksRepository {
  abstract findPage(
    filters: BookFilters,
    sort: BookSort,
    page: number,
    limit: number,
  ): Promise<{ items: BookWithRelations[]; total: number }>;

  abstract findBatch(
    filters: BookFilters,
    sort: BookSort,
    skip: number,
    take: number,
  ): Promise<BookWithRelations[]>;

  abstract findById(
    id: string,
    options?: { deleted?: boolean },
    tx?: PrismaTx,
  ): Promise<BookWithRelations | null>;

  abstract create(data: Required<Omit<BookWriteData, 'imageUrl'>>, tx?: PrismaTx): Promise<BookWithRelations>;

  abstract update(id: string, data: BookWriteData, tx?: PrismaTx): Promise<BookWithRelations>;

  abstract softDelete(id: string, tx?: PrismaTx): Promise<void>;

  abstract restore(id: string, tx?: PrismaTx): Promise<BookWithRelations>;
}
