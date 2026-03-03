import { ADMIN_API_PATHS } from './paths';

const normalizeBase = (value: string) => value.trim().replace(/\/+$/, '');
const configuredApiBase = import.meta.env.VITE_API_BASE
    ? normalizeBase(String(import.meta.env.VITE_API_BASE))
    : '';
const apiBaseCandidates = configuredApiBase ? [configuredApiBase, ''] : [''];
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';
const ADMIN_APPROVAL_HEADER_NAME = 'X-Admin-Approval-Id';
const ADMIN_BREAK_GLASS_REASON_HEADER_NAME = 'X-Admin-Break-Glass-Reason';
const DEFAULT_BREAK_GLASS_REASON_MIN_LENGTH = 12;
const approvalReplayCache = new Map<string, string>();

const readCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null;
    const escaped = name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
};

const parseBody = async (res: Response) => {
    const text = await res.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
};

export const toArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

/** Safely extract `body.data` with a type assertion. */
export function typedData<T>(body: Record<string, unknown> | null): T | undefined {
    return body?.data as T | undefined;
}

/** Safely extract pagination meta from `body.data.meta` or `body.meta`. */
export function typedMeta(body: Record<string, unknown> | null): { total: number; limit: number; offset: number } {
    const meta = (body?.data as Record<string, unknown> | undefined)?.meta ?? body?.meta;
    const m = (meta && typeof meta === 'object') ? (meta as Record<string, unknown>) : {};
    return {
        total: typeof m.total === 'number' ? m.total : 0,
        limit: typeof m.limit === 'number' ? m.limit : 20,
        offset: typeof m.offset === 'number' ? m.offset : 0,
    };
}

const cleanText = (value: string): string => value.trim();

const joinParts = (parts: string[]): string => {
    const cleaned = parts.map(cleanText).filter(Boolean);
    if (cleaned.length === 0) return '';
    if (cleaned.length === 1) return cleaned[0];
    return `${cleaned[0]}. ${cleaned.slice(1).join(' ')}`;
};

const extractFlattenMessages = (value: unknown): string => {
    if (!value || typeof value !== 'object') return '';
    const payload = value as { formErrors?: unknown; fieldErrors?: unknown };
    const formErrors = Array.isArray(payload.formErrors)
        ? payload.formErrors.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
        : [];
    const fieldErrors = payload.fieldErrors && typeof payload.fieldErrors === 'object'
        ? Object.values(payload.fieldErrors as Record<string, unknown>)
            .flatMap((entry) => Array.isArray(entry) ? entry : [])
            .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
        : [];
    return joinParts([...formErrors, ...fieldErrors]);
};

const deriveApiErrorMessage = (body: Record<string, unknown> | null, fallback: string): string => {
    if (!body) return fallback;
    const errorText = typeof body.error === 'string' ? body.error : '';
    const messageText = typeof body.message === 'string' ? body.message : '';
    const direct = joinParts([errorText, messageText].filter(Boolean));
    if (direct) return direct;
    const flattenError = extractFlattenMessages(body.error);
    if (flattenError) return flattenError;
    const flattenMessage = extractFlattenMessages(body.message);
    if (flattenMessage) return flattenMessage;
    return fallback;
};

const requestBodyFingerprint = (body: BodyInit | null | undefined): string => {
    if (typeof body === 'string') return body;
    if (body instanceof URLSearchParams) return body.toString();
    return '';
};

const buildApprovalFingerprint = (method: string, path: string, body: BodyInit | null | undefined): string => {
    return `${method.toUpperCase()}:${path}:${requestBodyFingerprint(body)}`;
};

const getStoredBreakGlassReason = (minReasonLength: number): string | null => {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const value = window.localStorage.getItem('admin_break_glass_reason');
    const normalized = value?.trim() ?? '';
    if (normalized.length < minReasonLength) return null;
    return normalized;
};

const addIdempotencyKey = (headers: Headers) => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        headers.set('Idempotency-Key', crypto.randomUUID());
    }
};

export const mutationHeaders = (stepUpToken?: string, includeIdempotency = true): Headers => {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    if (includeIdempotency) addIdempotencyKey(headers);
    if (stepUpToken) headers.set('X-Admin-Step-Up-Token', stepUpToken);
    return headers;
};

const isRetryableNetworkError = (error: unknown): boolean => error instanceof TypeError;

export class AdminApiWorkflowError extends Error {
    status: number;
    code: string;
    body: Record<string, unknown> | null;
    path: string;
    method: string;
    approvalId?: string;

    constructor(input: {
        message: string;
        status: number;
        code: string;
        body: Record<string, unknown> | null;
        path: string;
        method: string;
        approvalId?: string;
    }) {
        super(input.message);
        this.name = 'AdminApiWorkflowError';
        this.status = input.status;
        this.code = input.code;
        this.body = input.body;
        this.path = input.path;
        this.method = input.method;
        this.approvalId = input.approvalId;
    }
}

async function fetchWithBaseFallback(path: string, init: RequestInit): Promise<Response> {
    let lastError: unknown = null;

    for (const base of apiBaseCandidates) {
        try {
            return await fetch(`${base}${path}`, init);
        } catch (error) {
            lastError = error;
            if (!isRetryableNetworkError(error)) {
                throw error;
            }
        }
    }

    if (lastError instanceof Error) {
        throw lastError;
    }
    throw new TypeError('Failed to fetch');
}

async function ensureCsrfToken(forceRefresh = false): Promise<string | null> {
    if (!forceRefresh) {
        const existing = readCookie(CSRF_COOKIE_NAME);
        if (existing) return existing;
    }

    const response = await fetchWithBaseFallback(ADMIN_API_PATHS.csrf, {
        credentials: 'include',
        headers: {
            'Cache-Control': 'no-store',
        },
    });

    if (!response.ok) return readCookie(CSRF_COOKIE_NAME);

    const body = await parseBody(response) as { data?: { csrfToken?: string } } | null;
    return body?.data?.csrfToken || readCookie(CSRF_COOKIE_NAME);
}

export async function request(path: string, init: RequestInit = {}, withCsrf = false): Promise<Record<string, unknown> | null> {
    const method = (init.method ?? 'GET').toUpperCase();
    const isMutating = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
    const approvalFingerprint = isMutating ? buildApprovalFingerprint(method, path, init.body ?? null) : '';
    let breakGlassReason: string | null = null;
    let breakGlassAttempted = false;

    while (true) {
        const headers = new Headers(init.headers || {});

        if (withCsrf && isMutating) {
            const csrfToken = await ensureCsrfToken();
            if (csrfToken) {
                headers.set(CSRF_HEADER_NAME, csrfToken);
            }
        }

        if (isMutating && approvalFingerprint) {
            const cachedApprovalId = approvalReplayCache.get(approvalFingerprint);
            if (cachedApprovalId && !headers.has(ADMIN_APPROVAL_HEADER_NAME)) {
                headers.set(ADMIN_APPROVAL_HEADER_NAME, cachedApprovalId);
            }
        }
        if (isMutating && breakGlassReason && !headers.has(ADMIN_BREAK_GLASS_REASON_HEADER_NAME)) {
            headers.set(ADMIN_BREAK_GLASS_REASON_HEADER_NAME, breakGlassReason);
        }

        const response = await fetchWithBaseFallback(path, {
            ...init,
            credentials: 'include',
            headers,
        });

        const parsed = await parseBody(response);
        const body = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
        const errorCode = typeof body?.error === 'string' ? body.error : '';

        if (isMutating && response.status === 202 && errorCode === 'approval_required') {
            const approvalId = typeof body?.approvalId === 'string' ? body.approvalId.trim() : '';
            if (approvalFingerprint && approvalId) {
                approvalReplayCache.set(approvalFingerprint, approvalId);
            }

            const breakGlassMeta = body?.breakGlass && typeof body.breakGlass === 'object'
                ? (body.breakGlass as Record<string, unknown>)
                : null;
            const breakGlassEnabled = breakGlassMeta?.enabled === true;
            const minReasonLengthRaw = breakGlassMeta?.minReasonLength;
            const minReasonLength = typeof minReasonLengthRaw === 'number'
                && Number.isFinite(minReasonLengthRaw)
                ? Math.max(8, Math.floor(minReasonLengthRaw))
                : DEFAULT_BREAK_GLASS_REASON_MIN_LENGTH;

            if (breakGlassEnabled && !breakGlassAttempted) {
                const storedReason = getStoredBreakGlassReason(minReasonLength);
                if (storedReason) {
                    breakGlassReason = storedReason;
                    breakGlassAttempted = true;
                    continue;
                }
            }

            const approvalMessage = typeof body?.message === 'string'
                ? body.message
                : (breakGlassEnabled
                    ? 'Action queued for secondary approval. Approve it, or set localStorage.admin_break_glass_reason and retry.'
                    : 'Action queued for secondary approval. Approve it, then retry execution.');
            throw new AdminApiWorkflowError({
                message: approvalMessage,
                status: 202,
                code: 'APPROVAL_REQUIRED',
                body,
                path,
                method,
                approvalId: approvalId || undefined,
            });
        }

        if (isMutating && response.status === 409 && errorCode === 'approval_invalid') {
            const reason = typeof body?.reason === 'string' ? body.reason : '';
            const approvalInvalidMessage = reason === 'invalid_status:pending'
                ? 'Approval request is still pending secondary approval.'
                : reason === 'invalid_status:expired'
                    ? 'Approval request expired. Retry to create a new approval request.'
                    : reason === 'invalid_status:rejected'
                        ? 'Approval request was rejected. Retry to submit a new request.'
                        : reason === 'request_mismatch'
                            ? 'Approval no longer matches this action payload. Retry the action.'
                            : (typeof body?.message === 'string'
                                ? body.message
                                : 'Approval validation failed. Retry the action.');

            if (approvalFingerprint && reason !== 'invalid_status:approved') {
                approvalReplayCache.delete(approvalFingerprint);
            }
            throw new AdminApiWorkflowError({
                message: approvalInvalidMessage,
                status: 409,
                code: 'APPROVAL_INVALID',
                body,
                path,
                method,
            });
        }

        if (!response.ok) {
            const message = deriveApiErrorMessage(body, `Request failed: ${response.status}`);
            throw new Error(message);
        }

        if (isMutating && approvalFingerprint) {
            approvalReplayCache.delete(approvalFingerprint);
        }
        return body as Record<string, unknown> | null;
    }
}
