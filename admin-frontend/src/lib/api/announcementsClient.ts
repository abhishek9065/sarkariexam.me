import type {
    AnnouncementTypeFilter,
    AdminAnnouncementListItem,
    AdminAnnouncementListResponse,
    AdminAutosavePayload,
    AdminBulkPreview,
    AdminContentRecord,
    AdminDraftRecord,
    AdminGlobalSearchResult,
    AdminRevisionEntry,
    AdminReviewPreview,
    AdminSavedView,
} from '../../types';
import { mutationHeaders, request, toArray, typedData, typedMeta } from './core';
import { ADMIN_API_PATHS } from './paths';

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
    includeInactive?: boolean;
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
    if (input.includeInactive) params.set('includeInactive', 'true');

    const body = await request(`${ADMIN_API_PATHS.adminAnnouncements}?${params.toString()}`);
    const meta = typedMeta(body);
    return {
        data: toArray<AdminAnnouncementListItem>(body?.data),
        meta: {
            total: meta.total,
            limit: meta.limit || (input.limit ?? 20),
            offset: meta.offset || (input.offset ?? 0),
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
    includeInactive?: boolean;
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
    const meta = typedMeta(body);
    return {
        data: toArray<AdminSavedView>(body?.data),
        meta: {
            total: meta.total,
            limit: meta.limit || (input.limit ?? 100),
            offset: meta.offset || (input.offset ?? 0),
        },
    };
}

export async function createAdminSavedView(payload: Omit<AdminSavedView, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>): Promise<AdminSavedView> {
    const body = await request('/api/admin/views', {
        method: 'POST',
        headers: mutationHeaders(),
        body: JSON.stringify(payload),
    }, true);
    return typedData<AdminSavedView>(body)!;
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
    return typedData<AdminSavedView>(body)!;
}

export async function deleteAdminSavedView(id: string): Promise<{ success: boolean; id: string }> {
    const body = await request(`/api/admin/views/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: mutationHeaders(),
    }, true);
    return (typedData<{ success: boolean; id: string }>(body)) ?? { success: false, id };
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
    return typedData<AdminDraftRecord>(body)!;
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
    return typedData<{ id: string; title: string; status: string; version: number; updatedAt?: string; autosaved: boolean }>(body)!;
}

export async function getAnnouncementRevisions(id: string, limit = 20): Promise<{
    announcementId: string;
    currentVersion: number;
    currentUpdatedAt?: string;
    revisions: AdminRevisionEntry[];
}> {
    const body = await request(`/api/admin/announcements/${encodeURIComponent(id)}/revisions?limit=${Math.max(1, Math.min(100, limit))}`);
    return typedData<{ announcementId: string; currentVersion: number; currentUpdatedAt?: string; revisions: AdminRevisionEntry[] }>(body) ?? { announcementId: id, currentVersion: 0, revisions: [] };
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
    return typedData<Record<string, unknown>>(body) ?? {};
}

export async function getReviewPreview(input: {
    ids: string[];
    action: 'approve' | 'reject' | 'schedule';
    scheduleAt?: string;
    note?: string;
}): Promise<AdminReviewPreview> {
    const body = await request(ADMIN_API_PATHS.adminReviewPreview, {
        method: 'POST',
        headers: mutationHeaders(undefined, false),
        body: JSON.stringify(input),
    }, true);

    return typedData<AdminReviewPreview>(body) ?? { eligibleIds: [], blockedIds: [], warnings: [] };
}

export async function getBulkUpdatePreview(input: {
    ids: string[];
    data: Record<string, unknown>;
}): Promise<AdminBulkPreview> {
    const body = await request(ADMIN_API_PATHS.adminAnnouncementBulkPreview, {
        method: 'POST',
        headers: mutationHeaders(undefined, false),
        body: JSON.stringify(input),
    }, true);

    return typedData<AdminBulkPreview>(body) ?? {
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
    const body = await request(ADMIN_API_PATHS.adminAnnouncements, {
        method: 'POST',
        headers: mutationHeaders(stepUpToken),
        body: JSON.stringify(payload),
    }, true);
    return typedData<AdminAnnouncementListItem>(body) ?? {} as AdminAnnouncementListItem;
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
    return typedData<AdminAnnouncementListItem>(body) ?? {} as AdminAnnouncementListItem;
}

export async function updateAnnouncementAssignment(
    id: string,
    payload: { assigneeUserId?: string; assigneeEmail?: string }
): Promise<AdminAnnouncementListItem> {
    const body = await request(`/api/admin/announcements/${encodeURIComponent(id)}/assignment`, {
        method: 'PATCH',
        headers: mutationHeaders(),
        body: JSON.stringify(payload),
    }, true);
    return typedData<AdminAnnouncementListItem>(body) ?? {} as AdminAnnouncementListItem;
}

export async function updateAnnouncementReviewSla(
    id: string,
    reviewDueAt?: string
): Promise<AdminAnnouncementListItem> {
    const body = await request(`/api/admin/announcements/${encodeURIComponent(id)}/review-sla`, {
        method: 'PATCH',
        headers: mutationHeaders(),
        body: JSON.stringify({ reviewDueAt }),
    }, true);
    return typedData<AdminAnnouncementListItem>(body) ?? {} as AdminAnnouncementListItem;
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
    return typedData<AdminAnnouncementListItem>(body) ?? {} as AdminAnnouncementListItem;
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
    return typedData<AdminAnnouncementListItem>(body) ?? {} as AdminAnnouncementListItem;
}

export async function runBulkApprove(
    ids: string[],
    note: string | undefined,
    stepUpToken: string
): Promise<Record<string, unknown>> {
    const body = await request(ADMIN_API_PATHS.adminAnnouncementBulkApprove, {
        method: 'POST',
        headers: mutationHeaders(stepUpToken),
        body: JSON.stringify({ ids, ...(note ? { note } : {}) }),
    }, true);
    return typedData<Record<string, unknown>>(body) ?? {};
}

export async function runBulkReject(
    ids: string[],
    note: string | undefined,
    stepUpToken: string
): Promise<Record<string, unknown>> {
    const body = await request(ADMIN_API_PATHS.adminAnnouncementBulkReject, {
        method: 'POST',
        headers: mutationHeaders(stepUpToken),
        body: JSON.stringify({ ids, ...(note ? { note } : {}) }),
    }, true);
    return typedData<Record<string, unknown>>(body) ?? {};
}

export async function runBulkUpdate(
    ids: string[],
    data: Record<string, unknown>,
    stepUpToken: string
): Promise<Record<string, unknown>> {
    const body = await request(ADMIN_API_PATHS.adminAnnouncementBulk, {
        method: 'POST',
        headers: mutationHeaders(stepUpToken),
        body: JSON.stringify({ ids, data }),
    }, true);
    return typedData<Record<string, unknown>>(body) ?? {};
}

export async function createAdminContentRecord(payload: Record<string, unknown>, stepUpToken?: string): Promise<AdminContentRecord> {
    const body = await request(ADMIN_API_PATHS.adminAnnouncements, {
        method: 'POST',
        headers: mutationHeaders(stepUpToken),
        body: JSON.stringify(payload),
    }, true);
    return typedData<AdminContentRecord>(body) ?? {} as AdminContentRecord;
}

export async function updateAdminContentRecord(id: string, payload: Record<string, unknown>): Promise<AdminContentRecord> {
    const body = await request(`/api/admin/announcements/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: mutationHeaders(),
        body: JSON.stringify(payload),
    }, true);
    return typedData<AdminContentRecord>(body) ?? {} as AdminContentRecord;
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
    return typedData<AdminContentRecord>(body)!;
}
