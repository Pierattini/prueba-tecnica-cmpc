import { useEffect, useState } from 'react';
import type { BookFilters as Filters, CatalogItem } from '../api/types';
import { useDebounce } from '../hooks/useDebounce';

export const SEARCH_DEBOUNCE_MS = 400;

interface Props {
  filters: Filters;
  authors: CatalogItem[];
  publishers: CatalogItem[];
  genres: CatalogItem[];
  onChange: (key: keyof Filters, value: string) => void;
  onClear: () => void;
}

export function BookFilters({ filters, authors, publishers, genres, onChange, onClear }: Props) {
  const [term, setTerm] = useState(filters.search);
  const debouncedTerm = useDebounce(term, SEARCH_DEBOUNCE_MS);

  // si la URL cambia desde afuera (limpiar, boton atras) el input se sincroniza
  useEffect(() => setTerm(filters.search), [filters.search]);

  // solo depende del termino con debounce; si dependiera de filters.search se pisaria lo que se esta escribiendo
  useEffect(() => {
    if (debouncedTerm !== filters.search) onChange('search', debouncedTerm);
  }, [debouncedTerm]);

  const hasFilters = Boolean(
    filters.search || filters.genreId || filters.publisherId || filters.authorId || filters.available,
  );

  return (
    <section className="filters" aria-label="Filtros">
      <label className="field filters__search">
        <span className="field__label">Buscar</span>
        <input
          type="search"
          placeholder="Título o autor…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
      </label>

      <CatalogSelect label="Género" value={filters.genreId} items={genres} onChange={(v) => onChange('genreId', v)} />
      <CatalogSelect
        label="Editorial"
        value={filters.publisherId}
        items={publishers}
        onChange={(v) => onChange('publisherId', v)}
      />
      <CatalogSelect label="Autor" value={filters.authorId} items={authors} onChange={(v) => onChange('authorId', v)} />

      <label className="field">
        <span className="field__label">Disponibilidad</span>
        <select value={filters.available} onChange={(e) => onChange('available', e.target.value)}>
          <option value="">Todas</option>
          <option value="true">Disponibles</option>
          <option value="false">Sin stock</option>
        </select>
      </label>

      <button type="button" className="btn btn--ghost filters__clear" onClick={onClear} disabled={!hasFilters}>
        Limpiar filtros
      </button>
    </section>
  );
}

function CatalogSelect(props: {
  label: string;
  value: string;
  items: CatalogItem[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span className="field__label">{props.label}</span>
      <select value={props.value} onChange={(e) => props.onChange(e.target.value)}>
        <option value="">Todos</option>
        {props.items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
    </label>
  );
}
