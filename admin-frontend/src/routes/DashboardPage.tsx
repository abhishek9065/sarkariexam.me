import { useQuery } from '@tanstack/react-query';

import { OpsBadge, OpsCard, OpsErrorState, OpsSkeleton } from '../components/ops';
import { getAdminDashboard } from '../lib/api/client';

export function DashboardPage() {
    const query = useQuery({
        queryKey: ['admin-dashboard'],
        queryFn: () => getAdminDashboard(),
    });

    const data = query.data && typeof query.data === 'object' ? query.data as Record<string, unknown> : {};
    const metrics = [
        { label: 'Total Announcements', value: data.totalAnnouncements ?? data.total ?? '-' },
        { label: 'Pending Review', value: data.pendingReview ?? data.pending ?? '-' },
        { label: 'Active Sessions', value: data.activeSessions ?? '-' },
        { label: 'High Risk Alerts', value: data.highRiskEvents ?? data.highRisk ?? '-' },
    ];

    return (
        <>
            <OpsCard
                title="Operations Dashboard"
                description="Admin vNext shell is active with dedicated auth, session, and review boundaries."
                actions={<OpsBadge tone="info">Live Metrics</OpsBadge>}
            >
                {query.isPending ? <OpsSkeleton lines={2} /> : null}
                {query.error ? <OpsErrorState message="Failed to load dashboard metrics." /> : null}
                {!query.isPending && !query.error ? (
                    <div className="ops-kpi-grid">
                        {metrics.map((metric) => (
                            <div key={metric.label} className="ops-kpi-card">
                                <div className="ops-kpi-label">{metric.label}</div>
                                <div className="ops-kpi-value">{String(metric.value)}</div>
                            </div>
                        ))}
                    </div>
                ) : null}
            </OpsCard>

            <OpsCard title="Rollout Notes" description="Production guardrails for phased cutover.">
                <ul className="ops-list">
                    <li>Use command palette with Ctrl/Cmd + K for fast route jumps.</li>
                    <li>Use <code>/admin-legacy</code> as rollback entrypoint during cutover.</li>
                    <li>Session termination in vNext uses <code>/api/admin-auth</code> boundary.</li>
                </ul>
            </OpsCard>
        </>
    );
}
