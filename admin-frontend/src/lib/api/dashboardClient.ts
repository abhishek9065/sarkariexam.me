import type { AdminReportSnapshot } from '../../types';
import { request, typedData } from './core';
import { ADMIN_API_PATHS } from './paths';

export async function getAdminDashboard() {
    const body = await request(ADMIN_API_PATHS.adminDashboard);
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
    const body = await request(`${ADMIN_API_PATHS.analyticsOverview}${query ? `?${query}` : ''}`);
    return (body?.data && typeof body.data === 'object') ? (body.data as Record<string, unknown>) : null;
}

export async function getAdminReports(): Promise<AdminReportSnapshot> {
    const body = await request(ADMIN_API_PATHS.adminReports);
    return typedData<AdminReportSnapshot>(body) ?? {
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
