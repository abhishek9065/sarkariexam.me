import { useQuery } from '@tanstack/react-query';

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
            <div className="admin-card">
                <h2>Operations Dashboard</h2>
                <p className="admin-muted">Admin vNext shell is active with dedicated auth/session boundaries.</p>
                {query.isPending ? <div>Loading metrics...</div> : null}
                {query.error ? <div style={{ color: '#b91c1c' }}>Failed to load dashboard metrics.</div> : null}
                {!query.isPending && !query.error ? (
                    <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
                        {metrics.map((metric) => (
                            <div key={metric.label} className="admin-card" style={{ marginBottom: 0, background: '#f8fbfd' }}>
                                <div className="admin-muted" style={{ fontSize: 12 }}>{metric.label}</div>
                                <div style={{ fontSize: 22, fontWeight: 700 }}>{String(metric.value)}</div>
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>

            <div className="admin-card">
                <h2>Rollout Notes</h2>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                    <li>Use command palette with Ctrl/Cmd + K for fast route jumps.</li>
                    <li>Use <code>/admin-legacy</code> as rollback entrypoint during cutover.</li>
                    <li>Session termination in vNext uses the new <code>/api/admin-auth</code> boundary.</li>
                </ul>
            </div>
        </>
    );
}
