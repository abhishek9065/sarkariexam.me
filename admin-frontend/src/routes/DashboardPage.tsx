import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { OpsCard, OpsErrorState } from '../components/ops';
import { getAdminAlerts, getAdminAuditLogs, getAdminDashboard, getAdminReports } from '../lib/api/client';

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

export function DashboardPage() {
    const navigate = useNavigate();

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
    const openAlertsCount = alertsQuery.data?.meta?.total ?? alertsQuery.data?.data?.length ?? 0;

    const dashboardData = dashboardQuery.data && typeof dashboardQuery.data === 'object'
        ? dashboardQuery.data as Record<string, unknown>
        : {};

    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const urgentDeadlines = deadlines.filter((d) => d.deadline && new Date(d.deadline) <= threeDaysFromNow);

    const staleDrafts = summary?.pendingDrafts ?? dashboardData.pendingReview ?? 0;
    const brokenLinksCount = summary?.brokenLinks ?? 0;
    const needsReviewCount = summary?.pendingReview ?? dashboardData.pendingReview ?? 0;

    const isPending = dashboardQuery.isPending || reportsQuery.isPending || alertsQuery.isPending;
    const hasError = dashboardQuery.error || reportsQuery.error || alertsQuery.error;

    const quickStats: Array<{ label: string; value: number | string; tone?: string; route: string; trend?: { value: number, label: string } }> = [
        { label: 'Needs Review', value: Number(needsReviewCount), tone: Number(needsReviewCount) > 0 ? 'warning' : '', route: '/review', trend: { value: 12, label: 'this week' } },
        { label: 'Broken Links', value: Number(brokenLinksCount), tone: Number(brokenLinksCount) > 0 ? 'danger' : '', route: '/link-manager', trend: { value: -5, label: 'vs last week' } },
        { label: 'Deadlines Soon', value: urgentDeadlines.length, tone: urgentDeadlines.length > 0 ? 'warning' : '', route: '/alerts', trend: { value: 0, label: 'steady' } },
        { label: 'Pending Drafts', value: Number(staleDrafts), tone: '', route: '/manage-posts', trend: { value: -2, label: 'this month' } },
        { label: 'Today\u2019s Posts', value: Number(summary?.totalPosts ?? dashboardData.totalAnnouncements ?? 0), tone: '', route: '/manage-posts', trend: { value: 24, label: 'vs yesterday' } },
        { label: 'Open Alerts', value: Number(openAlertsCount), tone: Number(openAlertsCount) > 0 ? 'info' : '', route: '/alerts', trend: { value: 4, label: 'recent' } },
    ];

    const mockVisits = [450, 620, 580, 810, 1024, 940, 1150];
    const maxVisits = Math.max(...mockVisits);
    const totalVisits = mockVisits.reduce((a, b) => a + b, 0);

    return (
        <>
            {/* ─── Quick Actions Bar ─── */}
            <div className="dash-quick-actions">
                <Link className="admin-btn primary" to="/create-post">
                    <span className="dash-btn-icon">+</span> New Post
                </Link>
                <Link className="admin-btn subtle" to="/result">Result</Link>
                <Link className="admin-btn subtle" to="/admit-card">Admit Card</Link>
                <Link className="admin-btn ghost" to="/answer-key">Answer Key</Link>
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
                            {metric.trend && (
                                <div className={`ops-kpi-trend ${metric.trend.value > 0 ? 'positive' : metric.trend.value < 0 ? 'negative' : 'neutral'}`}>
                                    {metric.trend.value > 0 ? '\u2191' : metric.trend.value < 0 ? '\u2193' : '\u2014'} {Math.abs(metric.trend.value)}% {metric.trend.label}
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            ) : null}

            {/* ─── Two-Column: Traffic + Most Viewed ─── */}
            <div className="dash-grid-2col">
                <div className="ops-card">
                    <div className="ops-card-header">
                        <div>
                            <h2 className="ops-card-title">Traffic Overview</h2>
                            <p className="ops-card-description">Last 7 days &middot; {totalVisits.toLocaleString()} total visits</p>
                        </div>
                    </div>
                    <div className="ops-chart-container">
                        {mockVisits.map((val, i) => {
                            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                            const pct = `${Math.max(4, (val / maxVisits) * 100)}%`;
                            return (
                                <div key={i} className="ops-chart-bar-wrap" title={`${val} visits`}>
                                    <div className="ops-chart-bar" ref={(el) => { if (el) el.style.height = pct; }}></div>
                                    <div className="ops-chart-label">{days[i]}</div>
                                </div>
                            );
                        })}
                    </div>
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
                        {activityQuery.data.slice(0, 10).map((log, idx) => (
                            <div key={log.id ?? idx} className="dash-activity-item">
                                <span className="dash-activity-dot" />
                                <div className="dash-activity-body">
                                    <span className="dash-activity-action">{log.action ?? 'Unknown action'}</span>
                                    <span className="dash-activity-meta">
                                        {log.actorEmail ? <span className="dash-activity-actor">{log.actorEmail}</span> : null}
                                        {log.createdAt ? <time className="dash-activity-time">{formatRelativeTime(log.createdAt)}</time> : null}
                                    </span>
                                </div>
                            </div>
                        ))}
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
