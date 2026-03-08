import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { OpsCard, OpsErrorState } from '../components/ops';
import { getAdminAlerts, getAdminAuditLogs, getAdminDashboard, getAdminReports } from '../lib/api/client';
import { useAdminAuth } from '../app/useAdminAuth';

function formatRelativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function getGreeting(): { text: string; emoji: string } {
    const h = new Date().getHours();
    if (h < 6) return { text: 'Good night', emoji: '🌙' };
    if (h < 12) return { text: 'Good morning', emoji: '☀️' };
    if (h < 17) return { text: 'Good afternoon', emoji: '🌤️' };
    if (h < 21) return { text: 'Good evening', emoji: '🌆' };
    return { text: 'Good night', emoji: '🌙' };
}

const ACTION_ICONS: Record<string, string> = {
    create: '✨', update: '✏️', bulk_update: '📦', bulk_approve: '✅',
    bulk_reject: '❌', approve: '✅', reject: '❌', publish: '🚀',
    unpublish: '📤', archive: '🗂️', delete: '🗑️', announcement_draft_create: '📝',
    rollback: '⏪', role_update: '🔑', settings_update: '⚙️',
};

const TRAFFIC_SOURCE_COLORS: Record<string, string> = {
    seo: 'var(--accent)',
    direct: 'var(--info)',
    social: 'var(--warning)',
    referral: 'var(--success)',
    email: 'var(--accent-strong)',
    push: 'var(--danger)',
    in_app: 'var(--success)',
    unknown: 'var(--text-muted)',
};

function formatTrafficDayLabel(date: string): string {
    const parsed = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) return date;
    return parsed.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
}

export function DashboardPage() {
    const navigate = useNavigate();
    const { user } = useAdminAuth();
    const greeting = getGreeting();

    const dashboardQuery = useQuery({
        queryKey: ['admin-dashboard'],
        queryFn: () => getAdminDashboard(),
    });

    const reportsQuery = useQuery({
        queryKey: ['admin-reports'],
        queryFn: () => getAdminReports(),
    });

    const alertsQuery = useQuery({
        queryKey: ['admin-alerts-dashboard'],
        queryFn: () => getAdminAlerts({ status: 'open', limit: 10 }),
    });

    const activityQuery = useQuery({
        queryKey: ['admin-activity-feed'],
        queryFn: () => getAdminAuditLogs({ limit: 12 }),
        staleTime: 60_000,
    });

    const summary = reportsQuery.data?.summary;
    const topViewed = reportsQuery.data?.mostViewed24h ?? [];
    const deadlines = reportsQuery.data?.upcomingDeadlines ?? [];
    const trafficSeries = reportsQuery.data?.trafficSeries ?? [];
    const drilldowns = reportsQuery.data?.drilldowns ?? [];
    const workflowSummary = reportsQuery.data?.workflowSummary;
    const incidentSummary = reportsQuery.data?.incidentSummary;
    const openAlertsCount = alertsQuery.data?.meta?.total ?? alertsQuery.data?.data?.length ?? 0;

    const dashboardData = dashboardQuery.data && typeof dashboardQuery.data === 'object'
        ? dashboardQuery.data as Record<string, unknown>
        : {};

    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const urgentDeadlines = deadlines.filter((d) => d.deadline && new Date(d.deadline) <= threeDaysFromNow);

    const staleDrafts = summary?.pendingDrafts ?? 0;
    const brokenLinksCount = summary?.brokenLinks ?? 0;
    const needsReviewCount = summary?.pendingReview ?? dashboardData.pendingReview ?? 0;

    const isPending = dashboardQuery.isPending || reportsQuery.isPending || alertsQuery.isPending;
    const hasError = dashboardQuery.error || reportsQuery.error || alertsQuery.error;

    const quickStats: Array<{ label: string; value: number | string; tone?: string; route: string }> = [
        { label: 'Needs Review', value: Number(needsReviewCount), tone: Number(needsReviewCount) > 0 ? 'warning' : '', route: '/review' },
        { label: 'Broken Links', value: Number(brokenLinksCount), tone: Number(brokenLinksCount) > 0 ? 'danger' : '', route: '/link-manager' },
        { label: 'Deadlines Soon', value: urgentDeadlines.length, tone: urgentDeadlines.length > 0 ? 'warning' : '', route: '/alerts' },
        { label: 'Pending Drafts', value: Number(staleDrafts), tone: '', route: '/manage-posts' },
        { label: 'Total Posts', value: Number(summary?.totalPosts ?? dashboardData.totalAnnouncements ?? 0), tone: '', route: '/manage-posts' },
        { label: 'Open Alerts', value: Number(openAlertsCount), tone: Number(openAlertsCount) > 0 ? 'info' : '', route: '/alerts' },
    ];
    const cockpitCards = [
        { label: 'Unassigned Pending', value: workflowSummary?.unassignedPendingReview ?? dashboardData.workflowSummary?.unassignedPendingReview ?? 0, route: '/review?status=pending&assignee=unassigned', tone: 'warning' },
        { label: 'Overdue Review', value: workflowSummary?.overdueReviewItems ?? dashboardData.workflowSummary?.overdueReviewItems ?? 0, route: '/review?status=pending&sla=overdue', tone: 'danger' },
        { label: 'My Queue', value: workflowSummary?.currentUserAssignedQueue ?? dashboardData.workflowSummary?.assignedToCurrentUser ?? 0, route: '/queue?assignee=me', tone: 'info' },
        { label: 'Unresolved Errors', value: incidentSummary?.unresolvedErrorReports ?? dashboardData.workflowSummary?.unresolvedErrorReports ?? 0, route: '/errors?status=new', tone: 'warning' },
        { label: 'High-risk Sessions', value: incidentSummary?.highRiskSessions ?? dashboardData.workflowSummary?.highRiskSessions ?? 0, route: '/security?risk=high', tone: 'danger' },
        { label: 'Critical Alerts', value: incidentSummary?.openCriticalAlerts ?? dashboardData.workflowSummary?.openCriticalAlerts ?? 0, route: '/alerts?status=open&severity=critical', tone: 'danger' },
    ];

    const totalVisits = trafficSeries.reduce((sum, item) => sum + item.views, 0);
    const maxVisits = trafficSeries.reduce((max, item) => Math.max(max, item.views), 0);
    const trafficSources = (reportsQuery.data?.trafficSources ?? []).map((src) => ({
        ...src,
        color: TRAFFIC_SOURCE_COLORS[src.source] ?? TRAFFIC_SOURCE_COLORS.unknown,
    }));
    const hasTrafficData = totalVisits > 0 && (trafficSeries.some((item) => item.views > 0) || trafficSources.some((item) => item.views > 0));
    const donutGradient = trafficSources.reduce((acc, src, i) => {
        const start = trafficSources.slice(0, i).reduce((sum, item) => sum + item.percentage, 0);
        const end = start + src.percentage;
        return acc + `${src.color} ${start * 3.6}deg ${end * 3.6}deg, `;
    }, '').slice(0, -2);

    const displayName = user?.email?.split('@')[0] || 'Admin';

    return (
        <>
            {/* ─── Welcome Hero ─── */}
            <div className="ops-card dash-hero-card">
                <div className="dash-hero-header">
                    <div>
                        <div className="dash-hero-title">
                            {greeting.emoji} {greeting.text}, {displayName}
                        </div>
                        <p className="dash-hero-subtitle">
                            {now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            {' · '}
                            <span className="ops-live-dot dash-live-dot" />
                            <span className="dash-system-online">System online</span>
                        </p>
                    </div>
                    <div className="dash-quick-actions">
                        <Link className="admin-btn primary" to="/create-post">
                            <span className="dash-btn-icon">+</span> New Post
                        </Link>
                        <Link className="admin-btn subtle" to="/result">Result</Link>
                        <Link className="admin-btn subtle" to="/admit-card">Admit Card</Link>
                        <Link className="admin-btn ghost" to="/answer-key">Answer Key</Link>
                    </div>
                </div>
            </div>

            {/* ─── KPI Metrics ─── */}
            {isPending ? (
                <div className="ops-kpi-grid">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="ops-kpi-card">
                            <div className="ops-skeleton line short" />
                            <div className="ops-skeleton line medium" />
                        </div>
                    ))}
                </div>
            ) : null}
            {hasError ? <OpsErrorState message="Failed to load dashboard metrics." /> : null}
            {!isPending && !hasError ? (
                <div className="ops-kpi-grid">
                    {quickStats.map((metric) => (
                        <button
                            key={metric.label}
                            type="button"
                            className="ops-kpi-card"
                            onClick={() => navigate(metric.route)}
                        >
                            <div className="ops-kpi-label">{metric.label}</div>
                            <div className={`ops-kpi-value${metric.tone ? ` ops-kpi-${metric.tone}` : ''}`}>
                                {metric.value}
                                {metric.tone === 'danger' && Number(metric.value) > 0 ? (
                                    <span className="ops-status-chip expired">Fix</span>
                                ) : null}
                            {metric.tone === 'warning' && Number(metric.value) > 0 ? (
                                <span className="ops-status-chip review">!</span>
                            ) : null}
                        </div>
                        </button>
                    ))}
                </div>
            ) : null}

            {!isPending && !hasError ? (
                <OpsCard title="Operator Cockpit" description="Drill directly into queue ownership, incidents, and active worklists.">
                    <div className="ops-kpi-grid">
                        {(drilldowns.length > 0 ? drilldowns : cockpitCards).map((card) => (
                            <button
                                key={card.label}
                                type="button"
                                className="ops-kpi-card"
                                onClick={() => navigate(card.route)}
                            >
                                <div className="ops-kpi-label">{card.label}</div>
                                <div className={`ops-kpi-value${card.tone ? ` ops-kpi-${card.tone}` : ''}`}>{card.count ?? card.value ?? 0}</div>
                            </button>
                        ))}
                    </div>
                </OpsCard>
            ) : null}

            {/* ─── Two-Column: Traffic + Most Viewed ─── */}
            <div className="dash-grid-2col">
                <div className="ops-card">
                    <div className="ops-card-header">
                        <div>
                            <h2 className="ops-card-title">Traffic Overview</h2>
                            <p className="ops-card-description">
                                Last 7 days &middot; {hasTrafficData ? `${totalVisits.toLocaleString()} total visits` : 'Waiting for traffic events'}
                            </p>
                        </div>
                    </div>
                    {reportsQuery.isPending ? (
                        <div className="dash-traffic-layout">
                            <div className="dash-donut-wrap">
                                <div className="dash-donut-chart ops-skeleton" />
                            </div>
                            <div className="ops-chart-container dash-traffic-chart">
                                {Array.from({ length: 7 }).map((_, index) => (
                                    <div key={index} className="ops-chart-bar-wrap">
                                        <div className="ops-skeleton line short" />
                                        <div className="ops-chart-bar" ref={(el) => { if (el) el.style.height = `${25 + index * 8}%`; }} />
                                        <div className="ops-skeleton line short" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}
                    {!reportsQuery.isPending && !hasTrafficData ? (
                        <div className="ops-empty-state">
                            <div className="ops-empty-state-icon">📈</div>
                            <div className="ops-empty-state-title">No traffic data yet</div>
                            <div className="ops-empty-state-description">Traffic charts will populate after announcement views are recorded.</div>
                        </div>
                    ) : null}
                    {!reportsQuery.isPending && hasTrafficData ? (
                        <>
                            <div className="dash-traffic-layout">
                                <div className="dash-donut-wrap">
                                    <div
                                        className="dash-donut-chart"
                                        ref={(el) => {
                                            if (el) {
                                                el.style.background = donutGradient
                                                    ? `conic-gradient(${donutGradient})`
                                                    : 'conic-gradient(var(--text-muted) 0deg 360deg)';
                                            }
                                        }}
                                    />
                                    <div className="dash-donut-center">
                                        <span className="dash-donut-label">SOURCES</span>
                                    </div>
                                </div>
                                <div className="ops-chart-container dash-traffic-chart">
                                    {trafficSeries.map((item) => {
                                        const pct = maxVisits > 0 ? `${Math.max(4, (item.views / maxVisits) * 100)}%` : '4%';
                                        return (
                                            <div key={item.date} className="ops-chart-bar-wrap" title={`${item.views} visits`}>
                                                <div className="ops-chart-bar-value">{item.views.toLocaleString()}</div>
                                                <div className="ops-chart-bar" ref={(el) => { if (el) el.style.height = pct; }}></div>
                                                <div className="ops-chart-label">{formatTrafficDayLabel(item.date)}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="dash-traffic-legend">
                                {trafficSources.map((src) => (
                                    <div key={src.source} className="dash-traffic-legend-item">
                                        <span
                                            className="dash-traffic-legend-dot"
                                            ref={(el) => { if (el) el.style.background = src.color; }}
                                        />
                                        {src.label} <strong className="dash-traffic-legend-value">{src.percentage}%</strong>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : null}
                </div>

                <OpsCard title="Most Viewed" description="Top content by 24h window.">
                    {reportsQuery.isPending ? (
                        <div className="ops-skeleton-table">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="ops-skeleton-table-row">
                                    <div className="ops-skeleton line" />
                                    <div className="ops-skeleton line" />
                                </div>
                            ))}
                        </div>
                    ) : null}
                    {!reportsQuery.isPending && topViewed.length === 0 ? (
                        <div className="ops-empty-state">
                            <div className="ops-empty-state-icon">📊</div>
                            <div className="ops-empty-state-title">No traffic data yet</div>
                            <div className="ops-empty-state-description">Post views will appear here once content is published.</div>
                        </div>
                    ) : null}
                    {topViewed.length > 0 ? (
                        <div className="dash-viewed-list">
                            {topViewed.slice(0, 8).map((item, index) => (
                                <div key={item.id} className="dash-viewed-item">
                                    <span className="dash-viewed-rank">{index + 1}</span>
                                    <div className="dash-viewed-info">
                                        <span className="dash-viewed-title">{item.title}</span>
                                        <span className="dash-viewed-meta">
                                            <span className="ops-status-chip published">{item.type}</span>
                                            {item.views} views
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : null}
                </OpsCard>
            </div>

            {/* ─── Recent Activity Feed ─── */}
            <OpsCard title="Recent Activity" description="Latest admin actions from the audit log.">
                {activityQuery.isPending ? (
                    <div className="dash-activity-list">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="dash-activity-item">
                                <div className="ops-skeleton-shimmer ops-skeleton-line short" />
                                <div className="ops-skeleton-shimmer ops-skeleton-line medium" />
                            </div>
                        ))}
                    </div>
                ) : null}
                {!activityQuery.isPending && (!activityQuery.data || activityQuery.data.length === 0) ? (
                    <div className="ops-empty-state">
                        <div className="ops-empty-state-icon">{'\uD83D\uDCCB'}</div>
                        <div className="ops-empty-state-title">No recent activity</div>
                        <div className="ops-empty-state-description">Admin actions will appear here as they happen.</div>
                    </div>
                ) : null}
                {activityQuery.data && activityQuery.data.length > 0 ? (
                    <div className="dash-activity-list">
                        {activityQuery.data.slice(0, 10).map((log, idx) => {
                            const actionLabels: Record<string, string> = {
                                create: 'Created post',
                                update: 'Updated post',
                                bulk_update: 'Bulk updated',
                                bulk_approve: 'Bulk approved',
                                bulk_reject: 'Bulk rejected',
                                approve: 'Approved',
                                reject: 'Rejected',
                                publish: 'Published',
                                unpublish: 'Unpublished',
                                archive: 'Archived',
                                delete: 'Deleted',
                                announcement_draft_create: 'Created draft',
                                rollback: 'Restored revision',
                                role_update: 'Updated role',
                                settings_update: 'Updated settings',
                            };
                            const actionLabel = actionLabels[log.action ?? ''] ?? log.action ?? 'Unknown action';
                            const metadataValue = (log as { metadata?: unknown }).metadata;
                            const meta = metadataValue && typeof metadataValue === 'object'
                                ? metadataValue as Record<string, unknown>
                                : undefined;
                            const targetTitle = typeof meta?.title === 'string' ? meta.title : null;
                            return (
                                <div key={log.id ?? idx} className="dash-activity-item">
                                    <span className="dash-activity-dot" title={log.action ?? ''}>
                                        {ACTION_ICONS[log.action ?? ''] ?? '📋'}
                                    </span>
                                    <div className="dash-activity-body">
                                        <span className="dash-activity-action">
                                            {actionLabel}
                                            {targetTitle ? <> — <strong>{targetTitle}</strong></> : null}
                                        </span>
                                        <span className="dash-activity-meta">
                                            {log.actorEmail ? (
                                                <span className="dash-activity-actor">
                                                    <span className="dash-activity-avatar">
                                                        {log.actorEmail.charAt(0).toUpperCase()}
                                                    </span>
                                                    {log.actorEmail}
                                                </span>
                                            ) : null}
                                            {log.createdAt ? <time className="dash-activity-time">{formatRelativeTime(log.createdAt)}</time> : null}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : null}
            </OpsCard>

            {/* ─── Deadlines ─── */}
            <OpsCard title="Upcoming Deadlines" description="Application/exam deadlines in next 7 days.">
                {reportsQuery.isPending ? (
                    <div className="ops-skeleton-table">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="ops-skeleton-table-row">
                                <div className="ops-skeleton line" />
                                <div className="ops-skeleton line" />
                                <div className="ops-skeleton line" />
                                <div className="ops-skeleton line" />
                            </div>
                        ))}
                    </div>
                ) : null}
                {!reportsQuery.isPending && deadlines.length === 0 ? (
                    <div className="ops-empty-state">
                        <div className="ops-empty-state-icon">📅</div>
                        <div className="ops-empty-state-title">No upcoming deadlines</div>
                        <div className="ops-empty-state-description">Posts with deadlines in the next 7 days will appear here.</div>
                    </div>
                ) : null}
                {deadlines.length > 0 ? (
                    <div className="ops-table-wrap">
                        <table className="ops-table">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Deadline</th>
                                    <th>Urgency</th>
                                </tr>
                            </thead>
                            <tbody>
                                {deadlines.slice(0, 10).map((item) => {
                                    const isUrgent = item.deadline && new Date(item.deadline) <= threeDaysFromNow;
                                    return (
                                        <tr key={item.id} className={isUrgent ? 'ops-row-highlight' : ''}>
                                            <td><strong>{item.title}</strong></td>
                                            <td>{item.deadline ? new Date(item.deadline).toLocaleDateString() : '\u2014'}</td>
                                            <td>
                                                {isUrgent
                                                    ? <span className="ops-status-chip expired">Urgent</span>
                                                    : <span className="ops-status-chip scheduled">Upcoming</span>
                                                }
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : null}
            </OpsCard>
        </>
    );
}
