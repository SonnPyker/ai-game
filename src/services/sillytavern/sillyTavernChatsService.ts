import { sillyTavernRequest } from '../sillyTavernClient';

export interface STChatSummary {
  id?: string;
  title?: string;
  characterId?: string;
  updatedAt?: string;
}

export interface STChatDetail extends STChatSummary {
  messages?: any[];
  metadata?: any;
}

export const sillyTavernChatsService = {
  async list(): Promise<STChatSummary[]> {
    return sillyTavernRequest<STChatSummary[]>('/api/chats/all');
  },

  async get(id: string): Promise<STChatDetail> {
    return sillyTavernRequest<STChatDetail>(`/api/chats/get?id=${encodeURIComponent(id)}`);
  },

  async save(payload: any): Promise<any> {
    return sillyTavernRequest('/api/chats/save', {
      method: 'POST',
      body: JSON.stringify(payload),
      requireCsrf: true,
    });
  },

  async delete(id: string): Promise<any> {
    return sillyTavernRequest('/api/chats/delete', {
      method: 'POST',
      body: JSON.stringify({ id }),
      requireCsrf: true,
    });
  },
};
