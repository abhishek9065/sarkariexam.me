import type { AdminErrorReport, CommunityFlag, CommunityForum, CommunityGroup, CommunityQa } from '../../types';
import { mutationHeaders, request, toArray, typedData } from './core';
import { ADMIN_API_PATHS } from './paths';

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

    const body = await request(`${ADMIN_API_PATHS.supportErrorReports}?${params.toString()}`);
    return toArray<AdminErrorReport>(body?.data);
}

export async function updateErrorReport(
    id: string,
    payload: { status: 'new' | 'triaged' | 'resolved'; adminNote?: string; assigneeEmail?: string }
): Promise<AdminErrorReport> {
    const body = await request(`${ADMIN_API_PATHS.supportErrorReports}/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: mutationHeaders(),
        body: JSON.stringify(payload),
    }, true);
    return typedData<AdminErrorReport>(body)!;
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

    const body = await request(`${ADMIN_API_PATHS.communityFlags}?${params.toString()}`);
    return toArray<CommunityFlag>(body?.data);
}

export async function resolveCommunityFlag(id: string): Promise<void> {
    await request(`${ADMIN_API_PATHS.communityFlags}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: mutationHeaders(),
    }, true);
}

export async function getCommunityForums(limit = 20): Promise<CommunityForum[]> {
    const body = await request(`${ADMIN_API_PATHS.communityForums}?limit=${limit}&offset=0`);
    return toArray<CommunityForum>(body?.data);
}

export async function getCommunityQa(limit = 20): Promise<CommunityQa[]> {
    const body = await request(`${ADMIN_API_PATHS.communityQa}?limit=${limit}&offset=0`);
    return toArray<CommunityQa>(body?.data);
}

export async function getCommunityGroups(limit = 20): Promise<CommunityGroup[]> {
    const body = await request(`${ADMIN_API_PATHS.communityGroups}?limit=${limit}&offset=0`);
    return toArray<CommunityGroup>(body?.data);
}
