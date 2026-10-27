import { useEffect, useId, useState } from 'react';

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export function validateImage(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return 'Formato no permitido. Usa JPG, PNG o WEBP';
  if (file.size > MAX_IMAGE_BYTES) return 'La imagen no puede superar los 2MB';
  return null;
}

interface Props {
  currentUrl?: string | null;
  onChange: (file: File | null) => void;
}

export function ImageUpload({ currentUrl, onChange }: Props) {
  const inputId = useId();
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // se libera la URL temporal para no acumular memoria
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const problem = validateImage(file);
    setError(problem);
    if (problem) {
      setPreview(null);
      onChange(null);
      return;
    }
    setPreview(URL.createObjectURL(file));
    onChange(file);
  };

  const clear = () => {
    setPreview(null);
    setError(null);
    onChange(null);
  };

  const shown = preview ?? currentUrl ?? null;

  return (
    <div className="upload">
      <span className="field__label">Portada</span>
      <div className="upload__body">
        <div className="upload__preview">
          {shown ? <img src={shown} alt="Vista previa de la portada" /> : <span>Sin imagen</span>}
        </div>
        <div className="upload__actions">
          <label htmlFor={inputId} className="btn btn--secondary">
            {shown ? 'Cambiar imagen' : 'Seleccionar imagen'}
          </label>
          <input
            id={inputId}
            className="sr-only"
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            aria-label="Archivo de portada"
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              // permite volver a elegir el mismo archivo despues de quitarlo
              e.target.value = '';
            }}
          />
          {preview && (
            <button type="button" className="btn btn--ghost" onClick={clear}>
              Quitar
            </button>
          )}
          <p className="field__hint">JPG, PNG o WEBP. Máximo 2MB.</p>
          {error && (
            <p className="field__error" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
