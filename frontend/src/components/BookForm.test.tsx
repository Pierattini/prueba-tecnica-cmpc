import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { catalogApi } from '../api/catalog';
import { renderWithProviders } from '../test/utils';
import { BookForm, bookSchema } from './BookForm';

const valid = { title: 'Rayuela', author: 'Julio Cortázar', publisher: 'Alfaguara', genre: 'Novela', price: 16490, stock: 3 };

describe('bookSchema', () => {
  it('acepta datos validos y recorta espacios', () => {
    expect(bookSchema.parse({ ...valid, title: '  Rayuela  ' }).title).toBe('Rayuela');
  });

  it.each([
    [{ title: '' }, 'El título es obligatorio'],
    [{ author: 'A' }, 'al menos 2'],
    [{ price: -1 }, 'negativo'],
    [{ price: 10.123 }, 'Máximo 2 decimales'],
    [{ price: Number.NaN }, 'precio válido'],
    [{ stock: 1.5 }, 'entero'],
    [{ stock: -1 }, 'negativo'],
  ])('rechaza %o', (override, message) => {
    const result = bookSchema.safeParse({ ...valid, ...override });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain(message);
  });
});

describe('BookForm', () => {
  beforeEach(() => {
    vi.spyOn(catalogApi, 'list').mockImplementation(async (kind) =>
      kind === 'authors' ? [{ id: 'a1', name: 'Julio Cortázar' }] : [],
    );
  });

  it('valida en vivo y envia los valores con la imagen', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <BookForm submitLabel="Crear libro" isSubmitting={false} onSubmit={onSubmit} onCancel={vi.fn()} />,
    );
    const user = userEvent.setup();
    const submit = screen.getByRole('button', { name: 'Crear libro' });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText('Título'), 'R');
    await user.clear(screen.getByLabelText('Título'));
    expect(await screen.findByText('El título es obligatorio')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Título'), valid.title);
    await user.type(screen.getByLabelText('Autor'), valid.author);
    await user.type(screen.getByLabelText('Editorial'), valid.publisher);
    await user.type(screen.getByLabelText('Género'), valid.genre);
    await user.type(screen.getByLabelText('Precio (CLP)'), '16490');
    await user.type(screen.getByLabelText('Stock'), '0');
    expect(screen.getByText('Quedará como sin stock')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Stock'));
    await user.type(screen.getByLabelText('Stock'), '3');
    expect(screen.getByText('Quedará como disponible')).toBeInTheDocument();

    const file = new File(['x'], 'p.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Archivo de portada'), file);
    await user.click(submit);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(valid, file));
    expect(document.querySelector('#authors-list option')).toHaveAttribute('value', 'Julio Cortázar');
  });

  it('no envia con errores y muestra el error del servidor', async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    renderWithProviders(
      <BookForm
        defaultValues={valid}
        submitLabel="Guardar"
        isSubmitting={false}
        serverError="Ya existe un registro con esos datos"
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    );
    const user = userEvent.setup();
    expect(screen.getByRole('alert')).toHaveTextContent('Ya existe');

    await user.clear(screen.getByLabelText('Precio (CLP)'));
    await user.type(screen.getByLabelText('Precio (CLP)'), '-5');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('El precio no puede ser negativo')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('muestra el estado de guardado', () => {
    renderWithProviders(
      <BookForm defaultValues={valid} submitLabel="Guardar" isSubmitting onSubmit={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Guardando…' })).toBeDisabled();
  });
});
