import { useState } from 'react';
import { Link } from 'react-router-dom';
import { booksApi } from '../api/books';
import { getErrorMessage } from '../api/client';
import type { Book } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { BookFilters } from '../components/BookFilters';
import { BooksTable } from '../components/BooksTable';
import { Pagination } from '../components/Pagination';
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews';
import { useBookSearchParams } from '../hooks/useBookSearchParams';
import { useBooksQuery, useDeleteBook } from '../hooks/useBooks';
import { useCatalog } from '../hooks/useCatalog';
import { downloadBlob } from '../utils/download';

export function BooksPage() {
  const { isAdmin } = useAuth();
  const { query, filters, sortItems, setFilter, setPage, setLimit, onSort, clearFilters } =
    useBookSearchParams();
  const { data, isPending, isError, error, refetch, isFetching } = useBooksQuery(query);
  const catalog = useCatalog();
  const deleteBook = useDeleteBook();
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setNotice(null);
    try {
      const { blob, filename } = await booksApi.exportCsv(filters);
      downloadBlob(blob, filename);
    } catch (err) {
      setNotice({ type: 'error', text: getErrorMessage(err, 'No se pudo exportar el CSV') });
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = (book: Book) => {
    if (!window.confirm(`¿Eliminar "${book.title}"? Podrás restaurarlo desde la papelera.`)) return;
    deleteBook.mutate(book.id, {
      onSuccess: () => setNotice({ type: 'ok', text: `"${book.title}" se movió a la papelera` }),
      onError: (err) => setNotice({ type: 'error', text: getErrorMessage(err) }),
    });
  };

  const hasFilters = Boolean(
    filters.search || filters.genreId || filters.publisherId || filters.authorId || filters.available,
  );

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Inventario de libros</h1>
          {data && <p className="muted">{data.meta.total} libros encontrados</p>}
        </div>
        <div className="page-header__actions">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={handleExport}
            disabled={exporting || data?.meta.total === 0}
          >
            {exporting ? 'Exportando…' : 'Exportar CSV'}
          </button>
          <Link to="/books/new" className="btn btn--primary">
            Nuevo libro
          </Link>
        </div>
      </div>

      {notice && (
        <div className={`alert alert--${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
          {notice.text}
          <button type="button" className="alert__close" aria-label="Cerrar aviso" onClick={() => setNotice(null)}>
            ×
          </button>
        </div>
      )}

      <BookFilters
        filters={filters}
        authors={catalog.authors}
        publishers={catalog.publishers}
        genres={catalog.genres}
        onChange={setFilter}
        onClear={clearFilters}
      />

      {isPending ? (
        <LoadingState label="Cargando libros…" />
      ) : isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />
      ) : data.data.length === 0 ? (
        <EmptyState title={hasFilters ? 'No hay libros que coincidan con los filtros' : 'Aún no hay libros'}>
          {hasFilters ? (
            <button type="button" className="btn btn--secondary" onClick={clearFilters}>
              Limpiar filtros
            </button>
          ) : (
            <Link to="/books/new" className="btn btn--primary">
              Agregar el primero
            </Link>
          )}
        </EmptyState>
      ) : (
        <div className={isFetching ? 'is-refreshing' : undefined} aria-busy={isFetching}>
          <BooksTable
            books={data.data}
            sort={sortItems}
            onSort={onSort}
            canDelete={isAdmin}
            onDelete={handleDelete}
            deletingId={deleteBook.isPending ? deleteBook.variables : undefined}
          />
          <Pagination meta={data.meta} onPageChange={setPage} onLimitChange={setLimit} />
        </div>
      )}
    </section>
  );
}
