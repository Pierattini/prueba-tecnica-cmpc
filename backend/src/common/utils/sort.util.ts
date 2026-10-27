import { BadRequestException } from '@nestjs/common';

export type SortDirection = 'asc' | 'desc';

export interface SortItem<F extends string = string> {
  field: F;
  direction: SortDirection;
}

// formato esperado: "price:desc,title:asc"; si no viene direccion se asume asc
export function parseSort<F extends string>(
  raw: string | undefined,
  allowed: readonly F[],
  fallback: SortItem<F>[],
): SortItem<F>[] {
  if (!raw || raw.trim() === '') return fallback;

  const seen = new Set<string>();
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [field, dir = 'asc'] = part.split(':').map((s) => s.trim());
      const direction = dir.toLowerCase();

      if (!allowed.includes(field as F)) {
        throw new BadRequestException(
          `Campo de orden no permitido: "${field}". Permitidos: ${allowed.join(', ')}`,
        );
      }
      if (direction !== 'asc' && direction !== 'desc') {
        throw new BadRequestException(`Dirección de orden inválida: "${dir}" (usa asc o desc)`);
      }
      if (seen.has(field)) {
        throw new BadRequestException(`El campo "${field}" está repetido en el orden`);
      }
      seen.add(field);
      return { field: field as F, direction: direction as SortDirection };
    });
}
