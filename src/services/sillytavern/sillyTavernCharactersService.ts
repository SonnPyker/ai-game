import { sillyTavernRequest } from '../sillyTavernClient';

export interface STCharacterSummary {
  avatar?: string;
  name: string;
  description?: string;
  externalId?: string;
}

export interface STCharacterDetail extends STCharacterSummary {
  data?: any;
}

export const sillyTavernCharactersService = {
  async list(): Promise<STCharacterSummary[]> {
    return sillyTavernRequest<STCharacterSummary[]>('/api/characters/all');
  },

  async get(externalId: string): Promise<STCharacterDetail> {
    return sillyTavernRequest<STCharacterDetail>(`/api/characters/get?external_id=${encodeURIComponent(externalId)}`);
  },

  async create(payload: any): Promise<any> {
    // Payload should align with SillyTavern character create schema; caller prepares mapping.
    return sillyTavernRequest('/api/characters/create', {
      method: 'POST',
      body: JSON.stringify(payload),
      requireCsrf: true,
    });
  },

  async update(payload: any): Promise<any> {
    return sillyTavernRequest('/api/characters/edit', {
      method: 'POST',
      body: JSON.stringify(payload),
      requireCsrf: true,
    });
  },

  async delete(externalId: string): Promise<any> {
    return sillyTavernRequest('/api/characters/delete', {
      method: 'POST',
      body: JSON.stringify({ external_id: externalId }),
      requireCsrf: true,
    });
  },

  async duplicate(externalId: string): Promise<any> {
    return sillyTavernRequest('/api/characters/duplicate', {
      method: 'POST',
      body: JSON.stringify({ external_id: externalId }),
      requireCsrf: true,
    });
  },

  async export(externalId: string): Promise<any> {
    return sillyTavernRequest(`/api/characters/export?external_id=${encodeURIComponent(externalId)}`);
  },
};
