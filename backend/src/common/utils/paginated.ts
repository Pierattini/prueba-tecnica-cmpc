export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// el interceptor de respuesta reconoce esta clase y separa data de meta
export class Paginated<T> {
  constructor(
    readonly items: T[],
    readonly meta: PaginationMeta,
  ) {}

  static of<T>(items: T[], total: number, page: number, limit: number): Paginated<T> {
    return new Paginated(items, {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  }
}
