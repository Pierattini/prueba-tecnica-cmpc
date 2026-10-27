import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { tokenStorage } from '../auth/tokenStorage';
import { adminUser, makeBook } from '../test/utils';
import { authApi } from './auth';
import { booksApi } from './books';
import { catalogApi } from './catalog';
import {
  api,
  attachToken,
  cleanParams,
  getErrorMessage,
  handleResponseError,
  setUnauthorizedHandler,
} from './client';

const config = (url = '/books') => ({ url, headers: new AxiosHeaders() }) as InternalAxiosRequestConfig;

function axiosError(status?: number, data?: unknown, url = '/books') {
  const response = status
    ? { status, data, statusText: '', headers: {}, config: config(url) }
    : undefined;
  return new AxiosError('fail', 'ERR', config(url), undefined, response as never);
}

describe('cliente axios', () => {
  it('agrega el token si hay sesion', () => {
    expect(attachToken(config()).headers.Authorization).toBeUndefined();
    tokenStorage.save('abc', adminUser, 60);
    expect(attachToken(config()).headers.Authorization).toBe('Bearer abc');
  });

  it('cierra sesion ante un 401 fuera del login', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    tokenStorage.save('abc', adminUser, 60);

    await expect(handleResponseError(axiosError(401))).rejects.toBeInstanceOf(AxiosError);
    expect(handler).toHaveBeenCalled();
    expect(tokenStorage.getToken()).toBeNull();
    setUnauthorizedHandler(null);
  });

  it('no cierra sesion por el 401 del login ni por otros errores', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    await expect(handleResponseError(axiosError(401, {}, '/auth/login'))).rejects.toBeDefined();
    await expect(handleResponseError(axiosError(500))).rejects.toBeDefined();
    expect(handler).not.toHaveBeenCalled();
    setUnauthorizedHandler(null);
  });

  it('extrae mensajes legibles de los errores', () => {
    expect(getErrorMessage(axiosError(400, { message: 'x', details: ['a', 'b'] }))).toBe('a. b');
    expect(getErrorMessage(axiosError(404, { message: 'No existe' }))).toBe('No existe');
    expect(getErrorMessage(axiosError(500, {}), 'fallback')).toBe('fallback');
    expect(getErrorMessage(axiosError())).toBe('No se pudo conectar con el servidor');
    expect(getErrorMessage(new Error('local'))).toBe('local');
    expect(getErrorMessage('raro')).toBe('Ocurrió un error inesperado');
  });

  it('limpia parametros vacios', () => {
    expect(cleanParams({ a: '', b: 'x', c: undefined, d: 0, e: null })).toEqual({ b: 'x', d: 0 });
  });
});

describe('servicios de API', () => {
  const book = makeBook();
  const query = {
    page: 1,
    limit: 10,
    search: '',
    genreId: 'g1',
    publisherId: '',
    authorId: '',
    available: '' as const,
    sort: 'title:asc',
  };

  it('booksApi desenvuelve las respuestas y envia solo filtros con valor', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: { data: [book], meta: { total: 1 } } });
    await expect(booksApi.list(query)).resolves.toEqual({ data: [book], meta: { total: 1 } });
    expect(get).toHaveBeenCalledWith('/books', { params: { page: 1, limit: 10, genreId: 'g1', sort: 'title:asc' } });

    await booksApi.listDeleted(query);
    expect(get).toHaveBeenLastCalledWith('/books/deleted', expect.anything());

    get.mockResolvedValue({ data: { data: book } });
    await expect(booksApi.get('b1')).resolves.toBe(book);
  });

  it('booksApi cubre las escrituras', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { data: book } });
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({ data: { data: book } });
    const del = vi.spyOn(api, 'delete').mockResolvedValue({});
    const input = { title: 't', author: 'a', publisher: 'p', genre: 'g', price: 1, stock: 1 };

    await booksApi.create(input);
    expect(post).toHaveBeenCalledWith('/books', input);
    await booksApi.update('b1', { stock: 2 });
    expect(patch).toHaveBeenCalledWith('/books/b1', { stock: 2 });
    await booksApi.restore('b1');
    expect(patch).toHaveBeenLastCalledWith('/books/b1/restore');
    await booksApi.remove('b1');
    expect(del).toHaveBeenCalledWith('/books/b1');

    const file = new File(['x'], 'a.png', { type: 'image/png' });
    await booksApi.uploadImage('b1', file);
    const form = post.mock.calls.at(-1)?.[1] as FormData;
    expect(form.get('image')).toBe(file);
  });

  it('exportCsv pide un blob y lee el nombre del archivo', async () => {
    const blob = new Blob(['csv']);
    const get = vi.spyOn(api, 'get').mockResolvedValue({
      data: blob,
      headers: { 'content-disposition': 'attachment; filename="libros-2024-01-01.csv"' },
    });
    const { page: _page, limit: _limit, ...filters } = query;
    await expect(booksApi.exportCsv(filters)).resolves.toEqual({ blob, filename: 'libros-2024-01-01.csv' });
    expect(get).toHaveBeenCalledWith('/books/export', {
      params: { genreId: 'g1', sort: 'title:asc' },
      responseType: 'blob',
    });
  });

  it('authApi y catalogApi', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { data: { accessToken: 't' } } });
    await expect(authApi.login('a@b.cl', 'x')).resolves.toEqual({ accessToken: 't' });
    expect(post).toHaveBeenCalledWith('/auth/login', { email: 'a@b.cl', password: 'x' });

    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: { data: [{ id: '1', name: 'Novela' }] } });
    await expect(authApi.me()).resolves.toEqual([{ id: '1', name: 'Novela' }]);
    await catalogApi.list('genres');
    expect(get).toHaveBeenLastCalledWith('/genres');
  });
});
