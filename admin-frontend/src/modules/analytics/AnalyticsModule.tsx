import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { OpsErrorState } from '../../components/ops';
import { ModuleScaffold } from '../../components/workspace';
import { getAnalyticsOverview } from '../../lib/api/client';
import { trackAdminTelemetry } from '../../lib/adminTelemetry';

const readNumber = (payload: Record<string, unknown> | null | undefined, key: string): number => {
    if (!payload) return 0;
    const value = payload[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
};

const readNestedNumber = (payload: Record<string, unknown> | null | undefined, path: string[]): number => {
    if (!payload) return 0;
    let current: unknown = payload;
    for (const key of path) {
        if (!current || typeof current !== 'object') return 0;
        current = (current as Record<string, unknown>)[key];
    }
    if (typeof current === 'number' && Number.isFinite(current)) return current;
    const parsed = Number(current ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
};

export function AnalyticsModule() {
    const [days, setDays] = useState(30);
    const [compareDays, setCompareDays] = useState(30);

    const query = useQuery({
        queryKey: ['analytics-overview', days, compareDays],
        queryFn: () => getAnalyticsOverview({ days, compareDays }),
    });

    const data = query.data;
    const anomalyList = useMemo(() => {
        const raw = data?.anomalies;
        return Array.isArray(raw) ? raw.slice(0, 4) : [];
    }, [data]);

    const ctrValue = readNestedNumber(data ?? null, ['insights', 'clickThroughRate']);
    const dropOffValue = readNestedNumber(data ?? null, ['insights', 'funnelDropRate']);

    const cards = [
        { label: 'Listing Views', value: readNumber(data ?? null, 'totalListingViews'), isPercent: false },
        { label: 'Card Clicks', value: readNumber(data ?? null, 'totalCardClicksInApp') || readNumber(data ?? null, 'totalCardClicks'), isPercent: false },
        { label: 'Bookmarks', value: readNumber(data ?? null, 'totalBookmarks'), isPercent: false },
        { label: 'Searches', value: readNumber(data ?? null, 'totalSearches'), isPercent: false },
        { label: 'CTR', value: ctrValue, isPercent: true },
        { label: 'Drop-off', value: dropOffValue, isPercent: true },
    ];

    return (
        <ModuleScaffold
            eyebrow="Audience & SEO"
            title="Analytics"
            description="High-density operations analytics with trend windows and anomaly lane."
            meta={<span>{days} day window compared with {compareDays} days.</span>}
            headerActions={(
                <button type="button" className="admin-btn subtle" onClick={() => void query.refetch()}>
                    Refresh
                </button>
            )}
            metrics={cards.map((card) => ({
                key: card.label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                label: card.label,
                value: card.isPercent
                    ? (card.value === 0 ? 'N/A' : `${card.value.toFixed(1)}%`)
                    : card.value.toLocaleString('en-IN'),
            }))}
            filters={{
                compact: true,
                controls: (
                    <>
                        <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
                            <option value={7}>Last 7 days</option>
                            <option value={14}>Last 14 days</option>
                            <option value={30}>Last 30 days</option>
                            <option value={60}>Last 60 days</option>
                            <option value={90}>Last 90 days</option>
                        </select>
                        <select value={compareDays} onChange={(event) => setCompareDays(Number(event.target.value))}>
                            <option value={7}>Compare 7 days</option>
                            <option value={14}>Compare 14 days</option>
                            <option value={30}>Compare 30 days</option>
                            <option value={60}>Compare 60 days</option>
                        </select>
                    </>
                ),
                actions: <span className="ops-inline-muted">Window: {days}d vs {compareDays}d</span>,
            }}
        >
            <div className="ops-stack">
                {query.isPending ? <div className="admin-alert info">Loading analytics...</div> : null}
                {query.error ? <OpsErrorState message="Failed to load analytics overview." /> : null}

                {!query.isPending && !query.error && anomalyList.length > 0 ? (
                    <div className="ops-card muted">
                        <h3 className="ops-card-title">Anomaly Lane</h3>
                        <ul className="ops-list">
                            {anomalyList.map((item, index) => {
                                const message = typeof item === 'object' && item && 'message' in item
                                    ? String((item as Record<string, unknown>).message)
                                    : 'Anomaly detected';
                                return (
                                    <li key={`${message}-${index}`}>
                                        <button
                                            type="button"
                                            className="admin-btn ghost"
                                            onClick={() => {
                                                void trackAdminTelemetry('admin_metric_drilldown_opened', {
                                                    module: 'analytics',
                                                    metric: message,
                                                    value: 1,
                                                    days,
                                                    compareDays,
                                                });
                                            }}
                                        >
                                            {message}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ) : null}
            </div>
        </ModuleScaffold>
    );
}
