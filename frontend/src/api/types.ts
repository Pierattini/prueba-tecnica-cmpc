export type Role = 'ADMIN' | 'USER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: User;
}

export interface CatalogItem {
  id: string;
  name: string;
}

export interface Book {
  id: string;
  title: string;
  author: CatalogItem;
  publisher: CatalogItem;
  genre: CatalogItem;
  price: number;
  stock: number;
  isAvailable: boolean;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface BookInput {
  title: string;
  author: string;
  publisher: string;
  genre: string;
  price: number;
  stock: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiEnvelope<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorBody {
  success: false;
  statusCode: number;
  error: string;
  message: string;
  details?: string[];
}

export type AvailabilityFilter = '' | 'true' | 'false';

export interface BookFilters {
  search: string;
  genreId: string;
  publisherId: string;
  authorId: string;
  available: AvailabilityFilter;
  sort: string;
}

export interface BookQuery extends BookFilters {
  page: number;
  limit: number;
}
