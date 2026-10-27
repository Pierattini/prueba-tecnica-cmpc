import { QueryClient } from '@tanstack/react-query';
import axios from 'axios';

// reintentar un 4xx no sirve: la respuesta va a ser la misma
export function shouldRetry(failureCount: number, error: unknown): boolean {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  if (status && status >= 400 && status < 500) return false;
  return failureCount < 2;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry, refetchOnWindowFocus: false, staleTime: 30_000 },
      mutations: { retry: false },
    },
  });
}
