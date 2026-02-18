const normalizeBase = (value: string) => value.trim().replace(/\/+$/, '');

const configuredApiBase = import.meta.env.VITE_API_BASE
    ? `${normalizeBase(String(import.meta.env.VITE_API_BASE))}/api`
    : null;

const API_BASE_CANDIDATES = configuredApiBase ? [configuredApiBase, '/api'] : ['/api'];
const DEDUPE_MAP = new Map<string, number>();
const DEFAULT_DEDUPE_WINDOW_MS = 60_000;

interface ClientErrorReportInput {
    errorId: string;
    message: string;
    note?: string;
    stack?: string;
    componentStack?: string;
    dedupeKey?: string;
    dedupeWindowMs?: number;
}

const pruneDedupeMap = (now: number) => {
    for (const [key, expiresAt] of DEDUPE_MAP.entries()) {
        if (expiresAt <= now) {
            DEDUPE_MAP.delete(key);
        }
    }
};

const shouldSkipByDedupe = (key: string, dedupeWindowMs: number): boolean => {
    const now = Date.now();
    pruneDedupeMap(now);

    const existingExpiry = DEDUPE_MAP.get(key);
    if (existingExpiry && existingExpiry > now) {
        return true;
    }

    DEDUPE_MAP.set(key, now + dedupeWindowMs);
    return false;
};

const buildPayload = (input: ClientErrorReportInput) => ({
    errorId: input.errorId,
    message: input.message,
    pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    note: input.note,
    stack: input.stack,
    componentStack: input.componentStack,
    timestamp: new Date().toISOString(),
});

export async function reportClientError(input: ClientErrorReportInput): Promise<boolean> {
    const dedupeWindowMs = input.dedupeWindowMs ?? DEFAULT_DEDUPE_WINDOW_MS;
    const dedupeKey = input.dedupeKey ?? `${input.errorId}:${input.message}`;

    if (shouldSkipByDedupe(dedupeKey, dedupeWindowMs)) {
        return false;
    }

    const payload = buildPayload(input);

    for (const base of API_BASE_CANDIDATES) {
        try {
            const response = await fetch(`${base}/support/error-report`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                return true;
            }
        } catch {
            // Continue to fallback candidate.
        }
    }

    return false;
}
