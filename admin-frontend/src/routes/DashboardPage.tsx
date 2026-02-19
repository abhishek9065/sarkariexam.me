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

    const quickStats = [
        { label: 'Today Posts', value: summary?.totalPosts ?? dashboardData.totalAnnouncements ?? '-' },
        { label: 'Pending Drafts', value: summary?.pendingDrafts ?? dashboardData.pendingReview ?? '-' },
        { label: 'Scheduled Queue', value: summary?.scheduled ?? '-' },
        { label: 'Broken Links', value: summary?.brokenLinks ?? '-' },
        { label: 'Pending Review', value: summary?.pendingReview ?? '-' },
        { label: 'Open Alerts', value: openAlertsCount },
        { label: 'Expired', value: summary?.expired ?? '-' },
    ];

    return (
        <>
            <OpsCard title="Operations Dashboard" description="Daily operations snapshot with shortcuts and deadline-aware workflow.">
                {dashboardQuery.isPending || reportsQuery.isPending || alertsQuery.isPending ? <OpsSkeleton lines={2} /> : null}
                {dashboardQuery.error || reportsQuery.error || alertsQuery.error ? <OpsErrorState message="Failed to load dashboard metrics." /> : null}
                {!dashboardQuery.isPending && !reportsQuery.isPending && !alertsQuery.isPending && !dashboardQuery.error && !reportsQuery.error && !alertsQuery.error ? (
                    <>
                        <div className="ops-kpi-grid">
                            {quickStats.map((metric) => (
                                <div key={metric.label} className="ops-kpi-card">
                                    <div className="ops-kpi-label">{metric.label}</div>
                                    <div className="ops-kpi-value">{String(metric.value)}</div>
                                </div>
                            ))}
                        </div>
                        <div className="ops-actions">
                            <Link className="admin-btn primary" to="/create-post">New Job</Link>
                            <Link className="admin-btn" to="/result">New Result</Link>
                            <Link className="admin-btn" to="/admit-card">New Admit Card</Link>
                            <Link className="admin-btn" to="/answer-key">New Answer Key</Link>
                            <Link className="admin-btn subtle" to="/alerts">Alerts Feed</Link>
                        </div>
                    </>
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
