import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { catalogApi } from '../api/catalog';
import { useBookSearchParams } from './useBookSearchParams';
import { useCatalog } from './useCatalog';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  it('entrega el valor solo despues del retardo', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 400), {
      initialProps: { value: 'a' },
    });
    rerender({ value: 'ab' });
    act(() => vi.advanceTimersByTime(399));
    expect(result.current).toBe('a');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe('ab');
    vi.useRealTimers();
  });
});

describe('useBookSearchParams', () => {
  function setup(url = '/books') {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
    );
    return renderHook(() => ({ params: useBookSearchParams(), location: useLocation() }), { wrapper });
  }

  it('lee filtros, orden y pagina desde la URL', () => {
    const { result } = setup('/books?page=3&limit=20&search=sol&genreId=g1&available=true&sort=price:desc');
    expect(result.current.params.query).toEqual({
      page: 3,
      limit: 20,
      search: 'sol',
      genreId: 'g1',
      publisherId: '',
      authorId: '',
      available: 'true',
      sort: 'price:desc',
    });
    expect(result.current.params.sortItems).toEqual([{ field: 'price', direction: 'desc' }]);
  });

  it('usa valores por defecto ante parametros invalidos', () => {
    const { result } = setup('/books?page=-2&limit=999&available=quizas');
    expect(result.current.params.query).toMatchObject({ page: 1, limit: 10, available: '' });
  });

  it('al filtrar vuelve a la pagina 1 y quita filtros vacios', () => {
    const { result } = setup('/books?page=4&genreId=g1');
    act(() => result.current.params.setFilter('search', 'borges'));
    expect(result.current.location.search).toBe('?genreId=g1&search=borges');
    act(() => result.current.params.setFilter('genreId', ''));
    expect(result.current.location.search).toBe('?search=borges');
  });

  it('cambia de pagina sin perder filtros', () => {
    const { result } = setup('/books?search=x');
    act(() => result.current.params.setPage(2));
    expect(result.current.location.search).toBe('?search=x&page=2');
    act(() => result.current.params.setPage(1));
    expect(result.current.location.search).toBe('?search=x');
  });

  it('acumula el orden de varias columnas', () => {
    const { result } = setup('/books');
    act(() => result.current.params.onSort('price'));
    act(() => result.current.params.onSort('title'));
    act(() => result.current.params.onSort('price'));
    expect(new URLSearchParams(result.current.location.search).get('sort')).toBe('price:desc,title:asc');
  });

  it('cambia el tamaño de pagina y limpia filtros conservando el orden', () => {
    const { result } = setup('/books?search=x&authorId=a&sort=title:asc&page=2');
    act(() => result.current.params.setLimit(50));
    expect(result.current.location.search).toContain('limit=50');
    act(() => result.current.params.clearFilters());
    expect(result.current.location.search).toBe('?sort=title%3Aasc&limit=50');
  });
});

describe('useCatalog', () => {
  it('carga los tres catalogos', async () => {
    vi.spyOn(catalogApi, 'list').mockImplementation(async (kind) => [{ id: kind, name: kind }]);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useCatalog(), { wrapper });
    expect(result.current.authors).toEqual([]);
    await waitFor(() => expect(result.current.genres).toEqual([{ id: 'genres', name: 'genres' }]));
    expect(result.current.authors[0].id).toBe('authors');
    expect(result.current.publishers[0].id).toBe('publishers');
  });
});
