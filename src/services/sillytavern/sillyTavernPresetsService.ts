import { sillyTavernRequest } from '../sillyTavernClient';

export interface STPresetSummary {
  id?: string;
  name: string;
  description?: string;
  group?: string;
  isDefault?: boolean;
  settings?: any;
}

export const sillyTavernPresetsService = {
  async list(): Promise<STPresetSummary[]> {
    return sillyTavernRequest<STPresetSummary[]>('/api/presets');
  },

  async get(id: string): Promise<STPresetSummary> {
    return sillyTavernRequest<STPresetSummary>(`/api/presets/${encodeURIComponent(id)}`);
  },
};
