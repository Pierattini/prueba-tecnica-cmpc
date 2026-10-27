import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import { BookForm, type BookFormValues } from '../components/BookForm';
import { useCreateBook, useUploadBookImage } from '../hooks/useBooks';

export function BookCreatePage() {
  const navigate = useNavigate();
  const createBook = useCreateBook();
  const uploadImage = useUploadBookImage();

  const handleSubmit = async (values: BookFormValues, image: File | null) => {
    try {
      const book = await createBook.mutateAsync(values);
      let notice: string | undefined;
      if (image) {
        try {
          await uploadImage.mutateAsync({ id: book.id, file: image });
        } catch (err) {
          // el libro ya quedo creado; se avisa en vez de perder el alta
          notice = `El libro se creó, pero la imagen no se pudo subir: ${getErrorMessage(err)}`;
        }
      }
      navigate(`/books/${book.id}`, { replace: true, state: { notice } });
    } catch {
      // el error queda en createBook.error y se muestra en el formulario
    }
  };

  return (
    <section className="narrow">
      <h1>Nuevo libro</h1>
      <BookForm
        submitLabel="Crear libro"
        isSubmitting={createBook.isPending || uploadImage.isPending}
        serverError={createBook.isError ? getErrorMessage(createBook.error) : null}
        onSubmit={handleSubmit}
        onCancel={() => navigate(-1)}
      />
    </section>
  );
}
