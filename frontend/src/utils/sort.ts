export type SortDirection = 'asc' | 'desc';

export interface SortItem {
  field: string;
  direction: SortDirection;
}

export function parseSort(raw: string | null | undefined): SortItem[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [field, dir] = part.split(':');
      return { field, direction: dir === 'desc' ? 'desc' : 'asc' };
    });
}

export function serializeSort(items: SortItem[]): string {
  return items.map((s) => `${s.field}:${s.direction}`).join(',');
}

// ciclo por columna: sin orden -> asc -> desc -> sin orden; la prioridad es el orden de los clics
export function toggleSort(items: SortItem[], field: string): SortItem[] {
  const current = items.find((s) => s.field === field);
  if (!current) return [...items, { field, direction: 'asc' }];
  if (current.direction === 'asc') {
    return items.map((s) => (s.field === field ? { ...s, direction: 'desc' } : s));
  }
  return items.filter((s) => s.field !== field);
}
