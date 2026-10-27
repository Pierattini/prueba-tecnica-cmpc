import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="state">
      <p className="state__title">Página no encontrada</p>
      <Link to="/books" className="btn btn--primary">
        Ir al inventario
      </Link>
    </div>
  );
}
