type RequestInput = RequestInfo | URL;
type RequestInitWithRetry = RequestInit & {
  maxRetries?: number;
  timeoutMs?: number;
  onRateLimit?: (response: Response) => void;
};

const queue: Array<() => void> = [];
let active = 0;
const MAX_CONCURRENT = 3;
const CSRF_COOKIE_NAME = 'csrf_token';
let csrfTokenCache: string | null = null;
let csrfRefreshPromise: Promise<string | null> | null = null;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const next = () => {
  if (active >= MAX_CONCURRENT) return;
  const task = queue.shift();
  if (task) task();
};

const getCookieValue = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const encodedName = `${encodeURIComponent(name)}=`;
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(encodedName)) {
      return decodeURIComponent(trimmed.substring(encodedName.length));
    }
  }
  return null;
};

const resolveRequestUrl = (input: RequestInput): string => {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
};

const getCsrfEndpoint = (input: RequestInput): string => {
  const requestUrl = resolveRequestUrl(input);
  const fallbackOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
  const parsed = new URL(requestUrl, fallbackOrigin);
  const path = parsed.pathname || '';
  const apiPrefixIndex = path.indexOf('/api/');
  if (apiPrefixIndex >= 0) {
    const prefix = path.slice(0, apiPrefixIndex);
    return `${parsed.origin}${prefix}/api/auth/csrf`;
  }
  if (path.endsWith('/api')) {
    const prefix = path.slice(0, -4);
    return `${parsed.origin}${prefix}/api/auth/csrf`;
  }
  return `${parsed.origin}/api/auth/csrf`;
};

const readCsrfTokenFromPayload = (payload: any): string | null => {
  if (!payload || typeof payload !== 'object') return null;
  const direct = typeof payload.csrfToken === 'string' ? payload.csrfToken : null;
  if (direct) return direct;
  const nested = payload.data && typeof payload.data === 'object' && typeof payload.data.csrfToken === 'string'
    ? payload.data.csrfToken
    : null;
  return nested;
};

const fetchCsrfToken = async (
  input: RequestInput,
  options?: { forceRefresh?: boolean }
): Promise<string | null> => {
  if (!options?.forceRefresh) {
    const cookieToken = getCookieValue(CSRF_COOKIE_NAME);
    if (cookieToken) {
      csrfTokenCache = cookieToken;
      return cookieToken;
    }
    if (csrfTokenCache) {
      return csrfTokenCache;
    }
  }

  if (csrfRefreshPromise) {
    return csrfRefreshPromise;
  }

  const csrfEndpoint = getCsrfEndpoint(input);
  csrfRefreshPromise = (async () => {
    try {
      const response = await fetch(csrfEndpoint, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        return getCookieValue(CSRF_COOKIE_NAME) ?? csrfTokenCache;
      }
      const payload = await response.json().catch(() => null);
      const token = readCsrfTokenFromPayload(payload) ?? getCookieValue(CSRF_COOKIE_NAME);
      if (token) {
        csrfTokenCache = token;
      }
      return token ?? null;
    } catch {
      return getCookieValue(CSRF_COOKIE_NAME) ?? csrfTokenCache;
    } finally {
      csrfRefreshPromise = null;
    }
  })();

  return csrfRefreshPromise;
};

const isCsrfInvalidResponse = async (response: Response): Promise<boolean> => {
  if (response.status !== 403) return false;
  const payload = await response.clone().json().catch(() => null);
  return payload?.error === 'csrf_invalid';
};

const getRetryDelay = (response: Response, attempt: number) => {
  const retryAfter = response.headers.get('Retry-After');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return seconds * 1000;
  }
  return Math.min(8000, 1000 * Math.pow(2, attempt));
};

export const adminRequest = (input: RequestInput, init: RequestInitWithRetry = {}) => {
  return new Promise<Response>((resolve, reject) => {
    const run = async () => {
      active += 1;
      const { maxRetries = 2, timeoutMs = 20000, onRateLimit, ...fetchInit } = init;
      let attempt = 0;
      let csrfRetryAttempted = false;
      let forcedCsrfToken: string | null = null;

      while (true) {
        const controller = !fetchInit.signal ? new AbortController() : null;
        const timeout = controller && timeoutMs > 0
          ? window.setTimeout(() => controller.abort(), timeoutMs)
          : null;
        try {
          const method = (fetchInit.method ?? 'GET').toUpperCase();
          const isMutating = method !== 'GET' && method !== 'HEAD';
          const headers = new Headers(fetchInit.headers ?? {});

          if (isMutating) {
            if (forcedCsrfToken) {
              headers.set('X-CSRF-Token', forcedCsrfToken);
            } else if (!headers.has('X-CSRF-Token')) {
              let csrfToken = getCookieValue(CSRF_COOKIE_NAME) ?? csrfTokenCache;
              if (!csrfToken) {
                csrfToken = await fetchCsrfToken(input);
              }
              if (csrfToken) {
                csrfTokenCache = csrfToken;
                headers.set('X-CSRF-Token', csrfToken);
              }
            }
          }

          const response = await fetch(input, {
            credentials: 'include',
            ...fetchInit,
            headers,
            signal: controller?.signal ?? fetchInit.signal,
          });
          if (timeout) {
            window.clearTimeout(timeout);
          }

          if (isMutating && !csrfRetryAttempted && await isCsrfInvalidResponse(response)) {
            csrfRetryAttempted = true;
            const refreshedToken = await fetchCsrfToken(input, { forceRefresh: true });
            if (refreshedToken) {
              forcedCsrfToken = refreshedToken;
              continue;
            }
          }

          if (response.status === 429 && attempt < maxRetries) {
            const delay = getRetryDelay(response, attempt);
            attempt += 1;
            await wait(delay);
            continue;
          }

          if (response.status === 429) {
            onRateLimit?.(response);
          }

          resolve(response);
          break;
        } catch (error) {
          if (timeout) {
            window.clearTimeout(timeout);
          }
          if (attempt < maxRetries) {
            attempt += 1;
            await wait(Math.min(8000, 500 * Math.pow(2, attempt)));
            continue;
          }
          reject(error);
          break;
        }
      }

      active -= 1;
      next();
    };

    queue.push(() => {
      run().catch(reject);
    });
    next();
  });
};
