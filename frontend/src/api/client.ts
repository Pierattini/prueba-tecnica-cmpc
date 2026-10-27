import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { tokenStorage } from '../auth/tokenStorage';
import type { ApiErrorBody } from './types';

export const api = axios.create({ baseURL: '/api', timeout: 20_000 });

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

export function attachToken(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const token = tokenStorage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}

export function handleResponseError(error: AxiosError): Promise<never> {
  // el 401 del login significa credenciales malas, no sesion vencida
  const isLogin = error.config?.url?.includes('/auth/login');
  if (error.response?.status === 401 && !isLogin) {
    tokenStorage.clear();
    unauthorizedHandler?.();
  }
  return Promise.reject(error);
}

api.interceptors.request.use(attachToken);
api.interceptors.response.use((response) => response, handleResponseError);

export function getErrorMessage(error: unknown, fallback = 'Ocurrió un error inesperado'): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'No se pudo conectar con el servidor';
    const body = error.response.data as Partial<ApiErrorBody> | undefined;
    if (body?.details?.length) return body.details.join('. ');
    if (body?.message) return body.message;
    return fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

// quita los parametros vacios para no mandar ?genreId= al backend
export function cleanParams<T extends object>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null),
  ) as Partial<T>;
}
