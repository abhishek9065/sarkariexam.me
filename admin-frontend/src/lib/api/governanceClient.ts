import type {
    AdminApprovalItem,
    AdminAuditLog,
    AdminSecurityLog,
    AdminSession,
    AdminSessionTerminateOthersResult,
} from '../../types';
import { mutationHeaders, request, toArray, typedData } from './core';
import { ADMIN_API_PATHS } from './paths';

export async function getAdminSessions(): Promise<AdminSession[]> {
    const body = await request(ADMIN_API_PATHS.adminSessions);
    return toArray<AdminSession>(body?.data);
}

export async function terminateAdminSessionById(sessionId: string, stepUpToken: string): Promise<{ success: boolean }> {
    const body = await request(ADMIN_API_PATHS.adminTerminateSession, {
        method: 'POST',
        headers: mutationHeaders(stepUpToken, false),
        body: JSON.stringify({ sessionId }),
    }, true);

    return typedData<{ success: boolean }>(body) ?? { success: false };
}

export async function terminateOtherAdminSessions(stepUpToken: string): Promise<AdminSessionTerminateOthersResult> {
    const body = await request(ADMIN_API_PATHS.adminTerminateOtherSessions, {
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

    const body = await request(`${ADMIN_API_PATHS.adminAuditLog}?${params.toString()}`);
    return toArray<AdminAuditLog>(body?.data);
}

export async function getAdminAuditIntegrity(limit = 250): Promise<Record<string, unknown> | null> {
    const body = await request(`${ADMIN_API_PATHS.adminAuditIntegrity}?limit=${Math.max(10, Math.min(1000, limit))}`);
    return (body?.data && typeof body.data === 'object') ? (body.data as Record<string, unknown>) : null;
}

export async function rebuildAdminAuditLedger(stepUpToken: string): Promise<Record<string, unknown>> {
    const body = await request(`${ADMIN_API_PATHS.adminAuditIntegrity.replace('/integrity', '/rebuild')}`, {
        method: 'POST',
        headers: mutationHeaders(stepUpToken, false),
    }, true);
    return (body?.data && typeof body.data === 'object') ? (body.data as Record<string, unknown>) : {};
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

    const body = await request(`${ADMIN_API_PATHS.adminSecurityLog}?${params.toString()}`);
    return toArray<AdminSecurityLog>(body?.data);
}

export async function getAdminApprovals(status = 'pending'): Promise<AdminApprovalItem[]> {
    const body = await request(`${ADMIN_API_PATHS.adminApprovals}?status=${encodeURIComponent(status)}`);
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
    return typedData<AdminApprovalItem>(body) ?? {} as AdminApprovalItem;
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
    return typedData<AdminApprovalItem>(body) ?? {} as AdminApprovalItem;
}
