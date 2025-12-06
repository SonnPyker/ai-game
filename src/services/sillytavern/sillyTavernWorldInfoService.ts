import { sillyTavernRequest } from '../sillyTavernClient';

export interface STWorldInfoEntry {
  id?: string;
  key?: string;
  content?: string;
  comment?: string;
  folder?: string;
  tags?: string[];
}

export const sillyTavernWorldInfoService = {
  async list(): Promise<STWorldInfoEntry[]> {
    return sillyTavernRequest<STWorldInfoEntry[]>('/api/worldinfo/get');
  },

  async save(entries: STWorldInfoEntry[]): Promise<any> {
    return sillyTavernRequest('/api/worldinfo/edit', {
      method: 'POST',
      body: JSON.stringify({ entries }),
      requireCsrf: true,
    });
  },

  async delete(id: string): Promise<any> {
    return sillyTavernRequest('/api/worldinfo/delete', {
      method: 'POST',
      body: JSON.stringify({ id }),
      requireCsrf: true,
    });
  },

  async importFromUrl(url: string): Promise<any> {
    return sillyTavernRequest('/api/worldinfo/import', {
      method: 'POST',
      body: JSON.stringify({ url }),
      requireCsrf: true,
    });
  },
};
