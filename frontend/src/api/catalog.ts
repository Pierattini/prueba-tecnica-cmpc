import { api } from './client';
import type { ApiEnvelope, CatalogItem } from './types';

export type CatalogKind = 'authors' | 'publishers' | 'genres';

export const catalogApi = {
  async list(kind: CatalogKind): Promise<CatalogItem[]> {
    const { data } = await api.get<ApiEnvelope<CatalogItem[]>>(`/${kind}`);
    return data.data;
  },
};
