import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';
import { booksApi } from './api/books';
import { catalogApi } from './api/catalog';
import { AuthProvider } from './auth/AuthContext';
import { tokenStorage } from './auth/tokenStorage';
import { shouldRetry } from './queryClient';
import { adminUser, normalUser, page } from './test/utils';

function renderApp(route: string) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('App', () => {
  beforeEach(() => {
    vi.spyOn(catalogApi, 'list').mockResolvedValue([]);
    vi.spyOn(booksApi, 'list').mockResolvedValue(page([]));
  });

  it('sin sesion manda al login', () => {
    renderApp('/books');
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });

  it('con sesion redirige / al inventario y muestra el layout de admin', async () => {
    tokenStorage.save('t', adminUser, 60);
    renderApp('/');
    expect(await screen.findByRole('heading', { name: 'Inventario de libros' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Papelera' })).toBeInTheDocument();
    expect(screen.getByText('Administrador')).toBeInTheDocument();
  });

  it('cerrar sesion vuelve al login', async () => {
    tokenStorage.save('t', normalUser, 60);
    renderApp('/books');
    expect(screen.queryByRole('link', { name: 'Papelera' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });

  it('rutas desconocidas muestran 404', async () => {
    tokenStorage.save('t', adminUser, 60);
    renderApp('/no-existe');
    expect(await screen.findByText('Página no encontrada')).toBeInTheDocument();
  });
});

describe('shouldRetry', () => {
  const error = (status?: number) =>
    new AxiosError('x', 'E', { headers: new AxiosHeaders() } as never, undefined,
      status ? ({ status, data: {}, headers: {}, statusText: '', config: {} } as never) : undefined);

  it('no reintenta errores 4xx', () => {
    expect(shouldRetry(0, error(404))).toBe(false);
  });

  it('reintenta errores de red o 5xx hasta 2 veces', () => {
    expect(shouldRetry(0, error(500))).toBe(true);
    expect(shouldRetry(1, error())).toBe(true);
    expect(shouldRetry(2, new Error('x'))).toBe(false);
  });
});
