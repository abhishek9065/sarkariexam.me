import type {
    AnnouncementTypeFilter,
    AdminAlert,
    AdminAnnouncementListItem,
    AdminAnnouncementListResponse,
    AdminAutosavePayload,
    AdminContentRecord,
    AdminApprovalItem,
    AdminAuditLog,
    AdminBulkPreview,
    AdminDraftRecord,
    AdminErrorReport,
    AdminGlobalSearchResult,
    AdminRoleUser,
    AdminReportSnapshot,
    AdminRevisionEntry,
    AdminSavedView,
    AdminPermissionSnapshot,
    AdminReviewPreview,
    AdminSecurityLog,
    AdminSession,
    AdminSessionTerminateOthersResult,
    AdminStepUpGrant,
    AdminUser,
    CommunityFlag,
    CommunityForum,
    CommunityGroup,
    CommunityQa,
    HomepageSectionConfig,
    LinkHealthReport,
    LinkRecord,
    MediaAsset,
    TemplateRecord,
} from '../../types';

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

const toArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

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

const mutationHeaders = (stepUpToken?: string, includeIdempotency = true): Headers => {
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

    const response = await fetchWithBaseFallback('/api/auth/csrf', {
        credentials: 'include',
        headers: {
            'Cache-Control': 'no-store',
        },
    });

    if (!response.ok) return readCookie(CSRF_COOKIE_NAME);

    const body = await parseBody(response) as { data?: { csrfToken?: string } } | null;
    return body?.data?.csrfToken || readCookie(CSRF_COOKIE_NAME);
}

async function request(path: string, init: RequestInit = {}, withCsrf = false) {
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
        return body;
    }
}

export async function adminAuthLogin(email: string, password: string, twoFactorCode?: string): Promise<void> {
    await request('/api/admin-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, ...(twoFactorCode ? { twoFactorCode } : {}) }),
    }, true);
}

export async function adminAuthLogout(): Promise<void> {
    await request('/api/admin-auth/logout', { method: 'POST' }, true);
}

export async function adminAuthStepUp(email: string, password: string, twoFactorCode?: string): Promise<AdminStepUpGrant> {
    const body = await request('/api/admin-auth/step-up', {
        method: 'POST',
        headers: mutationHeaders(undefined, false),
        body: JSON.stringify({
            email,
            password,
            ...(twoFactorCode ? { twoFactorCode } : {}),
        }),
    }, true);

    const token = body?.data?.token;
    const expiresAt = body?.data?.expiresAt;
    if (typeof token !== 'string' || typeof expiresAt !== 'string') {
        throw new Error('Invalid step-up response');
    }

    return { token, expiresAt };
}

export async function getAdminMe(): Promise<AdminUser | null> {
    const body = await request('/api/admin-auth/me');
    return body?.data?.user ?? null;
}

export async function getAdminPermissions(): Promise<AdminPermissionSnapshot | null> {
    const body = await request('/api/admin-auth/permissions');
    return body?.data ?? null;
}

export async function getAdminDashboard() {
    const body = await request('/api/admin/dashboard');
    return body?.data ?? null;
}

export async function getAnalyticsOverview(input: {
    days?: number;
    compareDays?: number;
} = {}): Promise<Record<string, unknown> | null> {
    const params = new URLSearchParams();
    if (input.days && Number.isFinite(input.days)) params.set('days', String(input.days));
    if (input.compareDays && Number.isFinite(input.compareDays)) params.set('compareDays', String(input.compareDays));
    const query = params.toString();
    const body = await request(`/api/analytics/overview${query ? `?${query}` : ''}`);
    return (body?.data && typeof body.data === 'object') ? (body.data as Record<string, unknown>) : null;
}

export async function getAdminAnnouncementsPaged(input: {
    limit?: number;
    offset?: number;
    status?: string;
    search?: string;
    type?: string;
    sort?: 'newest' | 'oldest' | 'updated' | 'deadline' | 'views';
    dateStart?: string;
    dateEnd?: string;
    author?: string;
} = {}): Promise<AdminAnnouncementListResponse> {
    const params = new URLSearchParams();
    params.set('limit', String(input.limit ?? 20));
    params.set('offset', String(input.offset ?? 0));
    if (input.status && input.status !== 'all') params.set('status', input.status);
    if (input.type && input.type !== 'all') params.set('type', input.type);
    if (input.sort) params.set('sort', input.sort);
    if (input.search && input.search.trim()) params.set('search', input.search.trim());
    if (input.dateStart) params.set('dateStart', input.dateStart);
    if (input.dateEnd) params.set('dateEnd', input.dateEnd);
    if (input.author && input.author.trim()) params.set('author', input.author.trim());

    const body = await request(`/api/admin/announcements?${params.toString()}`);
    return {
        data: toArray<AdminAnnouncementListItem>(body?.data),
        meta: {
            total: Number(body?.meta?.total ?? 0),
            limit: Number(body?.meta?.limit ?? input.limit ?? 20),
            offset: Number(body?.meta?.offset ?? input.offset ?? 0),
        },
    };
}

export async function getAdminAnnouncements(input: {
    limit?: number;
    offset?: number;
    status?: string;
    search?: string;
    type?: string;
    sort?: 'newest' | 'oldest' | 'updated' | 'deadline' | 'views';
} = {}): Promise<AdminAnnouncementListItem[]> {
    const response = await getAdminAnnouncementsPaged(input);
    return response.data;
}

export async function searchAdminEntities(input: {
    q: string;
    limit?: number;
    entities?: Array<'posts' | 'links' | 'media' | 'organizations' | 'tags'>;
}): Promise<{ data: AdminGlobalSearchResult[]; meta?: Record<string, unknown> }> {
    const params = new URLSearchParams();
    params.set('q', input.q.trim());
    if (input.limit && Number.isFinite(input.limit)) params.set('limit', String(input.limit));
    if (input.entities && input.entities.length > 0) params.set('entities', input.entities.join(','));
    const body = await request(`/api/admin/search?${params.toString()}`);
    return {
        data: toArray<AdminGlobalSearchResult>(body?.data),
        ...(body?.meta ? { meta: body.meta as Record<string, unknown> } : {}),
    };
}

export async function getAdminSavedViews(input: {
    module?: string;
    scope?: 'all' | 'private' | 'shared';
    search?: string;
    limit?: number;
    offset?: number;
} = {}): Promise<{ data: AdminSavedView[]; meta: { total: number; limit: number; offset: number } }> {
    const params = new URLSearchParams();
    if (input.module?.trim()) params.set('module', input.module.trim());
    if (input.scope && input.scope !== 'all') params.set('scope', input.scope);
    if (input.search?.trim()) params.set('search', input.search.trim());
    params.set('limit', String(input.limit ?? 100));
    params.set('offset', String(input.offset ?? 0));

    const body = await request(`/api/admin/views?${params.toString()}`);
    return {
        data: toArray<AdminSavedView>(body?.data),
        meta: {
            total: Number(body?.meta?.total ?? 0),
            limit: Number(body?.meta?.limit ?? input.limit ?? 100),
            offset: Number(body?.meta?.offset ?? input.offset ?? 0),
        },
    };
}

export async function createAdminSavedView(payload: Omit<AdminSavedView, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>): Promise<AdminSavedView> {
    const body = await request('/api/admin/views', {
        method: 'POST',
        headers: mutationHeaders(),
        body: JSON.stringify(payload),
    }, true);
    return body?.data;
}

export async function updateAdminSavedView(
    id: string,
    payload: Partial<Omit<AdminSavedView, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>>
): Promise<AdminSavedView> {
    const body = await request(`/api/admin/views/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: mutationHeaders(),
        body: JSON.stringify(payload),
    }, true);
    return body?.data;
}

export async function deleteAdminSavedView(id: string): Promise<{ success: boolean; id: string }> {
    const body = await request(`/api/admin/views/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: mutationHeaders(),
    }, true);
    return body?.data ?? { success: false, id };
}

export async function createAnnouncementDraft(input: {
    type?: AnnouncementTypeFilter;
    title?: string;
    category?: string;
    organization?: string;
    templateId?: string;
} = {}): Promise<AdminDraftRecord> {
    const body = await request('/api/admin/announcements/draft', {
        method: 'POST',
        headers: mutationHeaders(),
        body: JSON.stringify(input),
    }, true);
    return body?.data;
}

export async function autosaveAnnouncementDraft(id: string, payload: AdminAutosavePayload): Promise<{
    id: string;
    title: string;
    status: string;
    version: number;
    updatedAt?: string;
    autosaved: boolean;
}> {
    const body = await request(`/api/admin/announcements/${encodeURIComponent(id)}/autosave`, {
        method: 'PATCH',
        headers: mutationHeaders(),
        body: JSON.stringify(payload),
    }, true);
    return body?.data;
}

export async function getAnnouncementRevisions(id: string, limit = 20): Promise<{
    announcementId: string;
    currentVersion: number;
    currentUpdatedAt?: string;
    revisions: AdminRevisionEntry[];
}> {
    const body = await request(`/api/admin/announcements/${encodeURIComponent(id)}/revisions?limit=${Math.max(1, Math.min(100, limit))}`);
    return body?.data ?? { announcementId: id, currentVersion: 0, revisions: [] };
}

export async function restoreRevision(
    id: string,
    version: number,
    stepUpToken: string,
    note?: string
): Promise<Record<string, unknown>> {
    const body = await request(`/api/admin/announcements/${encodeURIComponent(id)}/rollback`, {
        method: 'POST',
        headers: mutationHeaders(stepUpToken),
        body: JSON.stringify({ version, note: note || `Restored to v${version}` }),
    }, true);
    return body?.data;
}

export async function getAdminSessions(): Promise<AdminSession[]> {
    const body = await request('/api/admin/sessions');
    return toArray<AdminSession>(body?.data);
}

export async function terminateAdminSessionById(sessionId: string, stepUpToken: string): Promise<{ success: boolean }> {
    const body = await request('/api/admin-auth/sessions/terminate', {
        method: 'POST',
        headers: mutationHeaders(stepUpToken, false),
        body: JSON.stringify({ sessionId }),
    }, true);

    return body?.data ?? { success: false };
}

export async function terminateOtherAdminSessions(stepUpToken: string): Promise<AdminSessionTerminateOthersResult> {
    const body = await request('/api/admin-auth/sessions/terminate-others', {
        method: 'POST',
        headers: mutationHeaders(stepUpToken, false),
    }, true);

    const data = (body?.data ?? { success: false }) as AdminSessionTerminateOthersResult;
    const removed = typeof data.removed === 'number'
        ? data.removed
        : (typeof data.terminatedCount === 'number' ? data.terminatedCount : undefined);
    const terminatedCount = typeof data.terminatedCount === 'number'
        ? data.terminatedCount
        : (typeof data.removed === 'number' ? data.removed : undefined);

    return {
        success: Boolean(data.success),
        ...(removed !== undefined ? { removed } : {}),
        ...(terminatedCount !== undefined ? { terminatedCount } : {}),
    };
}

export async function getAdminAuditLogs(input: {
    limit?: number;
    offset?: number;
    userId?: string;
    action?: string;
    start?: string;
    end?: string;
} = {}): Promise<AdminAuditLog[]> {
    const params = new URLSearchParams();
    params.set('limit', String(input.limit ?? 30));
    params.set('offset', String(input.offset ?? 0));
    if (input.userId && input.userId.trim()) params.set('userId', input.userId.trim());
    if (input.action && input.action.trim()) params.set('action', input.action.trim());
    if (input.start) params.set('start', input.start);
    if (input.end) params.set('end', input.end);

    const body = await request(`/api/admin/audit-log?${params.toString()}`);
    return toArray<AdminAuditLog>(body?.data);
}

export async function getAdminAuditIntegrity(limit = 250): Promise<Record<string, unknown> | null> {
    const body = await request(`/api/admin/audit-log/integrity?limit=${Math.max(10, Math.min(1000, limit))}`);
    return (body?.data && typeof body.data === 'object') ? (body.data as Record<string, unknown>) : null;
}

export async function getAdminSecurityLogs(input: {
    limit?: number;
    offset?: number;
    eventType?: string;
    ip?: string;
    endpoint?: string;
    start?: string;
    end?: string;
} = {}): Promise<AdminSecurityLog[]> {
    const params = new URLSearchParams();
    params.set('limit', String(input.limit ?? 30));
    params.set('offset', String(input.offset ?? 0));
    if (input.eventType && input.eventType.trim()) params.set('eventType', input.eventType.trim());
    if (input.ip && input.ip.trim()) params.set('ip', input.ip.trim());
    if (input.endpoint && input.endpoint.trim()) params.set('endpoint', input.endpoint.trim());
    if (input.start) params.set('start', input.start);
    if (input.end) params.set('end', input.end);

    const body = await request(`/api/admin/security?${params.toString()}`);
    return toArray<AdminSecurityLog>(body?.data);
}

export async function getAdminApprovals(status = 'pending'): Promise<AdminApprovalItem[]> {
    const body = await request(`/api/admin/approvals?status=${encodeURIComponent(status)}`);
    return toArray<AdminApprovalItem>(body?.data);
}

export async function approveAdminApproval(
    id: string,
    note: string | undefined,
    stepUpToken: string
): Promise<AdminApprovalItem> {
    const body = await request(`/api/admin/approvals/${encodeURIComponent(id)}/approve`, {
        method: 'POST',
        headers: mutationHeaders(stepUpToken, false),
        body: JSON.stringify(note ? { note } : {}),
    }, true);
    return body?.data ?? {};
}

export async function rejectAdminApproval(
    id: string,
    reason: string | undefined,
    stepUpToken: string
): Promise<AdminApprovalItem> {
    const body = await request(`/api/admin/approvals/${encodeURIComponent(id)}/reject`, {
        method: 'POST',
        headers: mutationHeaders(stepUpToken, false),
        body: JSON.stringify(reason ? { reason } : {}),
    }, true);
    return body?.data ?? {};
}

export async function getReviewPreview(input: {
    ids: string[];
    action: 'approve' | 'reject' | 'schedule';
    scheduleAt?: string;
    note?: string;
}): Promise<AdminReviewPreview> {
    const body = await request('/api/admin/review/preview', {
        method: 'POST',
        headers: mutationHeaders(undefined, false),
        body: JSON.stringify(input),
    }, true);

    return body?.data ?? { eligibleIds: [], blockedIds: [], warnings: [] };
}

export async function getBulkUpdatePreview(input: {
    ids: string[];
    data: Record<string, unknown>;
}): Promise<AdminBulkPreview> {
    const body = await request('/api/admin/announcements/bulk/preview', {
        method: 'POST',
        headers: mutationHeaders(undefined, false),
        body: JSON.stringify(input),
    }, true);

    return body?.data ?? {
        totalTargets: 0,
        affectedByStatus: {},
        warnings: [],
        missingIds: [],
    };
}

export async function createAdminAnnouncement(
    payload: Record<string, unknown>,
    stepUpToken?: string
): Promise<AdminAnnouncementListItem> {
    const body = await request('/api/admin/announcements', {
        method: 'POST',
        headers: mutationHeaders(stepUpToken),
        body: JSON.stringify(payload),
    }, true);
    return body?.data ?? {};
}

export async function updateAdminAnnouncement(
    id: string,
    payload: Record<string, unknown>
): Promise<AdminAnnouncementListItem> {
    const body = await request(`/api/admin/announcements/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: mutationHeaders(),
        body: JSON.stringify(payload),
    }, true);
    return body?.data ?? {};
}

export async function approveAdminAnnouncement(
    id: string,
    note: string | undefined,
    stepUpToken: string
): Promise<AdminAnnouncementListItem> {
    const body = await request(`/api/admin/announcements/${encodeURIComponent(id)}/approve`, {
        method: 'POST',
        headers: mutationHeaders(stepUpToken),
        body: JSON.stringify(note ? { note } : {}),
    }, true);
    return body?.data ?? {};
}

export async function rejectAdminAnnouncement(
    id: string,
    note: string | undefined,
    stepUpToken: string
): Promise<AdminAnnouncementListItem> {
    const body = await request(`/api/admin/announcements/${encodeURIComponent(id)}/reject`, {
        method: 'POST',
        headers: mutationHeaders(stepUpToken),
        body: JSON.stringify(note ? { note } : {}),
    }, true);
    return body?.data ?? {};
}

export async function runBulkApprove(
    ids: string[],
    note: string | undefined,
    stepUpToken: string
): Promise<Record<string, unknown>> {
    const body = await request('/api/admin/announcements/bulk-approve', {
        method: 'POST',
        headers: mutationHeaders(stepUpToken),
        body: JSON.stringify({ ids, ...(note ? { note } : {}) }),
    }, true);
    return body?.data ?? {};
}

export async function runBulkReject(
    ids: string[],
    note: string | undefined,
    stepUpToken: string
): Promise<Record<string, unknown>> {
    const body = await request('/api/admin/announcements/bulk-reject', {
        method: 'POST',
        headers: mutationHeaders(stepUpToken),
        body: JSON.stringify({ ids, ...(note ? { note } : {}) }),
    }, true);
    return body?.data ?? {};
}

export async function runBulkUpdate(
    ids: string[],
    data: Record<string, unknown>,
    stepUpToken: string
): Promise<Record<string, unknown>> {
    const body = await request('/api/admin/announcements/bulk', {
        method: 'POST',
        headers: mutationHeaders(stepUpToken),
        body: JSON.stringify({ ids, data }),
    }, true);
    return body?.data ?? {};
}

export async function getErrorReports(input: {
    status?: 'new' | 'triaged' | 'resolved' | 'all';
    errorId?: string;
    limit?: number;
    offset?: number;
} = {}): Promise<AdminErrorReport[]> {
    const params = new URLSearchParams();
    params.set('limit', String(input.limit ?? 30));
    params.set('offset', String(input.offset ?? 0));
    if (input.status && input.status !== 'all') params.set('status', input.status);
    if (input.errorId && input.errorId.trim()) params.set('errorId', input.errorId.trim());

    const body = await request(`/api/support/error-reports?${params.toString()}`);
    return toArray<AdminErrorReport>(body?.data);
}

export async function updateErrorReport(
    id: string,
    payload: { status: 'new' | 'triaged' | 'resolved'; adminNote?: string }
): Promise<AdminErrorReport> {
    const body = await request(`/api/support/error-reports/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: mutationHeaders(),
        body: JSON.stringify(payload),
    }, true);
    return body?.data;
}

export async function getCommunityFlags(input: {
    status?: 'open' | 'reviewed' | 'resolved' | 'all';
    entityType?: 'forum' | 'qa' | 'group' | 'all';
    limit?: number;
    offset?: number;
} = {}): Promise<CommunityFlag[]> {
    const params = new URLSearchParams();
    params.set('limit', String(input.limit ?? 30));
    params.set('offset', String(input.offset ?? 0));
    if (input.status && input.status !== 'all') params.set('status', input.status);
    if (input.entityType && input.entityType !== 'all') params.set('entityType', input.entityType);

    const body = await request(`/api/community/flags?${params.toString()}`);
    return toArray<CommunityFlag>(body?.data);
}

export async function resolveCommunityFlag(id: string): Promise<void> {
    await request(`/api/community/flags/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: mutationHeaders(),
    }, true);
}

export async function getCommunityForums(limit = 20): Promise<CommunityForum[]> {
    const body = await request(`/api/community/forums?limit=${limit}&offset=0`);
    return toArray<CommunityForum>(body?.data);
}

export async function getCommunityQa(limit = 20): Promise<CommunityQa[]> {
    const body = await request(`/api/community/qa?limit=${limit}&offset=0`);
    return toArray<CommunityQa>(body?.data);
}

export async function getCommunityGroups(limit = 20): Promise<CommunityGroup[]> {
    const body = await request(`/api/community/groups?limit=${limit}&offset=0`);
    return toArray<CommunityGroup>(body?.data);
}

export async function createAdminContentRecord(payload: Record<string, unknown>): Promise<AdminContentRecord> {
    const body = await request('/api/admin/announcements', {
        method: 'POST',
        headers: mutationHeaders(),
        body: JSON.stringify(payload),
    }, true);
    return body?.data ?? {};
}

export async function updateAdminContentRecord(id: string, payload: Record<string, unknown>): Promise<AdminContentRecord> {
    const body = await request(`/api/admin/announcements/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: mutationHeaders(),
        body: JSON.stringify(payload),
    }, true);
    return body?.data ?? {};
}

export async function getHomepageSections(): Promise<HomepageSectionConfig[]> {
    const body = await request('/api/admin/homepage/sections');
    return toArray<HomepageSectionConfig>(body?.data);
}

export async function updateHomepageSections(sections: HomepageSectionConfig[]): Promise<HomepageSectionConfig[]> {
    const body = await request('/api/admin/homepage/sections', {
        method: 'PUT',
        headers: mutationHeaders(),
        body: JSON.stringify({ sections }),
    }, true);
    return toArray<HomepageSectionConfig>(body?.data);
}

export async function getLinkRecords(input: {
    limit?: number;
    offset?: number;
    type?: 'official' | 'pdf' | 'external' | 'all';
    status?: 'active' | 'expired' | 'broken' | 'all';
    announcementId?: string;
    search?: string;
} = {}): Promise<{ data: LinkRecord[]; meta: { total: number; limit: number; offset: number } }> {
    const params = new URLSearchParams();
    params.set('limit', String(input.limit ?? 50));
    params.set('offset', String(input.offset ?? 0));
    if (input.type && input.type !== 'all') params.set('type', input.type);
    if (input.status && input.status !== 'all') params.set('status', input.status);
    if (input.announcementId) params.set('announcementId', input.announcementId);
    if (input.search?.trim()) params.set('search', input.search.trim());
    const body = await request(`/api/admin/links?${params.toString()}`);
    return {
        data: toArray<LinkRecord>(body?.data),
        meta: {
            total: Number(body?.meta?.total ?? 0),
            limit: Number(body?.meta?.limit ?? input.limit ?? 50),
            offset: Number(body?.meta?.offset ?? input.offset ?? 0),
        },
    };
}

export async function createLinkRecord(payload: Omit<LinkRecord, 'id'>): Promise<LinkRecord> {
    const body = await request('/api/admin/links', {
        method: 'POST',
        headers: mutationHeaders(),
        body: JSON.stringify(payload),
    }, true);
    return body?.data;
}

export async function updateLinkRecord(id: string, payload: Partial<Omit<LinkRecord, 'id'>>): Promise<LinkRecord> {
    const body = await request(`/api/admin/links/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: mutationHeaders(),
        body: JSON.stringify(payload),
    }, true);
    return body?.data;
}

export async function checkLinks(payload: {
    ids?: string[];
    urls?: string[];
    timeoutMs?: number;
}): Promise<{ data: LinkHealthReport[]; meta?: Record<string, unknown> }> {
    const body = await request('/api/admin/links/check', {
        method: 'POST',
        headers: mutationHeaders(undefined, false),
        body: JSON.stringify(payload),
    }, true);
    return {
        data: toArray<LinkHealthReport>(body?.data),
        meta: body?.meta,
    };
}

export async function getLinkHealthSummary(days = 7): Promise<{
    windowDays: number;
    generatedAt: string;
    totalLinks: number;
    byStatus: Record<string, number>;
    eventSummary: Array<{ status: string; count: number; avgResponseTimeMs: number | null }>;
    recentBroken: Array<{ id: string; label: string; url: string; announcementId?: string; updatedAt?: string }>;
}> {
    const boundedDays = Math.max(1, Math.min(90, days));
    const body = await request(`/api/admin/links/health/summary?days=${boundedDays}`);
    return body?.data ?? {
        windowDays: boundedDays,
        generatedAt: new Date().toISOString(),
        totalLinks: 0,
        byStatus: {},
        eventSummary: [],
        recentBroken: [],
    };
}

export async function replaceLinks(
    payload: { fromUrl: string; toUrl: string; scope?: 'all' | 'announcements' | 'links' },
    stepUpToken: string
): Promise<Record<string, unknown>> {
    const body = await request('/api/admin/links/replace', {
        method: 'POST',
        headers: mutationHeaders(stepUpToken),
        body: JSON.stringify(payload),
    }, true);
    return body?.data ?? {};
}

export async function getMediaAssets(input: {
    limit?: number;
    offset?: number;
    category?: 'notification' | 'result' | 'admit-card' | 'answer-key' | 'syllabus' | 'other' | 'all';
    status?: 'active' | 'archived' | 'all';
    search?: string;
} = {}): Promise<{ data: MediaAsset[]; meta: { total: number; limit: number; offset: number } }> {
    const params = new URLSearchParams();
    params.set('limit', String(input.limit ?? 50));
    params.set('offset', String(input.offset ?? 0));
    if (input.category && input.category !== 'all') params.set('category', input.category);
    if (input.status && input.status !== 'all') params.set('status', input.status);
    if (input.search?.trim()) params.set('search', input.search.trim());
    const body = await request(`/api/admin/media?${params.toString()}`);
    return {
        data: toArray<MediaAsset>(body?.data),
        meta: {
            total: Number(body?.meta?.total ?? 0),
            limit: Number(body?.meta?.limit ?? input.limit ?? 50),
            offset: Number(body?.meta?.offset ?? input.offset ?? 0),
        },
    };
}

export async function createMediaAsset(payload: Omit<MediaAsset, 'id' | 'status'>): Promise<MediaAsset> {
    const body = await request('/api/admin/media', {
        method: 'POST',
        headers: mutationHeaders(),
        body: JSON.stringify(payload),
    }, true);
    return body?.data;
}

export async function updateMediaAsset(id: string, payload: Partial<Omit<MediaAsset, 'id'>>): Promise<MediaAsset> {
    const body = await request(`/api/admin/media/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: mutationHeaders(),
        body: JSON.stringify(payload),
    }, true);
    return body?.data;
}

export async function getTemplateRecords(input: {
    type?: AnnouncementTypeFilter | 'all';
    shared?: 'true' | 'false' | 'all';
    limit?: number;
    offset?: number;
} = {}): Promise<{ data: TemplateRecord[]; meta: { total: number; limit: number; offset: number } }> {
    const params = new URLSearchParams();
    params.set('type', input.type ?? 'all');
    params.set('shared', input.shared ?? 'all');
    params.set('limit', String(input.limit ?? 100));
    params.set('offset', String(input.offset ?? 0));
    const body = await request(`/api/admin/templates?${params.toString()}`);
    return {
        data: toArray<TemplateRecord>(body?.data),
        meta: {
            total: Number(body?.meta?.total ?? 0),
            limit: Number(body?.meta?.limit ?? input.limit ?? 100),
            offset: Number(body?.meta?.offset ?? input.offset ?? 0),
        },
    };
}

export async function createTemplateRecord(payload: Omit<TemplateRecord, 'id'>): Promise<TemplateRecord> {
    const body = await request('/api/admin/templates', {
        method: 'POST',
        headers: mutationHeaders(),
        body: JSON.stringify(payload),
    }, true);
    return body?.data;
}

export async function updateTemplateRecord(id: string, payload: Partial<Omit<TemplateRecord, 'id'>>): Promise<TemplateRecord> {
    const body = await request(`/api/admin/templates/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: mutationHeaders(),
        body: JSON.stringify(payload),
    }, true);
    return body?.data;
}

export async function getAdminAlerts(input: {
    source?: 'deadline' | 'schedule' | 'link' | 'traffic' | 'manual' | 'all';
    severity?: 'info' | 'warning' | 'critical' | 'all';
    status?: 'open' | 'acknowledged' | 'resolved' | 'all';
    limit?: number;
    offset?: number;
} = {}): Promise<{ data: AdminAlert[]; meta: { total: number; limit: number; offset: number } }> {
    const params = new URLSearchParams();
    params.set('source', input.source ?? 'all');
    params.set('severity', input.severity ?? 'all');
    params.set('status', input.status ?? 'all');
    params.set('limit', String(input.limit ?? 60));
    params.set('offset', String(input.offset ?? 0));
    const body = await request(`/api/admin/alerts?${params.toString()}`);
    return {
        data: toArray<AdminAlert>(body?.data),
        meta: {
            total: Number(body?.meta?.total ?? 0),
            limit: Number(body?.meta?.limit ?? input.limit ?? 60),
            offset: Number(body?.meta?.offset ?? input.offset ?? 0),
        },
    };
}

export async function createAdminAlert(payload: Omit<AdminAlert, 'id'>): Promise<AdminAlert> {
    const body = await request('/api/admin/alerts', {
        method: 'POST',
        headers: mutationHeaders(),
        body: JSON.stringify(payload),
    }, true);
    return body?.data;
}

export async function updateAdminAlert(id: string, payload: Partial<Omit<AdminAlert, 'id'>>): Promise<AdminAlert> {
    const body = await request(`/api/admin/alerts/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: mutationHeaders(),
        body: JSON.stringify(payload),
    }, true);
    return body?.data;
}

export async function getAdminSetting(key: 'states' | 'boards' | 'tags'): Promise<{ key: string; values: string[]; updatedAt?: string; updatedBy?: string }> {
    const body = await request(`/api/admin/settings/${encodeURIComponent(key)}`);
    return body?.data ?? { key, values: [] };
}

export async function updateAdminSetting(key: 'states' | 'boards' | 'tags', values: string[]): Promise<{ key: string; values: string[]; updatedAt?: string; updatedBy?: string }> {
    const body = await request(`/api/admin/settings/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: mutationHeaders(),
        body: JSON.stringify({ values }),
    }, true);
    return body?.data ?? { key, values };
}

export async function getAdminRoleUsers(): Promise<AdminRoleUser[]> {
    const body = await request('/api/admin/users');
    return toArray<AdminRoleUser>(body?.data);
}

export async function updateAdminRoleUser(
    id: string,
    payload: { role: 'admin' | 'editor' | 'reviewer' | 'viewer' | 'contributor'; isActive?: boolean },
    stepUpToken: string
): Promise<AdminRoleUser> {
    const body = await request(`/api/admin/users/${encodeURIComponent(id)}/role`, {
        method: 'PATCH',
        headers: mutationHeaders(stepUpToken),
        body: JSON.stringify(payload),
    }, true);
    return body?.data;
}

export async function updateAnnouncementSeo(
    id: string,
    payload: {
        seo: {
            metaTitle?: string;
            metaDescription?: string;
            canonical?: string;
            indexPolicy?: 'index' | 'noindex';
            ogImage?: string;
        };
        schema?: Record<string, unknown>;
    }
): Promise<AdminContentRecord> {
    const body = await request(`/api/admin/announcements/${encodeURIComponent(id)}/seo`, {
        method: 'PATCH',
        headers: mutationHeaders(),
        body: JSON.stringify(payload),
    }, true);
    return body?.data;
}

export async function getAdminReports(): Promise<AdminReportSnapshot> {
    const body = await request('/api/admin/reports');
    return body?.data ?? {
        summary: {
            totalPosts: 0,
            pendingDrafts: 0,
            scheduled: 0,
            pendingReview: 0,
            brokenLinks: 0,
            expired: 0,
        },
        mostViewed24h: [],
        upcomingDeadlines: [],
        brokenLinkItems: [],
    };
}
