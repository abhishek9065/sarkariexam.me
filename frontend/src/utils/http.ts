export type FetchRetryOptions = {
    retries?: number;
    retryDelayMs?: number;
    timeoutMs?: number;
    retryOn?: number[];
};

const DEFAULT_RETRY_STATUS = [408, 429, 500, 502, 503, 504];

function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(signal: AbortSignal | undefined, timeoutMs: number) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    if (signal) {
        signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    return { signal: controller.signal, cleanup: () => clearTimeout(timeoutId) };
}

export async function fetchJson<T>(
    url: string,
    options: RequestInit = {},
    retryOptions: FetchRetryOptions = {}
): Promise<T> {
    const {
        retries = 2,
        retryDelayMs = 350,
        timeoutMs = 7000,
        retryOn = DEFAULT_RETRY_STATUS,
    } = retryOptions;

    let attempt = 0;
    let lastError: unknown;

    while (attempt <= retries) {
        const { signal, cleanup } = withTimeout(options.signal, timeoutMs);
        try {
            const response = await fetch(url, { ...options, signal });
            cleanup();

            if (!response.ok) {
                if (retryOn.includes(response.status) && attempt < retries) {
                    attempt += 1;
                    await delay(retryDelayMs * attempt);
                    continue;
                }

                const errorBody = await response.json().catch(() => ({}));
                const message = (errorBody as { error?: string }).error || `Request failed (${response.status})`;
                throw new Error(message);
            }

            return response.json() as Promise<T>;
        } catch (error) {
            cleanup();
            lastError = error;
            if (attempt >= retries) break;
            attempt += 1;
            await delay(retryDelayMs * attempt);
        }
    }

    throw lastError instanceof Error ? lastError : new Error('Request failed');
}
