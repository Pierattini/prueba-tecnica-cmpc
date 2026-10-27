import { BookResponseDto } from './dto/book-response.dto';
import { BookWithRelations } from './repositories/books.repository';

const item = ({ id, name }: { id: string; name: string }) => ({ id, name });

export function toBookResponse(book: BookWithRelations): BookResponseDto {
  return {
    id: book.id,
    title: book.title,
    author: item(book.author),
    publisher: item(book.publisher),
    genre: item(book.genre),
    // el precio viene como Decimal, lo paso a number para el front
    price: Number(book.price),
    stock: book.stock,
    isAvailable: book.isAvailable,
    imageUrl: book.imageUrl,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
    deletedAt: book.deletedAt,
  };
}

export const AUDITED_FIELDS = [
  'title',
  'author',
  'publisher',
  'genre',
  'price',
  'stock',
  'isAvailable',
  'imageUrl',
] as const;

export type BookSnapshot = Record<(typeof AUDITED_FIELDS)[number], string | number | boolean | null>;

// vista plana del libro para guardar en audit_logs
export function toAuditSnapshot(book: BookWithRelations): BookSnapshot {
  return {
    title: book.title,
    author: book.author.name,
    publisher: book.publisher.name,
    genre: book.genre.name,
    price: Number(book.price),
    stock: book.stock,
    isAvailable: book.isAvailable,
    imageUrl: book.imageUrl,
  };
}
