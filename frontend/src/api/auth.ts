import { api } from './client';
import type { ApiEnvelope, AuthResponse, User } from './types';

export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post<ApiEnvelope<AuthResponse>>('/auth/login', { email, password });
    return data.data;
  },

  async me(): Promise<User> {
    const { data } = await api.get<ApiEnvelope<User>>('/auth/me');
    return data.data;
  },
};
