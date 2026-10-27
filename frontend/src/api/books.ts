import { api, cleanParams } from './client';
import type { ApiEnvelope, Book, BookFilters, BookInput, BookQuery, Paginated } from './types';
import { filenameFromDisposition } from '../utils/download';

async function fetchPage(url: string, query: BookQuery): Promise<Paginated<Book>> {
  const { data } = await api.get<ApiEnvelope<Book[]>>(url, { params: cleanParams(query) });
  return { data: data.data, meta: data.meta! };
}

export const booksApi = {
  list: (query: BookQuery) => fetchPage('/books', query),

  listDeleted: (query: BookQuery) => fetchPage('/books/deleted', query),

  async get(id: string): Promise<Book> {
    const { data } = await api.get<ApiEnvelope<Book>>(`/books/${id}`);
    return data.data;
  },

  async create(input: BookInput): Promise<Book> {
    const { data } = await api.post<ApiEnvelope<Book>>('/books', input);
    return data.data;
  },

  async update(id: string, input: Partial<BookInput>): Promise<Book> {
    const { data } = await api.patch<ApiEnvelope<Book>>(`/books/${id}`, input);
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/books/${id}`);
  },

  async restore(id: string): Promise<Book> {
    const { data } = await api.patch<ApiEnvelope<Book>>(`/books/${id}/restore`);
    return data.data;
  },

  async uploadImage(id: string, file: File): Promise<Book> {
    const form = new FormData();
    form.append('image', file);
    const { data } = await api.post<ApiEnvelope<Book>>(`/books/${id}/image`, form);
    return data.data;
  },

  async exportCsv(filters: BookFilters): Promise<{ blob: Blob; filename: string }> {
    // se pide como blob porque el endpoint requiere el header Authorization
    const response = await api.get<Blob>('/books/export', {
      params: cleanParams(filters),
      responseType: 'blob',
    });
    const disposition = response.headers['content-disposition'] as string | undefined;
    return { blob: response.data, filename: filenameFromDisposition(disposition, 'libros.csv') };
  },
};
