import { useState } from 'react';
import { getErrorMessage } from '../api/client';
import type { BookQuery } from '../api/types';
import { Pagination } from '../components/Pagination';
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews';
import { useDeletedBooksQuery, useRestoreBook } from '../hooks/useBooks';
import { formatPrice } from '../utils/format';

const BASE_QUERY: Omit<BookQuery, 'page'> = {
  limit: 10,
  search: '',
  genreId: '',
  publisherId: '',
  authorId: '',
  available: '',
  sort: 'updatedAt:desc',
};

export function TrashPage() {
  const [page, setPage] = useState(1);
  const { data, isPending, isError, error, refetch } = useDeletedBooksQuery({ ...BASE_QUERY, page });
  const restore = useRestoreBook();

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Papelera</h1>
          <p className="muted">Libros eliminados. Puedes restaurarlos al inventario.</p>
        </div>
      </div>

      {restore.isError && (
        <div className="alert alert--error" role="alert">
          {getErrorMessage(restore.error)}
        </div>
      )}

      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />
      ) : data.data.length === 0 ? (
        <EmptyState title="La papelera está vacía" />
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Título</th>
                  <th scope="col">Autor</th>
                  <th scope="col" className="num">
                    Precio
                  </th>
                  <th scope="col" className="col-actions">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((book) => (
                  <tr key={book.id}>
                    <td>{book.title}</td>
                    <td>{book.author.name}</td>
                    <td className="num">{formatPrice(book.price)}</td>
                    <td className="col-actions">
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        disabled={restore.isPending && restore.variables === book.id}
                        onClick={() => restore.mutate(book.id)}
                      >
                        Restaurar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={data.meta} onPageChange={setPage} />
        </>
      )}
    </section>
  );
}
