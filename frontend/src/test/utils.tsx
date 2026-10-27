import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { Book, Paginated, User } from '../api/types';
import { AuthProvider } from '../auth/AuthContext';
import { tokenStorage } from '../auth/tokenStorage';

export const adminUser: User = {
  id: 'u-admin',
  email: 'admin@cmpc.cl',
  name: 'Administrador',
  role: 'ADMIN',
  createdAt: '2024-01-01T00:00:00.000Z',
};

export const normalUser: User = { ...adminUser, id: 'u-user', email: 'usuario@cmpc.cl', name: 'Usuario', role: 'USER' };

export function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 'b1',
    title: 'Cien años de soledad',
    author: { id: 'a1', name: 'Gabriel García Márquez' },
    publisher: { id: 'p1', name: 'Sudamericana' },
    genre: { id: 'g1', name: 'Novela' },
    price: 18990,
    stock: 3,
    isAvailable: true,
    imageUrl: null,
    createdAt: '2024-05-01T10:00:00.000Z',
    updatedAt: '2024-05-02T10:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

export function page<T>(data: T[], overrides: Partial<Paginated<T>['meta']> = {}): Paginated<T> {
  return { data, meta: { page: 1, limit: 10, total: data.length, totalPages: 1, ...overrides } };
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

interface Options {
  route?: string;
  path?: string;
  user?: User | null;
}

export function renderWithProviders(ui: ReactElement, { route = '/', path = '/', user = adminUser }: Options = {}) {
  if (user) tokenStorage.save('test-token', user, 3600);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const result = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>
          <Routes>
            <Route path={path} element={ui} />
            <Route path="*" element={<LocationProbe />} />
          </Routes>
          <SearchProbe />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...result, queryClient };
}

// expone la URL actual para verificar que filtros y orden quedan en la query string
function SearchProbe() {
  const location = useLocation();
  return <div data-testid="url" hidden>{`${location.pathname}${location.search}`}</div>;
}
