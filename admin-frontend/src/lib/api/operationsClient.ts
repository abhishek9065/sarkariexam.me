import type {
    AdminAlert,
    AdminRoleUser,
    AnnouncementTypeFilter,
    HomepageSectionConfig,
    LinkHealthReport,
    LinkRecord,
    MediaAsset,
    TemplateRecord,
} from '../../types';
import { mutationHeaders, request, toArray, typedData, typedMeta } from './core';
import { ADMIN_API_PATHS } from './paths';

export async function getHomepageSections(): Promise<HomepageSectionConfig[]> {
    const body = await request(ADMIN_API_PATHS.homepageSections);
    return toArray<HomepageSectionConfig>(body?.data);
}

export async function updateHomepageSections(sections: HomepageSectionConfig[]): Promise<HomepageSectionConfig[]> {
    const body = await request(ADMIN_API_PATHS.homepageSections, {
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
    const body = await request(`${ADMIN_API_PATHS.adminLinks}?${params.toString()}`);
    const meta = typedMeta(body);
    return {
        data: toArray<LinkRecord>(body?.data),
        meta: {
            total: meta.total,
            limit: meta.limit || (input.limit ?? 50),
            offset: meta.offset || (input.offset ?? 0),
        },
    };
}

export async function createLinkRecord(payload: Omit<LinkRecord, 'id'>): Promise<LinkRecord> {
    const body = await request(ADMIN_API_PATHS.adminLinks, {
        method: 'POST',
        headers: mutationHeaders(),
        body: JSON.stringify(payload),
    }, true);
    return typedData<LinkRecord>(body)!;
}

export async function updateLinkRecord(id: string, payload: Partial<Omit<LinkRecord, 'id'>>): Promise<LinkRecord> {
    const body = await request(`/api/admin/links/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: mutationHeaders(),
        body: JSON.stringify(payload),
    }, true);
    return typedData<LinkRecord>(body)!;
}

export async function checkLinks(payload: {
    ids?: string[];
    urls?: string[];
    timeoutMs?: number;
}): Promise<{ data: LinkHealthReport[]; meta?: Record<string, unknown> }> {
    const body = await request(ADMIN_API_PATHS.adminLinkCheck, {
        method: 'POST',
        headers: mutationHeaders(undefined, false),
        body: JSON.stringify(payload),
    }, true);
    return {
        data: toArray<LinkHealthReport>(body?.data),
        meta: (body?.meta as Record<string, unknown> | undefined),
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
    const body = await request(`${ADMIN_API_PATHS.adminLinkHealthSummary}?days=${boundedDays}`);
    type HealthSummary = { windowDays: number; generatedAt: string; totalLinks: number; byStatus: Record<string, number>; eventSummary: Array<{ status: string; count: number; avgResponseTimeMs: number | null }>; recentBroken: Array<{ id: string; label: string; url: string; announcementId?: string; updatedAt?: string }> };
    return typedData<HealthSummary>(body) ?? {
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
    const body = await request(ADMIN_API_PATHS.adminLinkReplace, {
        method: 'POST',
        headers: mutationHeaders(stepUpToken),
        body: JSON.stringify(payload),
    }, true);
    return typedData<Record<string, unknown>>(body) ?? {};
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
    const body = await request(`${ADMIN_API_PATHS.adminMedia}?${params.toString()}`);
    const meta = typedMeta(body);
    return {
        data: toArray<MediaAsset>(body?.data),
        meta: {
            total: meta.total,
            limit: meta.limit || (input.limit ?? 50),
            offset: meta.offset || (input.offset ?? 0),
        },
    };
}

export async function createMediaAsset(payload: Omit<MediaAsset, 'id' | 'status'>): Promise<MediaAsset> {
    const body = await request(ADMIN_API_PATHS.adminMedia, {
        method: 'POST',
        headers: mutationHeaders(),
        body: JSON.stringify(payload),
    }, true);
    return typedData<MediaAsset>(body)!;
}

export async function updateMediaAsset(id: string, payload: Partial<Omit<MediaAsset, 'id'>>): Promise<MediaAsset> {
    const body = await request(`/api/admin/media/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: mutationHeaders(),
        body: JSON.stringify(payload),
    }, true);
    return typedData<MediaAsset>(body)!;
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
    const body = await request(`${ADMIN_API_PATHS.adminTemplates}?${params.toString()}`);
    const meta = typedMeta(body);
    return {
        data: toArray<TemplateRecord>(body?.data),
        meta: {
            total: meta.total,
            limit: meta.limit || (input.limit ?? 100),
            offset: meta.offset || (input.offset ?? 0),
        },
    };
}

export async function createTemplateRecord(payload: Omit<TemplateRecord, 'id'>): Promise<TemplateRecord> {
    const body = await request(ADMIN_API_PATHS.adminTemplates, {
        method: 'POST',
        headers: mutationHeaders(),
        body: JSON.stringify(payload),
    }, true);
    return typedData<TemplateRecord>(body)!;
}

export async function updateTemplateRecord(id: string, payload: Partial<Omit<TemplateRecord, 'id'>>): Promise<TemplateRecord> {
    const body = await request(`/api/admin/templates/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: mutationHeaders(),
        body: JSON.stringify(payload),
    }, true);
    return typedData<TemplateRecord>(body)!;
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
    const body = await request(`${ADMIN_API_PATHS.adminAlerts}?${params.toString()}`);
    const meta = typedMeta(body);
    return {
        data: toArray<AdminAlert>(body?.data),
        meta: {
            total: meta.total,
            limit: meta.limit || (input.limit ?? 60),
            offset: meta.offset || (input.offset ?? 0),
        },
    };
}

export async function createAdminAlert(payload: Omit<AdminAlert, 'id'>): Promise<AdminAlert> {
    const body = await request(ADMIN_API_PATHS.adminAlerts, {
        method: 'POST',
        headers: mutationHeaders(),
        body: JSON.stringify(payload),
    }, true);
    return typedData<AdminAlert>(body)!;
}

export async function updateAdminAlert(id: string, payload: Partial<Omit<AdminAlert, 'id'>>): Promise<AdminAlert> {
    const body = await request(`/api/admin/alerts/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: mutationHeaders(),
        body: JSON.stringify(payload),
    }, true);
    return typedData<AdminAlert>(body)!;
}

export async function getAdminSetting(key: 'states' | 'boards' | 'tags'): Promise<{ key: string; values: string[]; updatedAt?: string; updatedBy?: string }> {
    const body = await request(`/api/admin/settings/${encodeURIComponent(key)}`);
    return typedData<{ key: string; values: string[]; updatedAt?: string; updatedBy?: string }>(body) ?? { key, values: [] };
}

export async function updateAdminSetting(key: 'states' | 'boards' | 'tags', values: string[]): Promise<{ key: string; values: string[]; updatedAt?: string; updatedBy?: string }> {
    const body = await request(`/api/admin/settings/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: mutationHeaders(),
        body: JSON.stringify({ values }),
    }, true);
    return typedData<{ key: string; values: string[]; updatedAt?: string; updatedBy?: string }>(body) ?? { key, values };
}

export async function getAdminRoleUsers(): Promise<AdminRoleUser[]> {
    const body = await request(ADMIN_API_PATHS.adminUsers);
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
    return typedData<AdminRoleUser>(body)!;
}
