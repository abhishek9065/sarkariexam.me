import type {
    AdminAnnouncementListItem,
    AdminApprovalItem,
    AdminAuditLog,
    AdminBulkPreview,
    AdminErrorReport,
    AdminPermissionSnapshot,
    AdminReviewPreview,
    AdminSecurityLog,
    AdminSession,
    AdminStepUpGrant,
    AdminUser,
    CommunityFlag,
    CommunityForum,
    CommunityGroup,
    CommunityQa,
} from '../../types';

const normalizeBase = (value: string) => value.trim().replace(/\/+$/, '');
const configuredApiBase = import.meta.env.VITE_API_BASE
    ? normalizeBase(String(import.meta.env.VITE_API_BASE))
    : '';
const apiBaseCandidates = configuredApiBase ? [configuredApiBase, ''] : [''];
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

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
    const headers = new Headers(init.headers || {});

    if (withCsrf && init.method && init.method.toUpperCase() !== 'GET') {
        const csrfToken = await ensureCsrfToken();
        if (csrfToken) {
            headers.set(CSRF_HEADER_NAME, csrfToken);
        }
    }

    const response = await fetchWithBaseFallback(path, {
        ...init,
        credentials: 'include',
        headers,
    });

    const body = await parseBody(response);

    if (!response.ok) {
        const message = (body && (body.message || body.error)) || `Request failed: ${response.status}`;
        throw new Error(message);
    }

    return body;
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

export async function getAdminAnnouncements(input: {
    limit?: number;
    offset?: number;
    status?: string;
    search?: string;
    type?: string;
    sort?: 'newest' | 'oldest' | 'updated' | 'deadline' | 'views';
} = {}): Promise<AdminAnnouncementListItem[]> {
    const params = new URLSearchParams();
    params.set('limit', String(input.limit ?? 20));
    params.set('offset', String(input.offset ?? 0));
    if (input.status && input.status !== 'all') params.set('status', input.status);
    if (input.type && input.type !== 'all') params.set('type', input.type);
    if (input.sort) params.set('sort', input.sort);
    if (input.search && input.search.trim()) params.set('search', input.search.trim());

    const body = await request(`/api/admin/announcements?${params.toString()}`);
    return toArray<AdminAnnouncementListItem>(body?.data);
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

export async function terminateOtherAdminSessions(stepUpToken: string): Promise<{ success: boolean; removed?: number }> {
    const body = await request('/api/admin-auth/sessions/terminate-others', {
        method: 'POST',
        headers: mutationHeaders(stepUpToken, false),
    }, true);

    return body?.data ?? { success: false };
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

export async function createAdminAnnouncement(payload: Record<string, unknown>): Promise<AdminAnnouncementListItem> {
    const body = await request('/api/admin/announcements', {
        method: 'POST',
        headers: mutationHeaders(),
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
