import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { authApi } from '../api/auth';
import { booksApi } from '../api/books';
import { catalogApi } from '../api/catalog';
import { tokenStorage } from '../auth/tokenStorage';
import { adminUser, makeBook, normalUser, page, renderWithProviders } from '../test/utils';
import * as download from '../utils/download';
import { BookCreatePage } from './BookCreatePage';
import { BookDetailPage } from './BookDetailPage';
import { BookEditPage } from './BookEditPage';
import { BooksPage } from './BooksPage';
import { LoginPage } from './LoginPage';
import { NotFoundPage } from './NotFoundPage';
import { TrashPage } from './TrashPage';

function apiError(status: number, message: string) {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('fail', 'ERR', config as never, undefined, {
    status,
    data: { message },
    statusText: '',
    headers: {},
    config: config as never,
  });
}

const location = () => screen.getByTestId('location').textContent;

beforeEach(() => {
  vi.spyOn(catalogApi, 'list').mockResolvedValue([]);
});

describe('LoginPage', () => {
  it('inicia sesion y vuelve al listado', async () => {
    vi.spyOn(authApi, 'login').mockResolvedValue({
      accessToken: 't',
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: adminUser,
    });
    renderWithProviders(<LoginPage />, { route: '/login', path: '/login', user: null });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Email'), 'admin@cmpc.cl');
    await user.type(screen.getByLabelText('Contraseña'), 'Admin123!');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));

    await waitFor(() => expect(location()).toBe('/books'));
    expect(authApi.login).toHaveBeenCalledWith('admin@cmpc.cl', 'Admin123!');
    expect(tokenStorage.getToken()).toBe('t');
  });

  it('valida campos y muestra el error del backend', async () => {
    vi.spyOn(authApi, 'login').mockRejectedValue(apiError(401, 'Credenciales inválidas'));
    renderWithProviders(<LoginPage />, { route: '/login', path: '/login', user: null });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByText('Ingresa tu email')).toBeInTheDocument();
    expect(screen.getByText('Ingresa tu contraseña')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Email'), 'admin@cmpc.cl');
    await user.type(screen.getByLabelText('Contraseña'), 'mala');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales inválidas');
  });

  it('redirige a la ruta original si ya hay sesion', () => {
    renderWithProviders(<LoginPage />, { route: '/login', path: '/login', user: adminUser });
    expect(location()).toBe('/books');
  });
});

describe('BooksPage', () => {
  const books = [makeBook(), makeBook({ id: 'b2', title: 'Rayuela', isAvailable: false, stock: 0 })];

  it('lista libros y guarda el orden en la URL', async () => {
    const list = vi.spyOn(booksApi, 'list').mockResolvedValue(page(books, { total: 2 }));
    renderWithProviders(<BooksPage />, { route: '/books', path: '/books' });

    expect(screen.getByRole('status')).toHaveTextContent('Cargando libros');
    expect(await screen.findByText('Rayuela')).toBeInTheDocument();
    expect(screen.getByText('2 libros encontrados')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Precio/ }));
    await user.click(screen.getByRole('button', { name: /Título/ }));

    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'price:asc,title:asc' })));
    expect(screen.getByTestId('url').textContent).toContain('sort=price%3Aasc%2Ctitle%3Aasc');
    expect(screen.getByLabelText('prioridad 2')).toBeInTheDocument();
  });

  it('lee los filtros iniciales desde la URL', async () => {
    const list = vi.spyOn(booksApi, 'list').mockResolvedValue(page(books));
    renderWithProviders(<BooksPage />, { route: '/books?search=ray&available=false&page=2', path: '/books' });
    await screen.findByText('Rayuela');
    expect(list).toHaveBeenCalledWith(expect.objectContaining({ search: 'ray', available: 'false', page: 2 }));
    expect(screen.getByRole('searchbox')).toHaveValue('ray');
  });

  it('muestra estado vacio con filtros y permite limpiarlos', async () => {
    vi.spyOn(booksApi, 'list').mockResolvedValue(page([]));
    renderWithProviders(<BooksPage />, { route: '/books?search=zzz', path: '/books' });
    expect(await screen.findByText('No hay libros que coincidan con los filtros')).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Limpiar filtros' })[1]);
    await waitFor(() => expect(screen.getByTestId('url').textContent).toBe('/books'));
  });

  it('muestra estado vacio sin filtros', async () => {
    vi.spyOn(booksApi, 'list').mockResolvedValue(page([]));
    renderWithProviders(<BooksPage />, { route: '/books', path: '/books' });
    expect(await screen.findByText('Aún no hay libros')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar CSV' })).toBeDisabled();
  });

  it('muestra error y reintenta', async () => {
    const list = vi.spyOn(booksApi, 'list').mockRejectedValueOnce(apiError(500, 'Error interno del servidor'));
    list.mockResolvedValueOnce(page(books));
    renderWithProviders(<BooksPage />, { route: '/books', path: '/books' });
    expect(await screen.findByText('Error interno del servidor')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Rayuela')).toBeInTheDocument();
  });

  it('exporta el CSV con los filtros activos', async () => {
    vi.spyOn(booksApi, 'list').mockResolvedValue(page(books));
    const blob = new Blob(['csv']);
    const exportCsv = vi.spyOn(booksApi, 'exportCsv').mockResolvedValue({ blob, filename: 'libros.csv' });
    const save = vi.spyOn(download, 'downloadBlob').mockImplementation(() => {});
    renderWithProviders(<BooksPage />, { route: '/books?genreId=g1', path: '/books' });

    await userEvent.click(await screen.findByRole('button', { name: 'Exportar CSV' }));
    await waitFor(() => expect(save).toHaveBeenCalledWith(blob, 'libros.csv'));
    expect(exportCsv).toHaveBeenCalledWith(expect.objectContaining({ genreId: 'g1' }));
  });

  it('informa si el export falla', async () => {
    vi.spyOn(booksApi, 'list').mockResolvedValue(page(books));
    vi.spyOn(booksApi, 'exportCsv').mockRejectedValue(new Error('sin red'));
    renderWithProviders(<BooksPage />, { route: '/books', path: '/books' });
    await userEvent.click(await screen.findByRole('button', { name: 'Exportar CSV' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('sin red');
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('el admin elimina con confirmacion', async () => {
    vi.spyOn(booksApi, 'list').mockResolvedValue(page(books));
    const remove = vi.spyOn(booksApi, 'remove').mockResolvedValue();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    renderWithProviders(<BooksPage />, { route: '/books', path: '/books' });

    const row = (await screen.findByText('Rayuela')).closest('tr')!;
    await userEvent.click(within(row).getByRole('button', { name: 'Eliminar' }));
    expect(remove).not.toHaveBeenCalled();
    await userEvent.click(within(row).getByRole('button', { name: 'Eliminar' }));

    expect(confirm).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('"Rayuela" se movió a la papelera')).toBeInTheDocument();
    expect(remove).toHaveBeenCalledWith('b2');
  });

  it('muestra el error si la eliminacion falla', async () => {
    vi.spyOn(booksApi, 'list').mockResolvedValue(page(books));
    vi.spyOn(booksApi, 'remove').mockRejectedValue(apiError(403, 'No tienes permisos'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderWithProviders(<BooksPage />, { route: '/books', path: '/books' });
    await userEvent.click((await screen.findAllByRole('button', { name: 'Eliminar' }))[0]);
    expect(await screen.findByRole('alert')).toHaveTextContent('No tienes permisos');
  });

  it('un usuario sin rol admin no ve eliminar', async () => {
    vi.spyOn(booksApi, 'list').mockResolvedValue(page(books));
    renderWithProviders(<BooksPage />, { route: '/books', path: '/books', user: normalUser });
    await screen.findByText('Rayuela');
    expect(screen.queryByRole('button', { name: 'Eliminar' })).toBeNull();
  });

  it('pagina desde la tabla', async () => {
    const list = vi.spyOn(booksApi, 'list').mockResolvedValue(page(books, { total: 30, totalPages: 3 }));
    renderWithProviders(<BooksPage />, { route: '/books', path: '/books' });
    await userEvent.click(await screen.findByRole('button', { name: 'Siguiente' }));
    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
    await userEvent.selectOptions(screen.getByLabelText('Por página'), '20');
    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, limit: 20 })));
  });
});

describe('BookDetailPage', () => {
  const renderDetail = (user = adminUser, state?: unknown) =>
    renderWithProviders(<BookDetailPage />, {
      route: state ? { pathname: '/books/b1', state } as never : '/books/b1',
      path: '/books/:id',
      user,
    });

  it('muestra el detalle del libro', async () => {
    vi.spyOn(booksApi, 'get').mockResolvedValue(makeBook());
    renderDetail();
    expect(await screen.findByRole('heading', { name: 'Cien años de soledad' })).toBeInTheDocument();
    expect(screen.getByText('3 unidades')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Editar' })).toHaveAttribute('href', '/books/b1/edit');
  });

  it('muestra avisos que vienen de la navegacion', async () => {
    vi.spyOn(booksApi, 'get').mockResolvedValue(makeBook());
    renderDetail(adminUser, { notice: 'La imagen no se pudo subir' });
    expect(await screen.findByText('La imagen no se pudo subir')).toBeInTheDocument();
  });

  it('el admin elimina y vuelve al listado', async () => {
    vi.spyOn(booksApi, 'get').mockResolvedValue(makeBook());
    vi.spyOn(booksApi, 'remove').mockResolvedValue();
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    renderDetail();
    const button = await screen.findByRole('button', { name: 'Eliminar' });
    await userEvent.click(button);
    expect(booksApi.remove).not.toHaveBeenCalled();
    await userEvent.click(button);
    await waitFor(() => expect(location()).toBe('/books'));
  });

  it('muestra el error al eliminar', async () => {
    vi.spyOn(booksApi, 'get').mockResolvedValue(makeBook());
    vi.spyOn(booksApi, 'remove').mockRejectedValue(apiError(500, 'Falló'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderDetail();
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Falló');
  });

  it('el usuario normal no puede eliminar', async () => {
    vi.spyOn(booksApi, 'get').mockResolvedValue(makeBook({ isAvailable: false }));
    renderDetail(normalUser);
    expect(await screen.findByText('Sin stock')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Eliminar' })).toBeNull();
  });

  it('muestra el 404 como error', async () => {
    vi.spyOn(booksApi, 'get').mockRejectedValue(apiError(404, 'No existe un libro con id b1'));
    renderDetail();
    expect(await screen.findByText('No existe un libro con id b1')).toBeInTheDocument();
  });
});

describe('BookCreatePage', () => {
  async function fillForm() {
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Título'), 'Nuevo');
    await user.type(screen.getByLabelText('Autor'), 'Autor X');
    await user.type(screen.getByLabelText('Editorial'), 'Editorial X');
    await user.type(screen.getByLabelText('Género'), 'Novela');
    await user.type(screen.getByLabelText('Precio (CLP)'), '1000');
    await user.type(screen.getByLabelText('Stock'), '2');
    return user;
  }

  const renderCreate = () => renderWithProviders(<BookCreatePage />, { route: '/books/new', path: '/books/new' });

  it('crea el libro, sube la imagen y va al detalle', async () => {
    vi.spyOn(booksApi, 'create').mockResolvedValue(makeBook({ id: 'nuevo' }));
    const upload = vi.spyOn(booksApi, 'uploadImage').mockResolvedValue(makeBook());
    renderCreate();
    const user = await fillForm();
    await user.upload(screen.getByLabelText('Archivo de portada'), new File(['x'], 'a.png', { type: 'image/png' }));
    await user.click(screen.getByRole('button', { name: 'Crear libro' }));

    await waitFor(() => expect(location()).toBe('/books/nuevo'));
    expect(upload).toHaveBeenCalledWith('nuevo', expect.any(File));
  });

  it('si falla la imagen igual navega al libro creado', async () => {
    vi.spyOn(booksApi, 'create').mockResolvedValue(makeBook({ id: 'nuevo' }));
    vi.spyOn(booksApi, 'uploadImage').mockRejectedValue(apiError(400, 'Formato inválido'));
    renderCreate();
    const user = await fillForm();
    await user.upload(screen.getByLabelText('Archivo de portada'), new File(['x'], 'a.png', { type: 'image/png' }));
    await user.click(screen.getByRole('button', { name: 'Crear libro' }));
    await waitFor(() => expect(location()).toBe('/books/nuevo'));
  });

  it('muestra el error del backend sin navegar', async () => {
    vi.spyOn(booksApi, 'create').mockRejectedValue(apiError(409, 'Ya existe un registro con esos datos'));
    renderCreate();
    const user = await fillForm();
    await user.click(screen.getByRole('button', { name: 'Crear libro' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe un registro');
    expect(screen.queryByTestId('location')).toBeNull();
  });
});

describe('BookEditPage', () => {
  const renderEdit = () =>
    renderWithProviders(<BookEditPage />, { route: '/books/b1/edit', path: '/books/:id/edit' });

  it('precarga el libro, guarda y vuelve al detalle', async () => {
    vi.spyOn(booksApi, 'get').mockResolvedValue(makeBook());
    const update = vi.spyOn(booksApi, 'update').mockResolvedValue(makeBook({ stock: 9 }));
    renderEdit();
    const stock = await screen.findByLabelText('Stock');
    expect(stock).toHaveValue(3);

    const user = userEvent.setup();
    await user.clear(stock);
    await user.type(stock, '9');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(location()).toBe('/books/b1'));
    expect(update).toHaveBeenCalledWith('b1', expect.objectContaining({ stock: 9, title: 'Cien años de soledad' }));
  });

  it('sube la imagen nueva y muestra errores', async () => {
    vi.spyOn(booksApi, 'get').mockResolvedValue(makeBook({ imageUrl: '/uploads/a.png' }));
    vi.spyOn(booksApi, 'update').mockResolvedValue(makeBook());
    vi.spyOn(booksApi, 'uploadImage').mockRejectedValue(apiError(413, 'El archivo supera el tamaño máximo'));
    renderEdit();
    const user = userEvent.setup();
    await user.upload(
      await screen.findByLabelText('Archivo de portada'),
      new File(['x'], 'a.webp', { type: 'image/webp' }),
    );
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('supera el tamaño');
  });

  it('cancelar vuelve al detalle', async () => {
    vi.spyOn(booksApi, 'get').mockResolvedValue(makeBook());
    renderEdit();
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));
    expect(location()).toBe('/books/b1');
  });

  it('muestra error si el libro no carga', async () => {
    vi.spyOn(booksApi, 'get').mockRejectedValue(apiError(404, 'No existe'));
    renderEdit();
    expect(await screen.findByText('No existe')).toBeInTheDocument();
  });
});

describe('TrashPage', () => {
  it('lista eliminados y restaura', async () => {
    vi.spyOn(booksApi, 'listDeleted').mockResolvedValue(page([makeBook({ deletedAt: '2024-06-01T00:00:00Z' })]));
    const restore = vi.spyOn(booksApi, 'restore').mockResolvedValue(makeBook());
    renderWithProviders(<TrashPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Restaurar' }));
    expect(restore).toHaveBeenCalledWith('b1');
  });

  it('muestra vacio, error de restauracion y error de carga', async () => {
    const list = vi.spyOn(booksApi, 'listDeleted').mockResolvedValueOnce(page([]));
    const { unmount } = renderWithProviders(<TrashPage />);
    expect(await screen.findByText('La papelera está vacía')).toBeInTheDocument();
    unmount();

    list.mockResolvedValueOnce(page([makeBook()]));
    vi.spyOn(booksApi, 'restore').mockRejectedValue(apiError(404, 'El libro no está en la papelera'));
    const second = renderWithProviders(<TrashPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Restaurar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('no está en la papelera');
    second.unmount();

    list.mockRejectedValueOnce(apiError(403, 'Sin permisos'));
    renderWithProviders(<TrashPage />);
    expect(await screen.findByText('Sin permisos')).toBeInTheDocument();
  });

  it('pagina los eliminados', async () => {
    const list = vi
      .spyOn(booksApi, 'listDeleted')
      .mockResolvedValue(page([makeBook()], { total: 15, totalPages: 2 }));
    renderWithProviders(<TrashPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Siguiente' }));
    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
  });
});

describe('NotFoundPage', () => {
  it('ofrece volver al inventario', () => {
    renderWithProviders(<NotFoundPage />);
    expect(screen.getByRole('link', { name: 'Ir al inventario' })).toHaveAttribute('href', '/books');
  });
});
