import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { OpsCard, OpsErrorState } from '../components/ops';
import { getAdminAlerts, getAdminDashboard, getAdminReports } from '../lib/api/client';

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

    const quickStats: Array<{ label: string; value: number | string; tone?: string; route: string }> = [
        { label: 'Needs Review', value: Number(needsReviewCount), tone: Number(needsReviewCount) > 0 ? 'warning' : '', route: '/review' },
        { label: 'Broken Links', value: Number(brokenLinksCount), tone: Number(brokenLinksCount) > 0 ? 'danger' : '', route: '/link-manager' },
        { label: 'Deadlines in 3 days', value: urgentDeadlines.length, tone: urgentDeadlines.length > 0 ? 'warning' : '', route: '/alerts' },
        { label: 'Stale / Pending Drafts', value: Number(staleDrafts), tone: '', route: '/manage-posts' },
        { label: 'Today Posts', value: Number(summary?.totalPosts ?? dashboardData.totalAnnouncements ?? 0), tone: '', route: '/manage-posts' },
        { label: 'Open Alerts', value: Number(openAlertsCount), tone: Number(openAlertsCount) > 0 ? 'info' : '', route: '/alerts' },
    ];

    return (
        <>
            <OpsCard
                title="Operations Dashboard"
                description="Daily operations snapshot with shortcuts and deadline-aware workflow."
                actions={
                    <div className="ops-actions">
                        <Link className="admin-btn primary" to="/create-post">New Job</Link>
                        <Link className="admin-btn" to="/result">New Result</Link>
                        <Link className="admin-btn" to="/admit-card">New Admit Card</Link>
                        <Link className="admin-btn ghost" to="/answer-key">Answer Key</Link>
                    </div>
                }
            >
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
            </OpsCard>

            <OpsCard title="Most Viewed" description="Top content by traffic window.">
                {reportsQuery.isPending ? (
                    <div className="ops-skeleton-table">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="ops-skeleton-table-row">
                                <div className="ops-skeleton line" />
                                <div className="ops-skeleton line" />
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
                        <div className="ops-empty-state-description">Post views will appear here once content is published and receiving traffic.</div>
                    </div>
                ) : null}
                {topViewed.length > 0 ? (
                    <div className="ops-table-wrap">
                        <table className="ops-table">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Views</th>
                                    <th>Type</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topViewed.slice(0, 10).map((item) => (
                                    <tr key={item.id}>
                                        <td><strong>{item.title}</strong></td>
                                        <td>{item.views}</td>
                                        <td><span className="ops-status-chip published">{item.type}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : null}
            </OpsCard>

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
                        <div className="ops-empty-state-description">Posts with application or exam deadlines in the next 7 days will appear here.</div>
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
                                            <td>{item.deadline ? new Date(item.deadline).toLocaleDateString() : '—'}</td>
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
