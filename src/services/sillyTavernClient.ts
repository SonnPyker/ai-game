import { sillyTavernConfigService } from './sillyTavernConfigService';

export type SillyTavernHealthStatus =
  | { status: 'disabled'; reason: 'toggle-off' }
  | { status: 'ok' }
  | { status: 'unauthorized'; error: string }
  | { status: 'unreachable'; error: string };

let csrfToken: string | null = null;

function buildUrl(path: string, baseUrl: string) {
  if (!path.startsWith('/')) return `${baseUrl}/${path}`;
  return `${baseUrl}${path}`;
}

async function fetchCsrfToken(baseUrl: string) {
  const res = await fetch(buildUrl('/csrf-token', baseUrl), {
    method: 'GET',
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error(`CSRF token fetch failed (${res.status})`);
  }

  const data = await res.json();
  const token = data?.token;
  if (!token) {
    throw new Error('CSRF token missing in response');
  }
  csrfToken = token;
  return token;
}

async function ensureCsrf(baseUrl: string) {
  if (csrfToken) return csrfToken;
  return fetchCsrfToken(baseUrl);
}

export interface SillyTavernRequestOptions extends RequestInit {
  requireCsrf?: boolean;
  retryOnCsrfFailure?: boolean;
}

export async function sillyTavernRequest<T = any>(
  path: string,
  options: SillyTavernRequestOptions = {},
): Promise<T> {
  const config = sillyTavernConfigService.getConfig();
  if (!config.enabled) {
    throw new Error('SillyTavern backend is disabled');
  }

  const baseUrl = config.baseUrl;
  const method = (options.method || 'GET').toUpperCase();
  const requireCsrf = options.requireCsrf ?? method !== 'GET';
  const retryOnCsrfFailure = options.retryOnCsrfFailure ?? true;

  const headers = new Headers(options.headers || {});
  if (requireCsrf) {
    const token = await ensureCsrf(baseUrl);
    headers.set('X-CSRF-Token', token);
  }
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const doFetch = async () => {
    const res = await fetch(buildUrl(path, baseUrl), {
      ...options,
      method,
      headers,
      credentials: 'include',
    });

    if (res.status === 403 && retryOnCsrfFailure) {
      // CSRF may be stale; refresh once
      csrfToken = null;
      const newToken = await ensureCsrf(baseUrl);
      headers.set('X-CSRF-Token', newToken);
      const retryRes = await fetch(buildUrl(path, baseUrl), {
        ...options,
        method,
        headers,
        credentials: 'include',
      });
      return retryRes;
    }

    return res;
  };

  const response = await doFetch();

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`SillyTavern request failed (${response.status}): ${text || response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }
  // If not JSON, return raw text
  const raw = await response.text();
  return raw as unknown as T;
}

export async function sillyTavernHealthCheck(): Promise<SillyTavernHealthStatus> {
  const config = sillyTavernConfigService.getConfig();
  if (!config.enabled) return { status: 'disabled', reason: 'toggle-off' };
  const baseUrl = config.baseUrl;

  try {
    await ensureCsrf(baseUrl);
    await sillyTavernRequest('/api/ping', {
      method: 'POST',
      body: JSON.stringify({}),
      requireCsrf: true,
      retryOnCsrfFailure: true,
    });
    return { status: 'ok' };
  } catch (error: any) {
    const message = error?.message || 'Unknown error';
    if (message.toLowerCase().includes('401') || message.toLowerCase().includes('unauthorized')) {
      return { status: 'unauthorized', error: message };
    }
    return { status: 'unreachable', error: message };
  }
}

export function clearSillyTavernSessionCache() {
  csrfToken = null;
}
