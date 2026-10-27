import { Link } from 'react-router-dom';
import type { Book } from '../api/types';
import type { SortItem } from '../utils/sort';
import { formatPrice } from '../utils/format';
import { BookCover } from './BookCover';
import { SortableHeader } from './SortableHeader';

interface Props {
  books: Book[];
  sort: SortItem[];
  onSort: (field: string) => void;
  canDelete: boolean;
  onDelete: (book: Book) => void;
  deletingId?: string;
}

export function BooksTable({ books, sort, onSort, canDelete, onDelete, deletingId }: Props) {
  const header = (field: string, label: string, className?: string) => (
    <SortableHeader field={field} label={label} sort={sort} onSort={onSort} className={className} />
  );

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th scope="col" className="col-cover">
              <span className="sr-only">Portada</span>
            </th>
            {header('title', 'Título')}
            {header('author', 'Autor')}
            {header('publisher', 'Editorial', 'hide-md')}
            {header('genre', 'Género', 'hide-sm')}
            {header('price', 'Precio', 'num')}
            {header('stock', 'Stock', 'num hide-sm')}
            {header('isAvailable', 'Estado')}
            <th scope="col" className="col-actions">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {books.map((book) => (
            <tr key={book.id}>
              <td className="col-cover">
                <BookCover title={book.title} imageUrl={book.imageUrl} />
              </td>
              <td>
                <Link to={`/books/${book.id}`} className="table__title">
                  {book.title}
                </Link>
              </td>
              <td>{book.author.name}</td>
              <td className="hide-md">{book.publisher.name}</td>
              <td className="hide-sm">{book.genre.name}</td>
              <td className="num">{formatPrice(book.price)}</td>
              <td className="num hide-sm">{book.stock}</td>
              <td>
                <span className={`badge ${book.isAvailable ? 'badge--ok' : 'badge--muted'}`}>
                  {book.isAvailable ? 'Disponible' : 'Sin stock'}
                </span>
              </td>
              <td className="col-actions">
                <Link to={`/books/${book.id}/edit`} className="btn btn--ghost btn--sm">
                  Editar
                </Link>
                {canDelete && (
                  <button
                    type="button"
                    className="btn btn--danger-ghost btn--sm"
                    onClick={() => onDelete(book)}
                    disabled={deletingId === book.id}
                  >
                    Eliminar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
