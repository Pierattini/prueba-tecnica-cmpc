import { zodResolver } from '@hookform/resolvers/zod';
import { cloneElement, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { BookInput } from '../api/types';
import { useCatalog } from '../hooks/useCatalog';
import { ImageUpload } from './ImageUpload';

const name = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(2, `${label} debe tener al menos 2 caracteres`)
    .max(max, `${label} admite hasta ${max} caracteres`);

export const bookSchema = z.object({
  title: z.string().trim().min(1, 'El título es obligatorio').max(255, 'Máximo 255 caracteres'),
  author: name('El autor', 150),
  publisher: name('La editorial', 150),
  genre: name('El género', 80),
  price: z
    .number({ invalid_type_error: 'Ingresa un precio válido' })
    .min(0, 'El precio no puede ser negativo')
    .max(99_999_999.99, 'El precio es demasiado alto')
    // se valida como texto para evitar los errores de punto flotante
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(String(v)), 'Máximo 2 decimales'),
  stock: z
    .number({ invalid_type_error: 'Ingresa un stock válido' })
    .int('El stock debe ser un número entero')
    .min(0, 'El stock no puede ser negativo')
    .max(1_000_000, 'El stock es demasiado alto'),
});

export type BookFormValues = z.infer<typeof bookSchema>;

interface Props {
  defaultValues?: BookInput;
  currentImageUrl?: string | null;
  submitLabel: string;
  isSubmitting: boolean;
  serverError?: string | null;
  onSubmit: (values: BookFormValues, image: File | null) => void;
  onCancel: () => void;
}

const EMPTY: Partial<BookFormValues> = { title: '', author: '', publisher: '', genre: '' };

export function BookForm({
  defaultValues,
  currentImageUrl,
  submitLabel,
  isSubmitting,
  serverError,
  onSubmit,
  onCancel,
}: Props) {
  const { authors, publishers, genres } = useCatalog();
  const [image, setImage] = useState<File | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = useForm<BookFormValues>({
    resolver: zodResolver(bookSchema),
    mode: 'onChange',
    defaultValues: defaultValues ?? EMPTY,
  });

  const stock = watch('stock');
  const hasChanges = isDirty || image !== null;

  return (
    <form className="form" noValidate onSubmit={handleSubmit((values) => onSubmit(values, image))}>
      {serverError && (
        <div className="alert alert--error" role="alert">
          {serverError}
        </div>
      )}

      <div className="form__grid">
        <Field label="Título" error={errors.title?.message} className="form__full">
          <input {...register('title')} autoFocus aria-invalid={Boolean(errors.title)} />
        </Field>

        <Field label="Autor" error={errors.author?.message} hint="Elige uno existente o escribe uno nuevo">
          <input {...register('author')} list="authors-list" aria-invalid={Boolean(errors.author)} />
        </Field>

        <Field label="Editorial" error={errors.publisher?.message}>
          <input {...register('publisher')} list="publishers-list" aria-invalid={Boolean(errors.publisher)} />
        </Field>

        <Field label="Género" error={errors.genre?.message}>
          <input {...register('genre')} list="genres-list" aria-invalid={Boolean(errors.genre)} />
        </Field>

        <Field label="Precio (CLP)" error={errors.price?.message}>
          <input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            {...register('price', { valueAsNumber: true })}
            aria-invalid={Boolean(errors.price)}
          />
        </Field>

        <Field
          label="Stock"
          error={errors.stock?.message}
          hint={
            Number.isFinite(stock)
              ? stock > 0
                ? 'Quedará como disponible'
                : 'Quedará como sin stock'
              : undefined
          }
        >
          <input
            type="number"
            step="1"
            min="0"
            inputMode="numeric"
            {...register('stock', { valueAsNumber: true })}
            aria-invalid={Boolean(errors.stock)}
          />
        </Field>

        <div className="form__full">
          <ImageUpload currentUrl={currentImageUrl} onChange={setImage} />
        </div>
      </div>

      <Datalist id="authors-list" items={authors} />
      <Datalist id="publishers-list" items={publishers} />
      <Datalist id="genres-list" items={genres} />

      <div className="form__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn btn--primary" disabled={isSubmitting || !hasChanges}>
          {isSubmitting ? 'Guardando…' : submitLabel}
        </button>
      </div>
    </form>
  );
}

// el error y la pista quedan fuera del label para no ensuciar el nombre accesible del input
function Field(props: {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactElement<{ 'aria-describedby'?: string }>;
}) {
  const id = useId();
  const message = props.error ?? props.hint;
  return (
    <div className={`field ${props.className ?? ''}`}>
      <label className="field__control">
        <span className="field__label">{props.label}</span>
        {message ? cloneElement(props.children, { 'aria-describedby': id }) : props.children}
      </label>
      {props.error ? (
        <span id={id} className="field__error" role="alert">
          {props.error}
        </span>
      ) : (
        props.hint && (
          <span id={id} className="field__hint">
            {props.hint}
          </span>
        )
      )}
    </div>
  );
}

function Datalist({ id, items }: { id: string; items: { id: string; name: string }[] }) {
  return (
    <datalist id={id}>
      {items.map((item) => (
        <option key={item.id} value={item.name} />
      ))}
    </datalist>
  );
}
