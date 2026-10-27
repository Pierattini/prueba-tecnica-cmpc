import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { booksApi } from '../api/books';
import type { BookInput, BookQuery } from '../api/types';

export const bookKeys = {
  all: ['books'] as const,
  list: (query: BookQuery) => ['books', 'list', query] as const,
  deleted: (query: BookQuery) => ['books', 'deleted', query] as const,
  detail: (id: string) => ['books', 'detail', id] as const,
};

export function useBooksQuery(query: BookQuery) {
  return useQuery({
    queryKey: bookKeys.list(query),
    queryFn: () => booksApi.list(query),
    // mantiene la pagina anterior visible mientras llega la siguiente
    placeholderData: keepPreviousData,
  });
}

export function useDeletedBooksQuery(query: BookQuery) {
  return useQuery({
    queryKey: bookKeys.deleted(query),
    queryFn: () => booksApi.listDeleted(query),
    placeholderData: keepPreviousData,
  });
}

export function useBookQuery(id: string | undefined) {
  return useQuery({
    queryKey: bookKeys.detail(id ?? ''),
    queryFn: () => booksApi.get(id!),
    enabled: Boolean(id),
  });
}

function useInvalidateBooks() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: bookKeys.all });
}

export function useCreateBook() {
  const invalidate = useInvalidateBooks();
  return useMutation({ mutationFn: (input: BookInput) => booksApi.create(input), onSuccess: invalidate });
}

export function useUpdateBook(id: string) {
  const invalidate = useInvalidateBooks();
  return useMutation({
    mutationFn: (input: Partial<BookInput>) => booksApi.update(id, input),
    onSuccess: invalidate,
  });
}

export function useUploadBookImage() {
  const invalidate = useInvalidateBooks();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => booksApi.uploadImage(id, file),
    onSuccess: invalidate,
  });
}

export function useDeleteBook() {
  const invalidate = useInvalidateBooks();
  return useMutation({ mutationFn: (id: string) => booksApi.remove(id), onSuccess: invalidate });
}

export function useRestoreBook() {
  const invalidate = useInvalidateBooks();
  return useMutation({ mutationFn: (id: string) => booksApi.restore(id), onSuccess: invalidate });
}
