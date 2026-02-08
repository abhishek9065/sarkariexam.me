type RequestInput = RequestInfo | URL;
type RequestInitWithRetry = RequestInit & {
  maxRetries?: number;
  timeoutMs?: number;
  onRateLimit?: (response: Response) => void;
};

const queue: Array<() => void> = [];
let active = 0;
const MAX_CONCURRENT = 3;

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

      while (true) {
        const controller = !fetchInit.signal ? new AbortController() : null;
        const timeout = controller && timeoutMs > 0
          ? window.setTimeout(() => controller.abort(), timeoutMs)
          : null;
        try {
          const method = (fetchInit.method ?? 'GET').toUpperCase();
          const headers = new Headers(fetchInit.headers ?? {});
          if (method !== 'GET' && method !== 'HEAD') {
            const csrfToken = getCookieValue('csrf_token');
            if (csrfToken && !headers.has('X-CSRF-Token')) {
              headers.set('X-CSRF-Token', csrfToken);
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
