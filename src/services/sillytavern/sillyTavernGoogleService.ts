import { sillyTavernRequest } from '../sillyTavernClient';

export interface STMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface STChatCompletionRequest {
  model: string;
  messages: STMessage[];
  stream?: boolean;
  api?: 'google' | 'vertexai';
  vertexai_region?: string;
  vertexai_auth_mode?: string;
  vertexai_express_project_id?: string;
  generationConfig?: Record<string, any>;
  safetySettings?: Record<string, any>;
}

export const sillyTavernGoogleService = {
  async chat(request: STChatCompletionRequest): Promise<any> {
    // SillyTavern routes Google text generation through chat-completions backend.
    return sillyTavernRequest('/api/backends/chat-completions', {
      method: 'POST',
      body: JSON.stringify(request),
      requireCsrf: true,
    });
  },
};
