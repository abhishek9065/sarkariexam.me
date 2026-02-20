import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { OpsCard, OpsErrorState, OpsSkeleton } from '../components/ops';
import { getAdminAlerts, getAdminDashboard, getAdminReports } from '../lib/api/client';

export function DashboardPage() {
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

    const quickStats = [
        { label: 'Needs Review', value: summary?.pendingReview ?? dashboardData.pendingReview ?? 0 },
        {
            label: 'Broken Links',
            value: brokenLinksCount > 0
                ? <span className="ops-badge danger">{brokenLinksCount} <Link to="/link-manager" className="ops-inline-muted">(Fix)</Link></span>
                : 0
        },
        { label: 'Deadlines in 3 days', value: urgentDeadlines.length },
        { label: 'Stale / Pending Drafts', value: staleDrafts },
        { label: 'Today Posts', value: summary?.totalPosts ?? dashboardData.totalAnnouncements ?? 0 },
        { label: 'Open Alerts', value: openAlertsCount },
    ];

    const quickActions = (
        <div className="ops-actions">
            <Link className="admin-btn primary" to="/create-post">New Job</Link>
            <Link className="admin-btn" to="/result">New Result</Link>
            <Link className="admin-btn" to="/admit-card">New Admit Card</Link>
        </div>
    );

    return (
        <>
            <OpsCard
                title="Operations Dashboard"
                description="Daily operations snapshot with shortcuts and deadline-aware workflow."
                actions={quickActions}
            >
                {dashboardQuery.isPending || reportsQuery.isPending || alertsQuery.isPending ? <OpsSkeleton lines={2} /> : null}
                {dashboardQuery.error || reportsQuery.error || alertsQuery.error ? <OpsErrorState message="Failed to load dashboard metrics." /> : null}
                {!dashboardQuery.isPending && !reportsQuery.isPending && !alertsQuery.isPending && !dashboardQuery.error && !reportsQuery.error && !alertsQuery.error ? (
                    <div className="ops-kpi-grid">
                        {quickStats.map((metric) => (
                            <div key={metric.label} className="ops-kpi-card">
                                <div className="ops-kpi-label">{metric.label}</div>
                                <div className="ops-kpi-value">{metric.value as import('react').ReactNode}</div>
                            </div>
                        ))}
                    </div>
                ) : null}
            </OpsCard>

            <OpsCard title="Most Viewed" description="Top content by traffic window.">
                {topViewed.length === 0 ? <div className="ops-empty">No top-viewed data available.</div> : (
                    <ul className="ops-list">
                        {topViewed.slice(0, 10).map((item) => (
                            <li key={item.id}>
                                <strong>{item.title}</strong> - {item.views} views ({item.type})
                            </li>
                        ))}
                    </ul>
                )}
            </OpsCard>

            <OpsCard title="Upcoming Deadlines" description="Application/exam deadlines in next 7 days.">
                {deadlines.length === 0 ? <div className="ops-empty">No upcoming deadlines.</div> : (
                    <ul className="ops-list">
                        {deadlines.slice(0, 10).map((item) => (
                            <li key={item.id}>
                                <strong>{item.title}</strong> - {item.deadline ? new Date(item.deadline).toLocaleString() : 'No deadline'}
                            </li>
                        ))}
                    </ul>
                )}
            </OpsCard>
        </>
    );
}
