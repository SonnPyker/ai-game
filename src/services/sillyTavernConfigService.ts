const ENABLED_KEY = 'st_backend_enabled';
const BASE_URL_KEY = 'st_base_url';
const DEFAULT_BASE_URL = '/stapi';

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return DEFAULT_BASE_URL;
  // remove trailing slash to avoid double slashes when joining
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

export const sillyTavernConfigService = {
  getBaseUrl(): string {
    const stored = localStorage.getItem(BASE_URL_KEY);
    return normalizeUrl(stored || DEFAULT_BASE_URL);
  },
  setBaseUrl(url: string): void {
    localStorage.setItem(BASE_URL_KEY, normalizeUrl(url));
  },
  isEnabled(): boolean {
    return localStorage.getItem(ENABLED_KEY) === 'true';
  },
  setEnabled(enabled: boolean): void {
    localStorage.setItem(ENABLED_KEY, String(enabled));
  },
  getConfig(): { enabled: boolean; baseUrl: string } {
    return {
      enabled: this.isEnabled(),
      baseUrl: this.getBaseUrl(),
    };
  },
};
