import type { AdminDashboardSnapshot, AdminReportSnapshot } from '../../types';
import { request, typedData } from './core';
import { ADMIN_API_PATHS } from './paths';

const emptyDashboardSnapshot: AdminDashboardSnapshot = {
    generatedAt: new Date(0).toISOString(),
    displayName: 'Admin',
    role: 'viewer',
    permissions: {
        adminRead: true,
        adminWrite: false,
        analyticsRead: false,
        announcementsRead: false,
        announcementsWrite: false,
        announcementsApprove: false,
        auditRead: false,
        securityRead: false,
    },
    focus: {
        eyebrow: 'Dashboard',
        title: 'Dashboard data unavailable.',
        description: 'Refresh the page to load the current admin snapshot.',
    },
    summary: { status: 'empty', updatedAt: new Date(0).toISOString(), message: 'Dashboard data unavailable.', data: { metrics: [] } },
    workload: { status: 'empty', updatedAt: new Date(0).toISOString(), message: 'Dashboard data unavailable.', data: { metrics: [] } },
    incidents: { status: 'empty', updatedAt: new Date(0).toISOString(), message: 'Dashboard data unavailable.', data: { metrics: [], securityLocked: true } },
    traffic: { status: 'forbidden', updatedAt: new Date(0).toISOString(), permission: 'analytics:read', message: 'Analytics access is required to view traffic trends.', data: null },
    deadlines: { status: 'forbidden', updatedAt: new Date(0).toISOString(), permission: 'announcements:read', message: 'Announcement access is required to view upcoming deadlines.', data: null },
    activity: { status: 'forbidden', updatedAt: new Date(0).toISOString(), permission: 'audit:read', message: 'Audit access is required to view recent activity.', data: null },
    quickActions: { status: 'empty', updatedAt: new Date(0).toISOString(), message: 'Dashboard data unavailable.', data: { items: [] } },
};

export async function getAdminDashboard(): Promise<AdminDashboardSnapshot> {
    const body = await request(ADMIN_API_PATHS.adminDashboard);
    return typedData<AdminDashboardSnapshot>(body) ?? emptyDashboardSnapshot;
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
        trafficSeries: [],
        trafficSources: [],
        brokenLinkItems: [],
        workflowSummary: {
            unassignedPendingReview: 0,
            overdueReviewItems: 0,
            currentUserAssignedQueue: 0,
        },
        incidentSummary: {
            unresolvedErrorReports: 0,
            highRiskSessions: 0,
            openCriticalAlerts: 0,
        },
        drilldowns: [],
    };
}
