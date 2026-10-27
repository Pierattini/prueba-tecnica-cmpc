import type { PaginationMeta } from '../api/types';
import { PAGE_SIZES } from '../hooks/useBookSearchParams';

interface Props {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}

// ventana de paginas alrededor de la actual, con la primera y la ultima siempre visibles
export function pageWindow(current: number, total: number, radius = 1): (number | 'gap')[] {
  const pages = new Set([1, total]);
  for (let p = current - radius; p <= current + radius; p++) {
    if (p >= 1 && p <= total) pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | 'gap')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push('gap');
    result.push(p);
  });
  return result;
}

export function Pagination({ meta, onPageChange, onLimitChange }: Props) {
  const { page, limit, total, totalPages } = meta;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <nav className="pagination" aria-label="Paginación">
      <p className="pagination__info">
        Mostrando {from}–{to} de {total}
      </p>
      <div className="pagination__pages">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Anterior
        </button>
        {pageWindow(page, totalPages).map((p, i) =>
          p === 'gap' ? (
            <span key={`gap-${i}`} className="pagination__gap">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={`btn btn--ghost pagination__page${p === page ? ' is-current' : ''}`}
              aria-current={p === page ? 'page' : undefined}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Siguiente
        </button>
      </div>
      {onLimitChange && (
        <label className="pagination__size">
          Por página
          <select value={limit} onChange={(e) => onLimitChange(Number(e.target.value))}>
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      )}
    </nav>
  );
}
