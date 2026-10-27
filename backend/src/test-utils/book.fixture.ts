import { Prisma } from '@prisma/client';
import { BookWithRelations } from '../books/repositories/books.repository';

export function makeBook(overrides: Partial<BookWithRelations> = {}): BookWithRelations {
  const date = new Date('2024-05-01T10:00:00.000Z');
  return {
    id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    title: 'Cien años de soledad',
    authorId: 'a1',
    publisherId: 'p1',
    genreId: 'g1',
    price: new Prisma.Decimal('18990.50'),
    stock: 3,
    isAvailable: true,
    imageUrl: null,
    createdAt: date,
    updatedAt: date,
    deletedAt: null,
    author: { id: 'a1', name: 'Gabriel García Márquez', createdAt: date },
    publisher: { id: 'p1', name: 'Sudamericana', createdAt: date },
    genre: { id: 'g1', name: 'Novela', createdAt: date },
    ...overrides,
  };
}
