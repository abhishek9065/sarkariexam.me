import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import type {
    AdminDashboardAction,
    AdminDashboardListData,
    AdminDashboardMetric,
    AdminDashboardMetricsData,
    AdminDashboardTrafficData,
    AdminDashboardWidget,
    AdminDashboardWidgetId,
} from '../types';
import { OpsCard, OpsEmptyState, OpsErrorState } from '../components/ops';
import { useAdminAuth } from '../app/useAdminAuth';
import { ModuleScaffold } from '../components/workspace';
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

function formatTimestamp(iso?: string): string {
    if (!iso) return 'No date';
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return iso;
    const diff = Math.abs(Date.now() - parsed.getTime());
    if (diff <= 7 * 24 * 60 * 60 * 1000) return formatRelativeTime(iso);
    return parsed.toLocaleDateString('en-IN');
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

function humanizeWidgetSource(source: string): string {
    return source
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function renderWidgetState<T>(widget: AdminDashboardWidget<T>, input?: {
    emptyIcon?: string;
    forbiddenIcon?: string;
    forbiddenTitle?: string;
}) {
    if (widget.status === 'error') {
        return <OpsErrorState message={widget.message || 'Failed to load dashboard data.'} />;
    }
    if (widget.status === 'forbidden') {
        return (
            <OpsEmptyState
                icon={input?.forbiddenIcon ?? 'Lock'}
                title={input?.forbiddenTitle ?? 'Locked'}
                description={widget.message || 'You do not have permission to view this section.'}
            />
        );
    }
    if (widget.status === 'empty' || !widget.data) {
        return (
            <OpsEmptyState
                icon={input?.emptyIcon}
                title={widget.emptyState.title}
                description={widget.message || widget.emptyState.description}
            />
        );
    }
    return null;
}

function WidgetMetaLine<T>({ widget }: { widget: AdminDashboardWidget<T> }) {
    const parts = [
        `Source: ${humanizeWidgetSource(widget.source)}`,
        widget.stale ? 'Cached snapshot may be stale' : `Updated ${formatRelativeTime(widget.updatedAt)}`,
    ];
    if (widget.status === 'ready' && widget.message) {
        parts.push(widget.message);
    }
    return <p className="dash-widget-meta-line">{parts.join(' · ')}</p>;
}

function WidgetActions<T>({
    widget,
    onNavigate,
}: {
    widget: AdminDashboardWidget<T>;
    onNavigate: (route?: string) => void;
}) {
    if (!widget.drilldown) return null;
    return (
        <button type="button" className="admin-btn subtle" onClick={() => onNavigate(widget.drilldown)}>
            Open
        </button>
    );
}

function MetricGrid({
    metrics,
    onNavigate,
}: {
    metrics: AdminDashboardMetric[];
    onNavigate: (route?: string) => void;
}) {
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

function ListWidget({
    widget,
    onNavigate,
}: {
    widget: AdminDashboardWidget<AdminDashboardListData>;
    onNavigate: (route?: string) => void;
}) {
    const state = renderWidgetState(widget, {
        emptyIcon: 'List',
        forbiddenIcon: 'Lock',
    });
    if (state) return state;

    return (
        <div className="dash-list">
            {widget.data!.items.map((item) => (
                <button
                    key={item.id}
                    type="button"
                    className="dash-list-item"
                    onClick={() => onNavigate(item.route)}
                    disabled={!item.route}
                >
                    <span className="dash-list-item-main">
                        <span className="dash-list-item-title">{item.title}</span>
                        <span className="dash-list-item-meta">
                            {[item.subtitle, item.meta].filter(Boolean).join(' · ') || 'No metadata'}
                        </span>
                    </span>
                    <span className="dash-list-item-side">{formatTimestamp(item.timestamp)}</span>
                </button>
            ))}
        </div>
    );
}

function TopContentWidget({
    widget,
    onNavigate,
}: {
    widget: AdminDashboardWidget<AdminDashboardListData>;
    onNavigate: (route?: string) => void;
}) {
    const state = renderWidgetState(widget, {
        emptyIcon: 'Post',
        forbiddenIcon: 'Lock',
        forbiddenTitle: 'Top content locked',
    });
    if (state) return state;

    return (
        <div className="dash-viewed-list">
            {widget.data!.items.map((item, index) => (
                <button
                    key={item.id}
                    type="button"
                    className="dash-viewed-item"
                    onClick={() => onNavigate(item.route)}
                    disabled={!item.route}
                >
                    <span className="dash-viewed-rank">{index + 1}</span>
                    <span className="dash-viewed-info">
                        <span className="dash-viewed-title">{item.title}</span>
                        <span className="dash-viewed-meta">
                            <span>{item.subtitle || 'Announcement'}</span>
                            <span>{item.meta || ''}</span>
                        </span>
                    </span>
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
        emptyIcon: 'Chart',
        forbiddenIcon: 'Lock',
        forbiddenTitle: 'Traffic locked',
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
                            onClick={() => onNavigate(widget.drilldown)}
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
                        onClick={() => onNavigate(widget.drilldown)}
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

function QuickActionsWidget({
    widget,
    onNavigate,
}: {
    widget: AdminDashboardWidget<{ items: AdminDashboardAction[] }>;
    onNavigate: (route?: string) => void;
}) {
    const state = renderWidgetState(widget, {
        emptyIcon: 'Bolt',
    });
    if (state) return state;

    return (
        <div className="dash-quick-action-grid">
            {widget.data!.items.map((action) => (
                <button
                    key={action.id}
                    type="button"
                    className="dash-quick-action"
                    onClick={() => onNavigate(action.route)}
                >
                    <span className="dash-quick-action-title">{action.label}</span>
                    <span className="dash-quick-action-copy">{action.description}</span>
                </button>
            ))}
        </div>
    );
}

function DashboardWidgetCard({
    widget,
    onNavigate,
}: {
    widget: AdminDashboardWidget<AdminDashboardMetricsData | AdminDashboardListData | AdminDashboardTrafficData | { items: AdminDashboardAction[] }>;
    onNavigate: (route?: string) => void;
}) {
    let content: JSX.Element | null = null;
    if (widget.kind === 'metrics') {
        const state = renderWidgetState(widget as AdminDashboardWidget<AdminDashboardMetricsData>, {
            emptyIcon: 'Chart',
            forbiddenIcon: 'Lock',
        });
        content = state || <MetricGrid metrics={(widget.data as AdminDashboardMetricsData).metrics} onNavigate={onNavigate} />;
    } else if (widget.kind === 'traffic') {
        content = <TrafficWidget widget={widget as AdminDashboardWidget<AdminDashboardTrafficData>} onNavigate={onNavigate} />;
    } else if (widget.kind === 'actions') {
        content = <QuickActionsWidget widget={widget as AdminDashboardWidget<{ items: AdminDashboardAction[] }>} onNavigate={onNavigate} />;
    } else if (widget.id === 'top-content') {
        content = <TopContentWidget widget={widget as AdminDashboardWidget<AdminDashboardListData>} onNavigate={onNavigate} />;
    } else {
        content = <ListWidget widget={widget as AdminDashboardWidget<AdminDashboardListData>} onNavigate={onNavigate} />;
    }

    return (
        <OpsCard
            title={widget.title}
            description={widget.description}
            actions={<WidgetActions widget={widget} onNavigate={onNavigate} />}
        >
            <WidgetMetaLine widget={widget} />
            {content}
        </OpsCard>
    );
}

export function DashboardPage() {
    const navigate = useNavigate();
    const { user } = useAdminAuth();
    const greeting = getGreeting();

    const dashboardQuery = useQuery({
        queryKey: ['admin-dashboard-v3'],
        queryFn: () => getAdminDashboard(),
        staleTime: 30_000,
    });

    const snapshot = dashboardQuery.data;
    const displayName = snapshot?.displayName || user?.email?.split('@')[0] || 'Admin';
    const generatedAt = snapshot?.generatedAt;
    const quickActions = snapshot?.widgets['quick-actions'].data?.items ?? [];
    const createPostAction = quickActions.find((action) => action.id === 'create-post');

    const navigateTo = (route?: string) => {
        if (route) navigate(route);
    };

    return (
        <ModuleScaffold
            eyebrow="Today"
            title="Dashboard"
            description="The editorial command desk for today’s assignments, approvals, incidents, and performance signals."
        >
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
                        {createPostAction ? (
                            <button type="button" className="admin-btn primary" onClick={() => navigateTo(createPostAction.route)}>
                                <span className="dash-btn-icon">+</span> {createPostAction.label}
                            </button>
                        ) : null}
                        {snapshot?.focus.primaryAction ? (
                            <button
                                type="button"
                                className={buttonClassForTone(snapshot.focus.primaryAction.tone)}
                                onClick={() => navigateTo(snapshot.focus.primaryAction.route)}
                            >
                                {snapshot.focus.primaryAction.label}
                            </button>
                        ) : null}
                        {snapshot?.focus.secondaryAction ? (
                            <button
                                type="button"
                                className={buttonClassForTone(snapshot.focus.secondaryAction.tone)}
                                onClick={() => navigateTo(snapshot.focus.secondaryAction.route)}
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
                <>
                    <DashboardWidgetCard widget={snapshot.widgets.summary} onNavigate={navigateTo} />

                    {snapshot.sections.map((section) => (
                        <section key={section.id} className="dash-section">
                            <header className="dash-section-header">
                                <div>
                                    <p className="dash-section-eyebrow">{section.id === 'my-work' ? 'My Work' : 'System Health'}</p>
                                    <h2 className="dash-section-title">{section.title}</h2>
                                    <p className="dash-section-copy">{section.description}</p>
                                </div>
                            </header>
                            <div className="dash-grid-2col">
                                {section.widgetIds.map((widgetId: AdminDashboardWidgetId) => (
                                    <DashboardWidgetCard
                                        key={widgetId}
                                        widget={snapshot.widgets[widgetId]}
                                        onNavigate={navigateTo}
                                    />
                                ))}
                            </div>
                        </section>
                    ))}

                    <DashboardWidgetCard widget={snapshot.widgets['quick-actions']} onNavigate={navigateTo} />
                </>
            ) : null}
        </ModuleScaffold>
    );
}
