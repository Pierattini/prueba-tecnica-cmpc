import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { Layout } from './components/Layout';
import { LoadingState } from './components/StateViews';
import { BooksPage } from './pages/BooksPage';
import { LoginPage } from './pages/LoginPage';

// login e inventario van en el bundle inicial; el resto se carga al navegar
const BookCreatePage = lazy(() => import('./pages/BookCreatePage').then((m) => ({ default: m.BookCreatePage })));
const BookDetailPage = lazy(() => import('./pages/BookDetailPage').then((m) => ({ default: m.BookDetailPage })));
const BookEditPage = lazy(() => import('./pages/BookEditPage').then((m) => ({ default: m.BookEditPage })));
const TrashPage = lazy(() => import('./pages/TrashPage').then((m) => ({ default: m.TrashPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

export function App() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/books" replace />} />
            <Route path="/books" element={<BooksPage />} />
            <Route path="/books/new" element={<BookCreatePage />} />
            <Route path="/books/:id" element={<BookDetailPage />} />
            <Route path="/books/:id/edit" element={<BookEditPage />} />
            <Route element={<ProtectedRoute roles={['ADMIN']} />}>
              <Route path="/trash" element={<TrashPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
