import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import type {
    AdminDashboardAction,
    AdminDashboardMetric,
    AdminDashboardTrafficData,
    AdminDashboardWidget,
} from '../types';
import { OpsCard, OpsEmptyState, OpsErrorState } from '../components/ops';
import { useAdminAuth } from '../app/useAdminAuth';
import { getAdminDashboard } from '../lib/api/client';

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

function formatRelativeTime(iso?: string): string {
    if (!iso) return 'just now';
    const diff = Date.now() - new Date(iso).getTime();
    const seconds = Math.floor(diff / 1000);
    if (!Number.isFinite(seconds) || seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 6) return 'Good night';
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 21) return 'Good evening';
    return 'Good night';
}

function formatTrafficDayLabel(date: string): string {
    const parsed = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) return date;
    return parsed.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
}

function formatMetricValue(value: number | string): string {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value.toLocaleString('en-IN') : '--';
    }
    return value;
}

function metricToneClass(tone?: string) {
    return tone ? ` ops-kpi-${tone}` : '';
}

function buttonClassForTone(tone?: string) {
    if (tone === 'danger') return 'admin-btn danger';
    if (tone === 'primary' || tone === 'success') return 'admin-btn primary';
    if (tone === 'warning') return 'admin-btn subtle';
    return 'admin-btn subtle';
}

function renderWidgetState<T>(widget: AdminDashboardWidget<T>, input: {
    emptyTitle: string;
    emptyDescription?: string;
    emptyIcon?: string;
    forbiddenTitle?: string;
    forbiddenIcon?: string;
}) {
    if (widget.status === 'error') {
        return <OpsErrorState message={widget.message || 'Failed to load dashboard data.'} />;
    }
    if (widget.status === 'forbidden') {
        return (
            <OpsEmptyState
                icon={input.forbiddenIcon ?? 'Lock'}
                title={input.forbiddenTitle ?? 'Locked'}
                description={widget.message || 'You do not have permission to view this section.'}
            />
        );
    }
    if (widget.status === 'empty' || !widget.data) {
        return (
            <OpsEmptyState
                icon={input.emptyIcon}
                title={input.emptyTitle}
                description={widget.message || input.emptyDescription}
            />
        );
    }
    return null;
}

function MetricGrid({ metrics, onNavigate }: { metrics: AdminDashboardMetric[]; onNavigate: (route?: string) => void }) {
    return (
        <div className="ops-kpi-grid">
            {metrics.map((metric) => (
                <button
                    key={metric.key}
                    type="button"
                    className="ops-kpi-card"
                    onClick={() => onNavigate(metric.route)}
                    disabled={!metric.route}
                >
                    <div className="ops-kpi-label">{metric.label}</div>
                    <div className={`ops-kpi-value${metricToneClass(metric.tone)}`}>
                        {formatMetricValue(metric.value)}
                    </div>
                    {metric.hint ? <div className="dash-widget-meta">{metric.hint}</div> : null}
                </button>
            ))}
        </div>
    );
}

function TrafficWidget({
    widget,
    onNavigate,
}: {
    widget: AdminDashboardWidget<AdminDashboardTrafficData>;
    onNavigate: (route?: string) => void;
}) {
    const state = renderWidgetState(widget, {
        emptyTitle: 'No traffic data yet',
        emptyDescription: 'Traffic charts will populate after announcement views are recorded.',
        emptyIcon: 'Chart',
        forbiddenTitle: 'Traffic locked',
        forbiddenIcon: 'Lock',
    });
    if (state) return state;

    const data = widget.data!;
    const totalVisits = data.totalVisits;
    const maxVisits = data.series.reduce((max, item) => Math.max(max, item.views), 0);
    const sources = data.sources.map((source) => ({
        ...source,
        color: TRAFFIC_SOURCE_COLORS[source.source] ?? TRAFFIC_SOURCE_COLORS.unknown,
    }));
    const donutGradient = sources.reduce((acc, source, index) => {
        const start = sources.slice(0, index).reduce((sum, item) => sum + item.percentage, 0);
        const end = start + source.percentage;
        return `${acc}${source.color} ${start * 3.6}deg ${end * 3.6}deg, `;
    }, '').slice(0, -2);

    return (
        <>
            <div className="dash-traffic-layout">
                <div className="dash-donut-wrap">
                    <div
                        className="dash-donut-chart"
                        style={{
                            background: donutGradient
                                ? `conic-gradient(${donutGradient})`
                                : 'conic-gradient(var(--text-muted) 0deg 360deg)',
                        }}
                    />
                    <div className="dash-donut-center">
                        <div>
                            <div className="dash-donut-label">Visits</div>
                            <strong>{totalVisits.toLocaleString('en-IN')}</strong>
                        </div>
                    </div>
                </div>
                <div className="ops-chart-container dash-traffic-chart">
                    {data.series.map((entry) => (
                        <button
                            key={entry.date}
                            type="button"
                            className="ops-chart-bar-wrap"
                            onClick={() => onNavigate('/reports')}
                        >
                            <div className="ops-chart-bar-value">{entry.views}</div>
                            <div
                                className="ops-chart-bar"
                                style={{
                                    height: maxVisits > 0 ? `${Math.max(10, Math.round((entry.views / maxVisits) * 100))}%` : '10%',
                                }}
                            />
                            <div className="ops-chart-label">{formatTrafficDayLabel(entry.date)}</div>
                        </button>
                    ))}
                </div>
            </div>
            <div className="dash-traffic-legend">
                {sources.map((source) => (
                    <button
                        key={source.source}
                        type="button"
                        className="dash-traffic-legend-item"
                        onClick={() => onNavigate('/reports')}
                    >
                        <span className="dash-traffic-legend-dot" style={{ background: source.color }} />
                        <span>{source.label}</span>
                        <strong className="dash-traffic-legend-value">{source.percentage}%</strong>
                    </button>
                ))}
            </div>
        </>
    );
}

function TopContentWidget({
    widget,
    onNavigate,
}: {
    widget: AdminDashboardWidget<AdminDashboardTrafficData>;
    onNavigate: (route?: string) => void;
}) {
    if (widget.status === 'error') {
        return <OpsErrorState message={widget.message || 'Failed to load top content.'} />;
    }
    if (widget.status === 'forbidden') {
        return (
            <OpsEmptyState
                icon="Lock"
                title="Top content locked"
                description={widget.message || 'Analytics access is required to view top content.'}
            />
        );
    }
    if (!widget.data || widget.data.topContent.length === 0) {
        return (
            <OpsEmptyState
                icon="Post"
                title="No viewed posts yet"
                description="Top viewed announcements will appear after traffic events are recorded."
            />
        );
    }

    return (
        <div className="dash-viewed-list">
            {widget.data.topContent.map((item, index) => (
                <button
                    key={item.id}
                    type="button"
                    className="dash-viewed-item"
                    onClick={() => onNavigate(`/detailed-post?focus=${encodeURIComponent(item.id)}`)}
                >
                    <span className="dash-viewed-rank">{index + 1}</span>
                    <span className="dash-viewed-info">
                        <span className="dash-viewed-title">{item.title}</span>
                        <span className="dash-viewed-meta">
                            <span>{item.organization || item.type}</span>
                            <span>{item.views.toLocaleString('en-IN')} views</span>
                        </span>
                    </span>
                </button>
            ))}
        </div>
    );
}

export function DashboardPage() {
    const navigate = useNavigate();
    const { user } = useAdminAuth();
    const greeting = getGreeting();

    const dashboardQuery = useQuery({
        queryKey: ['admin-dashboard-v2'],
        queryFn: () => getAdminDashboard(),
        staleTime: 60_000,
    });

    const snapshot = dashboardQuery.data;
    const displayName = snapshot?.displayName || user?.email?.split('@')[0] || 'Admin';
    const generatedAt = snapshot?.generatedAt;

    const navigateTo = (route?: string) => {
        if (route) navigate(route);
    };

    const quickActions = snapshot?.quickActions.data?.items ?? [];
    const summaryMetrics = snapshot?.summary.data?.metrics ?? [];
    const workloadMetrics = snapshot?.workload.data?.metrics ?? [];
    const incidentMetrics = snapshot?.incidents.data?.metrics ?? [];

    return (
        <>
            <div className="ops-card dash-hero-card">
                <div className="dash-hero-header">
                    <div>
                        <p className="dash-focus-eyebrow">{snapshot?.focus.eyebrow || 'Dashboard'}</p>
                        <h1 className="dash-page-title">Dashboard</h1>
                        <div className="dash-hero-title">{greeting}, {displayName}</div>
                        <p className="dash-focus-title">{snapshot?.focus.title || 'Load the current operator snapshot.'}</p>
                        <p className="dash-focus-copy">{snapshot?.focus.description || 'Refresh the page to reload dashboard data.'}</p>
                        <p className="dash-hero-subtitle">
                            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            {' · '}
                            <span className="ops-live-dot dash-live-dot" />
                            <span className="dash-system-online">System online</span>
                            {generatedAt ? ` · Updated ${formatRelativeTime(generatedAt)}` : ''}
                        </p>
                    </div>
                    <div className="dash-quick-actions">
                        {snapshot?.permissions.announcementsWrite ? (
                            <button type="button" className="admin-btn primary" onClick={() => navigate('/create-post')}>
                                <span className="dash-btn-icon">+</span> New Post
                            </button>
                        ) : null}
                        {snapshot?.focus.primaryAction ? (
                            <button
                                type="button"
                                className={buttonClassForTone(snapshot.focus.primaryAction.tone)}
                                onClick={() => navigateTo(snapshot.focus.primaryAction?.route)}
                            >
                                {snapshot.focus.primaryAction.label}
                            </button>
                        ) : null}
                        {snapshot?.focus.secondaryAction ? (
                            <button
                                type="button"
                                className={buttonClassForTone(snapshot.focus.secondaryAction.tone)}
                                onClick={() => navigateTo(snapshot.focus.secondaryAction?.route)}
                            >
                                {snapshot.focus.secondaryAction.label}
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>

            {dashboardQuery.isPending ? (
                <div className="ops-kpi-grid">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <div key={index} className="ops-kpi-card">
                            <div className="ops-skeleton line short" />
                            <div className="ops-skeleton line medium" />
                        </div>
                    ))}
                </div>
            ) : null}

            {dashboardQuery.error ? (
                <OpsErrorState message="Failed to load dashboard metrics." onRetry={() => void dashboardQuery.refetch()} />
            ) : null}

            {!dashboardQuery.isPending && !dashboardQuery.error && snapshot ? (
                <MetricGrid metrics={summaryMetrics} onNavigate={navigateTo} />
            ) : null}

            <div className="dash-grid-2col">
                <OpsCard
                    title="Operator Cockpit"
                    description="Queue ownership, approvals, and workload signals for your current role."
                >
                    {snapshot ? (
                        renderWidgetState(snapshot.workload, {
                            emptyTitle: 'Queue is clear',
                            emptyDescription: 'No active queue pressure right now.',
                            emptyIcon: 'Queue',
                            forbiddenTitle: 'Queue locked',
                            forbiddenIcon: 'Lock',
                        }) || <MetricGrid metrics={workloadMetrics} onNavigate={navigateTo} />
                    ) : null}
                </OpsCard>

                <OpsCard
                    title="Incident Strip"
                    description="Alerts, unresolved errors, and security pressure."
                    tone={snapshot?.incidents.data?.securityLocked ? 'muted' : 'default'}
                >
                    {snapshot ? (
                        <>
                            {renderWidgetState(snapshot.incidents, {
                                emptyTitle: 'No incidents',
                                emptyDescription: 'No active incidents or alert pressure right now.',
                                emptyIcon: 'Shield',
                            }) || <MetricGrid metrics={incidentMetrics} onNavigate={navigateTo} />}
                            {snapshot.incidents.data?.securityLocked ? (
                                <p className="dash-lock-note">High-risk session details stay hidden until security access is granted.</p>
                            ) : null}
                        </>
                    ) : null}
                </OpsCard>
            </div>

            <div className="dash-grid-2col">
                <OpsCard
                    title="Traffic Overview"
                    description={
                        snapshot?.traffic.data
                            ? `Last 7 days · ${snapshot.traffic.data.totalVisits.toLocaleString('en-IN')} total visits`
                            : 'Last 7 days'
                    }
                >
                    {snapshot ? <TrafficWidget widget={snapshot.traffic} onNavigate={navigateTo} /> : null}
                </OpsCard>

                <OpsCard
                    title="Most Viewed"
                    description="Top announcement traffic in the last 24 hours."
                >
                    {snapshot ? <TopContentWidget widget={snapshot.traffic} onNavigate={navigateTo} /> : null}
                </OpsCard>
            </div>

            <div className="dash-grid-2col">
                <OpsCard
                    title="Upcoming Deadlines"
                    description="Posts with deadlines inside the next 7 days."
                >
                    {snapshot ? (
                        renderWidgetState(snapshot.deadlines, {
                            emptyTitle: 'No deadlines due',
                            emptyDescription: 'No deadlines in the next 7 days.',
                            emptyIcon: 'Clock',
                            forbiddenTitle: 'Deadlines locked',
                            forbiddenIcon: 'Lock',
                        }) || (
                            <div className="dash-list">
                                {snapshot.deadlines.data?.items.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        className="dash-list-item"
                                        onClick={() => navigate(item.route)}
                                    >
                                        <span className="dash-list-item-main">
                                            <span className="dash-list-item-title">{item.title}</span>
                                            <span className="dash-list-item-meta">{item.organization || item.type}</span>
                                        </span>
                                        <span className="dash-list-item-side">
                                            {item.deadline ? new Date(item.deadline).toLocaleDateString('en-IN') : 'No date'}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )
                    ) : null}
                </OpsCard>

                <OpsCard
                    title="Recent Activity"
                    description="Latest administrative actions recorded in the audit ledger."
                >
                    {snapshot ? (
                        renderWidgetState(snapshot.activity, {
                            emptyTitle: 'No recent activity',
                            emptyDescription: 'No recent audit activity yet.',
                            emptyIcon: 'Log',
                            forbiddenTitle: 'Activity locked',
                            forbiddenIcon: 'Lock',
                        }) || (
                            <div className="dash-activity-list">
                                {snapshot.activity.data?.items.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        className="dash-activity-item"
                                        onClick={() => navigateTo(item.route)}
                                    >
                                        <span className="dash-activity-dot">A</span>
                                        <span className="dash-activity-body">
                                            <span className="dash-activity-action">{item.title}</span>
                                            <span className="dash-activity-meta">
                                                <span className="dash-activity-actor">{item.subtitle || 'System'}</span>
                                                <span className="dash-activity-time">{formatRelativeTime(item.createdAt)}</span>
                                            </span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )
                    ) : null}
                </OpsCard>
            </div>

            <OpsCard
                title="Quick Actions"
                description="Jump straight into the modules this role can operate."
            >
                {snapshot ? (
                    renderWidgetState(snapshot.quickActions, {
                        emptyTitle: 'No actions available',
                        emptyDescription: 'No quick actions are available for this role yet.',
                        emptyIcon: 'Bolt',
                    }) || (
                        <div className="dash-quick-action-grid">
                            {quickActions.map((action: AdminDashboardAction) => (
                                <button
                                    key={action.id}
                                    type="button"
                                    className="dash-quick-action"
                                    onClick={() => navigate(action.route)}
                                >
                                    <span className="dash-quick-action-title">{action.label}</span>
                                    <span className="dash-quick-action-copy">{action.description}</span>
                                </button>
                            ))}
                        </div>
                    )
                ) : null}
            </OpsCard>
        </>
    );
}
