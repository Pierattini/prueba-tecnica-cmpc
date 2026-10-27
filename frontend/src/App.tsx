import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { Layout } from './components/Layout';
import { BookCreatePage } from './pages/BookCreatePage';
import { BookDetailPage } from './pages/BookDetailPage';
import { BookEditPage } from './pages/BookEditPage';
import { BooksPage } from './pages/BooksPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { TrashPage } from './pages/TrashPage';

export function App() {
  return (
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
  );
}
