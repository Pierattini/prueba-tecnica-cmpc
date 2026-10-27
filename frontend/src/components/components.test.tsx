import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { BookFilters as Filters } from '../api/types';
import { makeBook } from '../test/utils';
import { BookCover } from './BookCover';
import { BookFilters } from './BookFilters';
import { BooksTable } from './BooksTable';
import { ImageUpload, MAX_IMAGE_BYTES, validateImage } from './ImageUpload';
import { pageWindow, Pagination } from './Pagination';
import { SortableHeader } from './SortableHeader';
import { EmptyState, ErrorState, LoadingState } from './StateViews';

const emptyFilters: Filters = { search: '', genreId: '', publisherId: '', authorId: '', available: '', sort: '' };

describe('StateViews', () => {
  it('renderiza carga, vacio y error con reintento', async () => {
    const onRetry = vi.fn();
    render(
      <>
        <LoadingState />
        <EmptyState title="Nada por aquí">
          <span>accion</span>
        </EmptyState>
        <ErrorState message="Se cayó" onRetry={onRetry} />
      </>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Cargando');
    expect(screen.getByText('Nada por aquí')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Se cayó');
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('ErrorState sin reintento no muestra el boton', () => {
    render(<ErrorState message="x" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('SortableHeader', () => {
  const renderHeader = (sort: { field: string; direction: 'asc' | 'desc' }[], onSort = vi.fn()) =>
    render(
      <table>
        <thead>
          <tr>
            <SortableHeader field="price" label="Precio" sort={sort} onSort={onSort} />
          </tr>
        </thead>
      </table>,
    );

  it('muestra direccion y prioridad cuando hay varios ordenes', async () => {
    const onSort = vi.fn();
    renderHeader(
      [
        { field: 'title', direction: 'asc' },
        { field: 'price', direction: 'desc' },
      ],
      onSort,
    );
    expect(screen.getByRole('columnheader')).toHaveAttribute('aria-sort', 'descending');
    expect(screen.getByLabelText('prioridad 2')).toHaveTextContent('2');
    await userEvent.click(screen.getByRole('button'));
    expect(onSort).toHaveBeenCalledWith('price');
  });

  it('no muestra prioridad con un solo orden y marca none si no participa', () => {
    const { unmount } = renderHeader([{ field: 'price', direction: 'asc' }]);
    expect(screen.getByRole('columnheader')).toHaveAttribute('aria-sort', 'ascending');
    expect(screen.queryByLabelText(/prioridad/)).toBeNull();
    unmount();
    renderHeader([]);
    expect(screen.getByRole('columnheader')).toHaveAttribute('aria-sort', 'none');
  });
});

describe('Pagination', () => {
  it('calcula la ventana de paginas con saltos', () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(5, 10)).toEqual([1, 'gap', 4, 5, 6, 'gap', 10]);
    expect(pageWindow(2, 4)).toEqual([1, 2, 3, 4]);
  });

  it('navega entre paginas y cambia el tamaño', async () => {
    const onPage = vi.fn();
    const onLimit = vi.fn();
    render(
      <Pagination meta={{ page: 2, limit: 10, total: 35, totalPages: 4 }} onPageChange={onPage} onLimitChange={onLimit} />,
    );
    expect(screen.getByText('Mostrando 11–20 de 35')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-current', 'page');

    await userEvent.click(screen.getByRole('button', { name: 'Anterior' }));
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await userEvent.click(screen.getByRole('button', { name: '4' }));
    expect(onPage.mock.calls).toEqual([[1], [3], [4]]);

    await userEvent.selectOptions(screen.getByRole('combobox'), '50');
    expect(onLimit).toHaveBeenCalledWith(50);
  });

  it('deshabilita los extremos y no muestra el selector si no se pide', () => {
    render(<Pagination meta={{ page: 1, limit: 10, total: 0, totalPages: 1 }} onPageChange={vi.fn()} />);
    expect(screen.getByText('Mostrando 0–0 de 0')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    expect(screen.queryByRole('combobox')).toBeNull();
  });
});

describe('BookFilters', () => {
  const catalogs = {
    authors: [{ id: 'a1', name: 'Borges' }],
    publishers: [{ id: 'p1', name: 'Anagrama' }],
    genres: [{ id: 'g1', name: 'Cuento' }],
  };

  it('aplica la busqueda con debounce de 400ms', async () => {
    const onChange = vi.fn();
    render(<BookFilters filters={emptyFilters} {...catalogs} onChange={onChange} onClear={vi.fn()} />);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'borges' } });
    expect(onChange).not.toHaveBeenCalled();
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('search', 'borges'), { timeout: 1000 });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('cambia los selects y limpia', async () => {
    const onChange = vi.fn();
    const onClear = vi.fn();
    render(
      <BookFilters filters={{ ...emptyFilters, genreId: 'g1' }} {...catalogs} onChange={onChange} onClear={onClear} />,
    );
    await userEvent.selectOptions(screen.getByLabelText('Autor'), 'a1');
    await userEvent.selectOptions(screen.getByLabelText('Editorial'), 'p1');
    await userEvent.selectOptions(screen.getByLabelText('Género'), '');
    await userEvent.selectOptions(screen.getByLabelText('Disponibilidad'), 'false');
    expect(onChange.mock.calls).toEqual([
      ['authorId', 'a1'],
      ['publisherId', 'p1'],
      ['genreId', ''],
      ['available', 'false'],
    ]);
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(onClear).toHaveBeenCalled();
  });

  it('sincroniza el input cuando la URL cambia desde afuera', () => {
    const props = { ...catalogs, onChange: vi.fn(), onClear: vi.fn() };
    const { rerender } = render(<BookFilters filters={{ ...emptyFilters, search: 'viejo' }} {...props} />);
    expect(screen.getByRole('searchbox')).toHaveValue('viejo');
    rerender(<BookFilters filters={emptyFilters} {...props} />);
    expect(screen.getByRole('searchbox')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Limpiar filtros' })).toBeDisabled();
  });
});

describe('BookCover', () => {
  it('muestra iniciales sin imagen o si la imagen falla', () => {
    const { rerender } = render(<BookCover title="cien años" imageUrl={null} />);
    expect(screen.getByLabelText('Sin portada: cien años')).toHaveTextContent('CA');

    rerender(<BookCover title="Rayuela" imageUrl="/uploads/x.png" size="lg" />);
    const img = screen.getByRole('img', { name: 'Portada de Rayuela' });
    fireEvent.error(img);
    expect(screen.getByLabelText('Sin portada: Rayuela')).toHaveTextContent('R');
  });
});

describe('BooksTable', () => {
  const renderTable = (canDelete: boolean, onDelete = vi.fn()) =>
    render(
      <MemoryRouter>
        <BooksTable
          books={[makeBook(), makeBook({ id: 'b2', title: 'Agotado', stock: 0, isAvailable: false })]}
          sort={[]}
          onSort={vi.fn()}
          canDelete={canDelete}
          onDelete={onDelete}
          deletingId="b2"
        />
      </MemoryRouter>,
    );

  it('lista libros con estado, precio y enlaces', () => {
    renderTable(false);
    expect(screen.getByRole('link', { name: 'Cien años de soledad' })).toHaveAttribute('href', '/books/b1');
    expect(screen.getByText('Disponible')).toBeInTheDocument();
    expect(screen.getByText('Sin stock')).toBeInTheDocument();
    expect(screen.getAllByText(/18\.990/)).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Eliminar' })).toBeNull();
  });

  it('permite eliminar solo si tiene permiso', async () => {
    const onDelete = vi.fn();
    renderTable(true, onDelete);
    const buttons = screen.getAllByRole('button', { name: 'Eliminar' });
    expect(buttons[1]).toBeDisabled();
    await userEvent.click(buttons[0]);
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'b1' }));
  });
});

describe('ImageUpload', () => {
  const png = (size = 10) => new File([new Uint8Array(size)], 'portada.png', { type: 'image/png' });

  it('valida tipo y tamaño', () => {
    expect(validateImage(png())).toBeNull();
    expect(validateImage(new File(['x'], 'a.gif', { type: 'image/gif' }))).toMatch(/Formato/);
    expect(validateImage(png(MAX_IMAGE_BYTES + 1))).toMatch(/2MB/);
  });

  it('muestra vista previa y permite quitar la imagen', async () => {
    const onChange = vi.fn();
    render(<ImageUpload currentUrl={null} onChange={onChange} />);
    expect(screen.getByText('Sin imagen')).toBeInTheDocument();

    await userEvent.upload(screen.getByLabelText('Archivo de portada'), png());
    expect(onChange).toHaveBeenLastCalledWith(expect.any(File));
    expect(screen.getByAltText('Vista previa de la portada')).toHaveAttribute('src', 'blob:preview');

    await userEvent.click(screen.getByRole('button', { name: 'Quitar' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByText('Sin imagen')).toBeInTheDocument();
  });

  it('rechaza archivos invalidos con mensaje', async () => {
    const onChange = vi.fn();
    render(<ImageUpload currentUrl="/uploads/actual.png" onChange={onChange} />);
    expect(screen.getByAltText('Vista previa de la portada')).toHaveAttribute('src', '/uploads/actual.png');

    // se usa fireEvent porque userEvent respeta el accept del input y no deja subir un gif
    fireEvent.change(screen.getByLabelText('Archivo de portada'), {
      target: { files: [new File(['x'], 'a.gif', { type: 'image/gif' })] },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Formato no permitido');
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('ignora una seleccion vacia', () => {
    const onChange = vi.fn();
    render(<ImageUpload onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Archivo de portada'), { target: { files: [] } });
    expect(onChange).not.toHaveBeenCalled();
  });
});
