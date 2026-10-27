import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { authApi } from '../api/auth';
import { setUnauthorizedHandler } from '../api/client';
import { adminUser, normalUser } from '../test/utils';
import { AuthProvider, useAuth } from './AuthContext';
import { ProtectedRoute } from './ProtectedRoute';
import { tokenStorage } from './tokenStorage';

vi.mock('../api/client', async (original) => ({
  ...(await original<typeof import('../api/client')>()),
  setUnauthorizedHandler: vi.fn(),
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    <AuthProvider>{children}</AuthProvider>
  </QueryClientProvider>
);

describe('tokenStorage', () => {
  it('guarda y lee la sesion', () => {
    tokenStorage.save('tok', adminUser, 60);
    expect(tokenStorage.getToken()).toBe('tok');
    expect(tokenStorage.read()?.user.email).toBe(adminUser.email);
    tokenStorage.clear();
    expect(tokenStorage.read()).toBeNull();
  });

  it('descarta sesiones vencidas o corruptas', () => {
    tokenStorage.save('tok', adminUser, -1);
    expect(tokenStorage.read()).toBeNull();
    localStorage.setItem('cmpc.session', '{no es json');
    expect(tokenStorage.read()).toBeNull();
    expect(localStorage.getItem('cmpc.session')).toBeNull();
  });
});

describe('AuthProvider', () => {
  it('inicia sesion, guarda el token y expone el rol', async () => {
    vi.spyOn(authApi, 'login').mockResolvedValue({
      accessToken: 'tok',
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: adminUser,
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user).toBeNull();

    await act(() => result.current.login('admin@cmpc.cl', 'x'));

    expect(result.current.user).toEqual(adminUser);
    expect(result.current.isAdmin).toBe(true);
    expect(tokenStorage.getToken()).toBe('tok');
  });

  it('restaura la sesion guardada y la cierra con logout', () => {
    tokenStorage.save('tok', normalUser, 60);
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAdmin).toBe(false);
    act(() => result.current.logout());
    expect(result.current.user).toBeNull();
    expect(tokenStorage.getToken()).toBeNull();
  });

  it('registra el logout como handler del 401 de axios', () => {
    const { unmount } = renderHook(() => useAuth(), { wrapper });
    expect(setUnauthorizedHandler).toHaveBeenCalledWith(expect.any(Function));
    unmount();
    expect(setUnauthorizedHandler).toHaveBeenLastCalledWith(null);
  });

  it('falla si se usa fuera del provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow(/AuthProvider/);
  });
});

describe('ProtectedRoute', () => {
  const renderRoute = (path: string) =>
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={[path]}>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<p>login</p>} />
              <Route path="/books" element={<p>libros</p>} />
              <Route element={<ProtectedRoute />}>
                <Route path="/privado" element={<p>privado</p>} />
              </Route>
              <Route element={<ProtectedRoute roles={['ADMIN']} />}>
                <Route path="/admin" element={<p>admin</p>} />
              </Route>
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

  it('redirige al login sin sesion', () => {
    renderRoute('/privado');
    expect(screen.getByText('login')).toBeInTheDocument();
  });

  it('muestra la ruta con sesion', () => {
    tokenStorage.save('tok', normalUser, 60);
    renderRoute('/privado');
    expect(screen.getByText('privado')).toBeInTheDocument();
  });

  it('redirige al listado si el rol no alcanza', () => {
    tokenStorage.save('tok', normalUser, 60);
    renderRoute('/admin');
    expect(screen.getByText('libros')).toBeInTheDocument();
  });

  it('permite la ruta de admin al admin', () => {
    tokenStorage.save('tok', adminUser, 60);
    renderRoute('/admin');
    expect(screen.getByText('admin')).toBeInTheDocument();
  });
});
