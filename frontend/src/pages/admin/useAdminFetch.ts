/**
 * Custom hook encapsulating the admin fetch wrapper with CSRF, step-up
 * verification, dual-approval, break-glass, and rate-limit retry logic.
 *
 * Extracted from AdminPage.tsx to reduce the monolith size.
 */

import { useCallback, useRef, useState } from 'react';
import type { StepUpCredentials } from '../../components/admin/StepUpModal';
import { adminRequest } from '../../utils/adminRequest';
import { getApiErrorMessage } from '../../utils/errors';
import {
    API_BASE,
    CSRF_COOKIE_NAME,
    CSRF_HEADER_NAME,
    ADMIN_STEP_UP_HEADER_NAME,
    ADMIN_APPROVAL_HEADER_NAME,
    ADMIN_BREAK_GLASS_REASON_HEADER_NAME,
    DEFAULT_BREAK_GLASS_REASON_MIN_LENGTH,
    MUTATING_METHODS,
    READ_ONLY_MESSAGE,
} from './adminConstants';
import { readCookieValue, requestBodyFingerprint } from './adminHelpers';
import type { ToastTone } from './adminTypes';

// ─── Types ──────────────────────────────────────────────────────────────────

export type UseAdminFetchDeps = {
    userEmail: string | undefined;
    pushToast: (message: string, tone?: ToastTone) => void;
    setMessage: (msg: string) => void;
    setRateLimitUntil: React.Dispatch<React.SetStateAction<number | null>>;
    handleUnauthorized: (reason?: string) => void;
    canMutateEndpoint: (method: string, pathname: string) => boolean;
    /**
     * Called when step-up credentials are needed.
     * Returns the admin's password + optional 2FA code, or `null` if cancelled.
     */
    requestStepUpCredentials: (forceRefresh: boolean) => Promise<StepUpCredentials | null>;
};

// ─── Internal helpers ───────────────────────────────────────────────────────

const resolveRequestPath = (input: RequestInfo | URL): string => {
    try {
        if (typeof input === 'string') {
            return new URL(input, window.location.origin).pathname;
        }
        if (input instanceof URL) {
            return input.pathname;
        }
        if (input instanceof Request) {
            return new URL(input.url, window.location.origin).pathname;
        }
    } catch {
        // ignore parse errors
    }
    return '';
};

const readResponseBodySafe = async (response: Response): Promise<Record<string, unknown>> => {
    try {
        const parsed = await response.clone().json();
        return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    } catch {
        return {};
    }
};

const requiresStepUpForRequest = (method: string, pathname: string): boolean => {
    if (!MUTATING_METHODS.has(method)) return false;
    if (/\/api\/admin\/sessions\/terminate(?:-others)?$/.test(pathname)) return true;
    if (/\/api\/admin\/announcements\/[^/]+\/(approve|reject|rollback)$/.test(pathname)) return true;
    if (/\/api\/admin\/announcements\/(bulk|bulk-approve|bulk-reject)$/.test(pathname)) return true;
    if (method === 'DELETE' && /\/api\/admin\/announcements\/[^/]+$/.test(pathname)) return true;
    return false;
};

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useAdminFetch(deps: UseAdminFetchDeps) {
    const {
        userEmail,
        pushToast,
        setMessage,
        setRateLimitUntil,
        handleUnauthorized,
        canMutateEndpoint,
        requestStepUpCredentials,
    } = deps;

    const csrfTokenRef = useRef<string | null>(null);
    const adminStepUpRef = useRef<{ token: string; expiresAt: string } | null>(null);
    const approvalReplayRef = useRef<Map<string, string>>(new Map());

    // Expose refs so the caller can clear them on logout
    const clearRefs = useCallback(() => {
        csrfTokenRef.current = null;
        adminStepUpRef.current = null;
        approvalReplayRef.current.clear();
    }, []);

    // ── CSRF ────────────────────────────────────────────────────────────────

    const ensureCsrfToken = useCallback(async (forceRefresh = false): Promise<string | null> => {
        if (!forceRefresh) {
            const cookieToken = readCookieValue(CSRF_COOKIE_NAME);
            if (cookieToken) {
                csrfTokenRef.current = cookieToken;
                return cookieToken;
            }
            if (csrfTokenRef.current) return csrfTokenRef.current;
        }

        const response = await adminRequest(`${API_BASE}/api/auth/csrf`, {
            method: 'GET',
            headers: { 'Cache-Control': 'no-store' },
            maxRetries: 1,
        });

        if (!response.ok) {
            return readCookieValue(CSRF_COOKIE_NAME) ?? csrfTokenRef.current;
        }

        const payload = await response.json().catch(() => ({} as Record<string, unknown>));
        const bodyToken = typeof payload?.data?.csrfToken === 'string' ? payload.data.csrfToken : null;
        const cookieToken = readCookieValue(CSRF_COOKIE_NAME);
        const token = bodyToken || cookieToken;
        if (token) {
            csrfTokenRef.current = token;
            return token;
        }
        return null;
    }, []);

    // ── Step-up token ───────────────────────────────────────────────────────

    const getValidStepUpToken = useCallback((): string | null => {
        const grant = adminStepUpRef.current;
        if (!grant) return null;
        const expiresAtMs = new Date(grant.expiresAt).getTime();
        if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
            adminStepUpRef.current = null;
            return null;
        }
        return grant.token;
    }, []);

    const requestAdminStepUpToken = useCallback(
        async (forceRefresh = false): Promise<string | null> => {
            if (!forceRefresh) {
                const cached = getValidStepUpToken();
                if (cached) return cached;
            }

            if (!userEmail) {
                setMessage('Authentication context missing. Please log in again.');
                return null;
            }

            const credentials = await requestStepUpCredentials(forceRefresh);
            if (!credentials) return null;

            const csrfToken = await ensureCsrfToken(false);
            const headers = new Headers({ 'Content-Type': 'application/json' });
            if (csrfToken) {
                headers.set(CSRF_HEADER_NAME, csrfToken);
            }

            const response = await adminRequest(`${API_BASE}/api/auth/admin/step-up`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    email: userEmail,
                    password: credentials.password,
                    ...(credentials.twoFactorCode
                        ? { twoFactorCode: credentials.twoFactorCode }
                        : {}),
                }),
                maxRetries: 0,
            });

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                const errorMessage = getApiErrorMessage(errorBody, 'Step-up verification failed.');
                setMessage(errorMessage);
                pushToast(errorMessage, 'error');
                return null;
            }

            const payload = await response.json().catch(() => ({} as Record<string, unknown>));
            const token = typeof payload?.data?.token === 'string' ? payload.data.token : '';
            const expiresAt = typeof payload?.data?.expiresAt === 'string' ? payload.data.expiresAt : '';
            if (!token || !expiresAt) {
                const errorMessage = 'Step-up verification failed.';
                setMessage(errorMessage);
                pushToast(errorMessage, 'error');
                return null;
            }

            adminStepUpRef.current = { token, expiresAt };
            return token;
        },
        [ensureCsrfToken, getValidStepUpToken, pushToast, setMessage, userEmail, requestStepUpCredentials],
    );

    // ── Main fetch wrapper ──────────────────────────────────────────────────

    const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(null);

    const adminFetch = useCallback(
        async (input: RequestInfo | URL, init?: RequestInit) => {
            const method = (init?.method ?? 'GET').toUpperCase();
            const path = resolveRequestPath(input);

            if (!canMutateEndpoint(method, path)) {
                setMessage(READ_ONLY_MESSAGE);
                pushToast(READ_ONLY_MESSAGE, 'error');
                return new Response(
                    JSON.stringify({ error: 'forbidden', message: READ_ONLY_MESSAGE }),
                    { status: 403, headers: { 'Content-Type': 'application/json' } },
                );
            }

            const isMutating = MUTATING_METHODS.has(method);
            const stepUpRequired = requiresStepUpForRequest(method, path);
            const approvalFingerprint = isMutating
                ? `${method}:${path}:${requestBodyFingerprint(init?.body ?? null)}`
                : '';

            let retriedCsrf = false;
            let retriedStepUp = false;
            let retriedBreakGlass = false;
            let forceCsrfRefresh = false;
            let forceStepUpRefresh = false;
            let breakGlassReason: string | null = null;

            while (true) {
                const headers = new Headers(init?.headers ?? {});
                if (isMutating && !headers.has('Idempotency-Key')) {
                    headers.set('Idempotency-Key', crypto.randomUUID());
                }
                if (isMutating && approvalFingerprint) {
                    const cachedApprovalId = approvalReplayRef.current.get(approvalFingerprint);
                    if (cachedApprovalId && !headers.has(ADMIN_APPROVAL_HEADER_NAME)) {
                        headers.set(ADMIN_APPROVAL_HEADER_NAME, cachedApprovalId);
                    }
                }
                if (isMutating && breakGlassReason && !headers.has(ADMIN_BREAK_GLASS_REASON_HEADER_NAME)) {
                    headers.set(ADMIN_BREAK_GLASS_REASON_HEADER_NAME, breakGlassReason);
                }

                if (isMutating) {
                    const csrfToken = await ensureCsrfToken(forceCsrfRefresh);
                    forceCsrfRefresh = false;
                    if (csrfToken) {
                        headers.set(CSRF_HEADER_NAME, csrfToken);
                    }
                }

                if (stepUpRequired || forceStepUpRefresh) {
                    const stepUpToken = await requestAdminStepUpToken(forceStepUpRefresh);
                    forceStepUpRefresh = false;
                    if (!stepUpToken) {
                        return new Response(
                            JSON.stringify({
                                error: 'step_up_required',
                                code: 'STEP_UP_REQUIRED',
                                message: 'Step-up verification required for this action.',
                            }),
                            { status: 403, headers: { 'Content-Type': 'application/json' } },
                        );
                    }
                    headers.set(ADMIN_STEP_UP_HEADER_NAME, stepUpToken);
                }

                const response = await adminRequest(input, {
                    ...init,
                    headers,
                    maxRetries: method === 'GET' ? 2 : 0,
                    onRateLimit: (rateLimitResponse) => {
                        const retryAfter = rateLimitResponse.headers.get('Retry-After');
                        const retrySeconds =
                            retryAfter && Number.isFinite(Number(retryAfter)) ? Number(retryAfter) : 60;
                        const message = retryAfter
                            ? `Too many requests. Try again in ${retrySeconds}s.`
                            : 'Too many requests. Please wait and try again.';
                        setRateLimitUntil((current) => {
                            const nextUntil = Date.now() + retrySeconds * 1000;
                            return current ? Math.max(current, nextUntil) : nextUntil;
                        });
                        setMessage(message);
                    },
                });

                if (response.status === 401) {
                    handleUnauthorized();
                    return response;
                }

                // ── Dual-approval / break-glass ─────────────────────────────
                if (isMutating && response.status === 202) {
                    const errorBody = await readResponseBodySafe(response);
                    const error = typeof errorBody.error === 'string' ? errorBody.error : '';
                    if (error === 'approval_required') {
                        const approvalId =
                            typeof errorBody.approvalId === 'string' ? errorBody.approvalId.trim() : '';
                        if (approvalFingerprint && approvalId) {
                            approvalReplayRef.current.set(approvalFingerprint, approvalId);
                        }

                        const breakGlassMeta =
                            errorBody.breakGlass && typeof errorBody.breakGlass === 'object'
                                ? (errorBody.breakGlass as Record<string, unknown>)
                                : null;
                        const breakGlassEnabled = breakGlassMeta?.enabled === true;
                        const minReasonLengthRaw = breakGlassMeta?.minReasonLength;
                        const minReasonLength =
                            typeof minReasonLengthRaw === 'number' && Number.isFinite(minReasonLengthRaw)
                                ? Math.max(8, Math.floor(minReasonLengthRaw))
                                : DEFAULT_BREAK_GLASS_REASON_MIN_LENGTH;

                        if (!retriedBreakGlass && breakGlassEnabled) {
                            const promptInput = window.prompt(
                                `Secondary approval is required. For emergency single-operator execution, enter break-glass reason (${minReasonLength}+ chars):`,
                            );
                            const normalizedReason = (promptInput ?? '').trim();
                            if (normalizedReason.length >= minReasonLength) {
                                breakGlassReason = normalizedReason;
                                retriedBreakGlass = true;
                                continue;
                            }
                            if (promptInput && normalizedReason.length < minReasonLength) {
                                const validationMessage = `Break-glass reason must be at least ${minReasonLength} characters.`;
                                setMessage(validationMessage);
                                pushToast(validationMessage, 'error');
                            }
                        }

                        const approvalMessage = getApiErrorMessage(
                            errorBody,
                            'Action queued for secondary approval. Approve it, then retry execution.',
                        );
                        setMessage(approvalMessage);
                        pushToast(approvalMessage, 'info');
                        return new Response(
                            JSON.stringify({ ...errorBody, message: approvalMessage }),
                            { status: 409, headers: { 'Content-Type': 'application/json' } },
                        );
                    }
                }

                // ── Approval invalid ────────────────────────────────────────
                if (isMutating && response.status === 409) {
                    const errorBody = await readResponseBodySafe(response);
                    const error = typeof errorBody.error === 'string' ? errorBody.error : '';
                    if (error === 'approval_invalid') {
                        const reason = typeof errorBody.reason === 'string' ? errorBody.reason : '';
                        const approvalInvalidMessage =
                            reason === 'invalid_status:pending'
                                ? 'Approval request is still pending secondary approval.'
                                : reason === 'invalid_status:expired'
                                    ? 'Approval request expired. Retry to create a new approval request.'
                                    : reason === 'invalid_status:rejected'
                                        ? 'Approval request was rejected. Retry to submit a new request.'
                                        : reason === 'request_mismatch'
                                            ? 'Approval no longer matches this action payload. Retry the action.'
                                            : getApiErrorMessage(
                                                errorBody,
                                                'Approval validation failed. Retry the action.',
                                            );

                        if (approvalFingerprint && reason !== 'invalid_status:approved') {
                            approvalReplayRef.current.delete(approvalFingerprint);
                        }

                        setMessage(approvalInvalidMessage);
                        pushToast(approvalInvalidMessage, 'error');
                        return new Response(
                            JSON.stringify({ ...errorBody, message: approvalInvalidMessage }),
                            { status: 409, headers: { 'Content-Type': 'application/json' } },
                        );
                    }
                }

                // ── CSRF / step-up retry ────────────────────────────────────
                if (isMutating && response.status === 403) {
                    const errorBody = await readResponseBodySafe(response);
                    const error = typeof errorBody.error === 'string' ? errorBody.error : '';

                    if (!retriedCsrf && error === 'csrf_invalid') {
                        retriedCsrf = true;
                        forceCsrfRefresh = true;
                        continue;
                    }

                    if (!retriedStepUp && (error === 'step_up_required' || error === 'step_up_invalid')) {
                        retriedStepUp = true;
                        adminStepUpRef.current = null;
                        forceStepUpRefresh = true;
                        continue;
                    }
                }

                if (isMutating && approvalFingerprint && response.ok) {
                    approvalReplayRef.current.delete(approvalFingerprint);
                }
                return response;
            }
        },
        [
            pushToast,
            canMutateEndpoint,
            ensureCsrfToken,
            handleUnauthorized,
            requestAdminStepUpToken,
            setMessage,
            setRateLimitUntil,
        ],
    );

    return { adminFetch, ensureCsrfToken, clearRefs, rateLimitRemaining, setRateLimitRemaining };
}
