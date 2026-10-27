import { useNavigate, useParams } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import { BookForm, type BookFormValues } from '../components/BookForm';
import { ErrorState, LoadingState } from '../components/StateViews';
import { useBookQuery, useUpdateBook, useUploadBookImage } from '../hooks/useBooks';

export function BookEditPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: book, isPending, isError, error, refetch } = useBookQuery(id);
  const updateBook = useUpdateBook(id);
  const uploadImage = useUploadBookImage();

  if (isPending) return <LoadingState label="Cargando libro…" />;
  if (isError) return <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />;

  const handleSubmit = async (values: BookFormValues, image: File | null) => {
    try {
      await updateBook.mutateAsync(values);
      if (image) await uploadImage.mutateAsync({ id, file: image });
      navigate(`/books/${id}`, { replace: true });
    } catch {
      // los errores se muestran desde el estado de cada mutacion
    }
  };

  const mutationError = updateBook.error ?? uploadImage.error;

  return (
    <section className="narrow">
      <h1>Editar libro</h1>
      <BookForm
        defaultValues={{
          title: book.title,
          author: book.author.name,
          publisher: book.publisher.name,
          genre: book.genre.name,
          price: book.price,
          stock: book.stock,
        }}
        currentImageUrl={book.imageUrl}
        submitLabel="Guardar cambios"
        isSubmitting={updateBook.isPending || uploadImage.isPending}
        serverError={mutationError ? getErrorMessage(mutationError) : null}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/books/${id}`)}
      />
    </section>
  );
}
