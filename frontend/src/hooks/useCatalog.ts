import { useQuery } from '@tanstack/react-query';
import { catalogApi, type CatalogKind } from '../api/catalog';

// los catalogos cambian poco, se cachean 5 minutos
const STALE_TIME = 5 * 60 * 1000;

function useCatalogList(kind: CatalogKind) {
  return useQuery({
    queryKey: ['catalog', kind],
    queryFn: () => catalogApi.list(kind),
    staleTime: STALE_TIME,
  });
}

export function useCatalog() {
  const authors = useCatalogList('authors');
  const publishers = useCatalogList('publishers');
  const genres = useCatalogList('genres');
  return {
    authors: authors.data ?? [],
    publishers: publishers.data ?? [],
    genres: genres.data ?? [],
  };
}
