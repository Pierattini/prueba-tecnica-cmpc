import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { BookCover } from '../components/BookCover';
import { ErrorState, LoadingState } from '../components/StateViews';
import { useBookQuery, useDeleteBook } from '../hooks/useBooks';
import { formatDate, formatPrice } from '../utils/format';

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { data: book, isPending, isError, error, refetch } = useBookQuery(id);
  const deleteBook = useDeleteBook();
  const notice = (location.state as { notice?: string } | null)?.notice;

  if (isPending) return <LoadingState label="Cargando libro…" />;
  if (isError) return <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />;

  const handleDelete = () => {
    if (!window.confirm(`¿Eliminar "${book.title}"? Podrás restaurarlo desde la papelera.`)) return;
    deleteBook.mutate(book.id, { onSuccess: () => navigate('/books', { replace: true }) });
  };

  return (
    <article className="detail">
      <Link to="/books" className="back-link">
        ← Volver al inventario
      </Link>

      {notice && (
        <div className="alert alert--warning" role="status">
          {notice}
        </div>
      )}
      {deleteBook.isError && (
        <div className="alert alert--error" role="alert">
          {getErrorMessage(deleteBook.error)}
        </div>
      )}

      <div className="detail__layout">
        <BookCover title={book.title} imageUrl={book.imageUrl} size="lg" />

        <div className="detail__info">
          <span className={`badge ${book.isAvailable ? 'badge--ok' : 'badge--muted'}`}>
            {book.isAvailable ? 'Disponible' : 'Sin stock'}
          </span>
          <h1>{book.title}</h1>
          <p className="detail__author">{book.author.name}</p>

          <dl className="detail__data">
            <div>
              <dt>Precio</dt>
              <dd>{formatPrice(book.price)}</dd>
            </div>
            <div>
              <dt>Stock</dt>
              <dd>{book.stock} unidades</dd>
            </div>
            <div>
              <dt>Editorial</dt>
              <dd>{book.publisher.name}</dd>
            </div>
            <div>
              <dt>Género</dt>
              <dd>{book.genre.name}</dd>
            </div>
            <div>
              <dt>Creado</dt>
              <dd>{formatDate(book.createdAt)}</dd>
            </div>
            <div>
              <dt>Actualizado</dt>
              <dd>{formatDate(book.updatedAt)}</dd>
            </div>
          </dl>

          <div className="detail__actions">
            <Link to={`/books/${book.id}/edit`} className="btn btn--primary">
              Editar
            </Link>
            {isAdmin && (
              <button
                type="button"
                className="btn btn--danger"
                onClick={handleDelete}
                disabled={deleteBook.isPending}
              >
                {deleteBook.isPending ? 'Eliminando…' : 'Eliminar'}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
