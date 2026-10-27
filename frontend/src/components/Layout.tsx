import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function Layout() {
  const { user, isAdmin, logout } = useAuth();

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__inner">
          <NavLink to="/books" className="brand">
            <span className="brand__mark" aria-hidden="true" />
            CMPC Libros
          </NavLink>
          <nav className="nav" aria-label="Principal">
            <NavLink to="/books" end>
              Inventario
            </NavLink>
            <NavLink to="/books/new">Nuevo libro</NavLink>
            {isAdmin && <NavLink to="/trash">Papelera</NavLink>}
          </nav>
          <div className="user">
            <span className="user__name">{user?.name}</span>
            <span className="badge badge--role">{user?.role}</span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={logout}>
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </div>
  );
}
