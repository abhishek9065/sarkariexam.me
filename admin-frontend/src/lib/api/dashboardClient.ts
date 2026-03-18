import type { AdminDashboardSnapshot, AdminReportSnapshot } from '../../types';
import { request, typedData } from './core';
import { ADMIN_API_PATHS } from './paths';

const EMPTY_TS = new Date(0).toISOString();

const emptyDashboardSnapshot: AdminDashboardSnapshot = {
    generatedAt: EMPTY_TS,
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
    sections: [
        {
            id: 'my-work',
            title: 'My Work',
            description: 'Assigned queue, pending approvals, my deadlines, and my recent changes.',
            widgetIds: ['my-queue', 'pending-approvals', 'my-deadlines', 'recent-changes'],
        },
        {
            id: 'system-health',
            title: 'System Health',
            description: 'Alerts, security, audit, and platform signals.',
            widgetIds: ['alerts', 'security', 'audit', 'traffic', 'top-content'],
        },
    ],
    widgets: {
        summary: {
            id: 'summary',
            title: 'Operations Snapshot',
            description: 'Current content, audience, and platform totals.',
            kind: 'metrics',
            status: 'empty',
            updatedAt: EMPTY_TS,
            source: 'mixed',
            stale: false,
            emptyState: {
                title: 'Overview unavailable',
                description: 'Summary metrics are unavailable for this role.',
            },
            message: 'Dashboard data unavailable.',
            data: { metrics: [] },
        },
        'my-queue': {
            id: 'my-queue',
            title: 'My Queue',
            description: 'Assigned queue and review pressure tied to your account.',
            kind: 'metrics',
            status: 'empty',
            updatedAt: EMPTY_TS,
            source: 'announcements',
            stale: false,
            emptyState: {
                title: 'Queue is clear',
                description: 'No assigned or pending queue work right now.',
            },
            data: { metrics: [] },
        },
        'pending-approvals': {
            id: 'pending-approvals',
            title: 'Pending Approvals',
            description: 'Approval load, expiry pressure, and execution backlog.',
            kind: 'metrics',
            status: 'forbidden',
            updatedAt: EMPTY_TS,
            source: 'admin_approval_requests',
            stale: false,
            emptyState: {
                title: 'Approvals are clear',
                description: 'No approval backlog is waiting on this role.',
            },
            permission: 'announcements:approve',
            data: null,
            message: 'Approval access is required to view pending approvals.',
        },
        'my-deadlines': {
            id: 'my-deadlines',
            title: 'My Deadlines',
            description: 'Upcoming deadlines for content already assigned to you.',
            kind: 'list',
            status: 'forbidden',
            updatedAt: EMPTY_TS,
            source: 'announcements',
            stale: false,
            emptyState: {
                title: 'No deadlines due',
                description: 'No assigned deadlines are due in the next 7 days.',
            },
            permission: 'announcements:read',
            data: null,
            message: 'Announcement access is required to view upcoming deadlines.',
        },
        'recent-changes': {
            id: 'recent-changes',
            title: 'My Recent Changes',
            description: 'Your latest content and administrative changes.',
            kind: 'list',
            status: 'forbidden',
            updatedAt: EMPTY_TS,
            source: 'announcements',
            stale: false,
            emptyState: {
                title: 'No recent changes',
                description: 'Your recent changes will appear here after the next update.',
            },
            permission: 'announcements:read',
            data: null,
            message: 'Announcement access is required to view your recent changes.',
        },
        alerts: {
            id: 'alerts',
            title: 'Alerts',
            description: 'Open alerts, critical issues, and unresolved errors.',
            kind: 'metrics',
            status: 'empty',
            updatedAt: EMPTY_TS,
            source: 'mixed',
            stale: false,
            emptyState: {
                title: 'No active alerts',
                description: 'There are no open alerts or unresolved error spikes right now.',
            },
            data: { metrics: [] },
        },
        security: {
            id: 'security',
            title: 'Security',
            description: 'Risky sessions and blocked or suspicious activity.',
            kind: 'metrics',
            status: 'forbidden',
            updatedAt: EMPTY_TS,
            source: 'security_logs',
            stale: false,
            emptyState: {
                title: 'Security is calm',
                description: 'No active session anomalies or blocked events were detected.',
            },
            permission: 'security:read',
            data: null,
            message: 'Security access is required to view risky activity.',
        },
        audit: {
            id: 'audit',
            title: 'Audit Activity',
            description: 'Recent administrative actions across the control plane.',
            kind: 'list',
            status: 'forbidden',
            updatedAt: EMPTY_TS,
            source: 'admin_audit_logs',
            stale: false,
            emptyState: {
                title: 'No audit activity',
                description: 'Administrative activity will appear here as actions are recorded.',
            },
            permission: 'audit:read',
            data: null,
            message: 'Audit access is required to view recent administrative activity.',
        },
        traffic: {
            id: 'traffic',
            title: 'Traffic Overview',
            description: 'Seven-day traffic and source mix for the public platform.',
            kind: 'traffic',
            status: 'forbidden',
            updatedAt: EMPTY_TS,
            source: 'analytics_rollups',
            stale: false,
            emptyState: {
                title: 'No traffic data yet',
                description: 'Traffic charts will populate after announcement views are recorded.',
            },
            permission: 'analytics:read',
            data: null,
            message: 'Analytics access is required to view traffic trends.',
        },
        'top-content': {
            id: 'top-content',
            title: 'Top Content',
            description: 'Most-viewed announcements in the last 24 hours.',
            kind: 'list',
            status: 'forbidden',
            updatedAt: EMPTY_TS,
            source: 'announcement_views',
            stale: false,
            emptyState: {
                title: 'No viewed posts yet',
                description: 'Top content will appear after public traffic events are recorded.',
            },
            permission: 'analytics:read',
            data: null,
            message: 'Analytics access is required to view top content.',
        },
        'quick-actions': {
            id: 'quick-actions',
            title: 'Quick Actions',
            description: 'Only modules this role can successfully open are shown here.',
            kind: 'actions',
            status: 'empty',
            updatedAt: EMPTY_TS,
            source: 'modules',
            stale: false,
            emptyState: {
                title: 'No actions available',
                description: 'No quick actions are currently available for this role.',
            },
            data: { items: [] },
        },
    },
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
