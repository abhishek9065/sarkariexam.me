import type { AdminErrorReport, CommunityFlag, CommunityForum, CommunityGroup, CommunityQa } from '../../types';
import { mutationHeaders, request, toArray } from './core';

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
