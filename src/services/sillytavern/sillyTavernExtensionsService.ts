import { sillyTavernRequest } from '../sillyTavernClient';

export interface STExtensionInfo {
  name: string;
  path?: string;
  remoteUrl?: string;
  isUpToDate?: boolean;
  branch?: string;
  global?: boolean;
}

export const sillyTavernExtensionsService = {
  async discover(): Promise<STExtensionInfo[]> {
    return sillyTavernRequest<STExtensionInfo[]>('/api/extensions/discover');
  },

  async install(url: string, opts?: { global?: boolean; branch?: string }): Promise<any> {
    return sillyTavernRequest('/api/extensions/install', {
      method: 'POST',
      body: JSON.stringify({ url, ...opts }),
      requireCsrf: true,
    });
  },

  async update(extensionName: string, opts?: { global?: boolean }): Promise<any> {
    return sillyTavernRequest('/api/extensions/update', {
      method: 'POST',
      body: JSON.stringify({ extensionName, ...opts }),
      requireCsrf: true,
    });
  },

  async version(extensionName: string, opts?: { global?: boolean }): Promise<any> {
    return sillyTavernRequest('/api/extensions/version', {
      method: 'POST',
      body: JSON.stringify({ extensionName, ...opts }),
      requireCsrf: true,
    });
  },
};
