import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { AvailabilityFilter, BookFilters, BookQuery } from '../api/types';
import { parseSort, serializeSort, toggleSort } from '../utils/sort';

export const PAGE_SIZES = [10, 20, 50] as const;
const DEFAULT_LIMIT = 10;

const toPositiveInt = (raw: string | null, fallback: number) => {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

const toAvailability = (raw: string | null): AvailabilityFilter =>
  raw === 'true' || raw === 'false' ? raw : '';

// la URL es la fuente de verdad: filtros, orden y pagina sobreviven a recargas y se pueden compartir
export function useBookSearchParams() {
  const [params, setParams] = useSearchParams();

  const query: BookQuery = useMemo(() => {
    const limit = toPositiveInt(params.get('limit'), DEFAULT_LIMIT);
    return {
      page: toPositiveInt(params.get('page'), 1),
      limit: (PAGE_SIZES as readonly number[]).includes(limit) ? limit : DEFAULT_LIMIT,
      search: params.get('search') ?? '',
      genreId: params.get('genreId') ?? '',
      publisherId: params.get('publisherId') ?? '',
      authorId: params.get('authorId') ?? '',
      available: toAvailability(params.get('available')),
      sort: params.get('sort') ?? '',
    };
  }, [params]);

  const sortItems = useMemo(() => parseSort(query.sort), [query.sort]);

  const update = useCallback(
    (changes: Record<string, string | number>, resetPage: boolean) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(changes)) {
            if (value === '' || value === undefined) next.delete(key);
            else next.set(key, String(value));
          }
          // al cambiar filtros u orden se vuelve a la primera pagina
          if (resetPage) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const setFilter = useCallback(
    (key: keyof BookFilters, value: string) => update({ [key]: value }, true),
    [update],
  );

  const setPage = useCallback((page: number) => update({ page: page > 1 ? page : '' }, false), [update]);

  const setLimit = useCallback((limit: number) => update({ limit }, true), [update]);

  const onSort = useCallback(
    (field: string) => update({ sort: serializeSort(toggleSort(sortItems, field)) }, true),
    [sortItems, update],
  );

  const clearFilters = useCallback(() => {
    update({ search: '', genreId: '', publisherId: '', authorId: '', available: '' }, true);
  }, [update]);

  const filters: BookFilters = {
    search: query.search,
    genreId: query.genreId,
    publisherId: query.publisherId,
    authorId: query.authorId,
    available: query.available,
    sort: query.sort,
  };

  return { query, filters, sortItems, setFilter, setPage, setLimit, onSort, clearFilters };
}
