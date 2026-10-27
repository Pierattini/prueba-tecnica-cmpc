import type { SortItem } from '../utils/sort';

interface Props {
  field: string;
  label: string;
  sort: SortItem[];
  onSort: (field: string) => void;
  className?: string;
}

export function SortableHeader({ field, label, sort, onSort, className }: Props) {
  const index = sort.findIndex((s) => s.field === field);
  const active = index >= 0 ? sort[index] : undefined;
  const ariaSort = active ? (active.direction === 'asc' ? 'ascending' : 'descending') : 'none';

  return (
    <th scope="col" aria-sort={ariaSort} className={className}>
      <button
        type="button"
        className={`sort-btn${active ? ' sort-btn--active' : ''}`}
        onClick={() => onSort(field)}
        title="Clic para ordenar; varios clics en distintas columnas combinan el orden"
      >
        {label}
        <span className="sort-btn__icon" aria-hidden="true">
          {active ? (active.direction === 'asc' ? '▲' : '▼') : '↕'}
        </span>
        {/* la prioridad solo aporta cuando hay mas de una columna ordenada */}
        {active && sort.length > 1 && (
          <span className="sort-btn__priority" aria-label={`prioridad ${index + 1}`}>
            {index + 1}
          </span>
        )}
      </button>
    </th>
  );
}
