import { useQuery } from '@tanstack/react-query';

import { OpsCard, OpsErrorState } from '../../components/ops';
import { getAnalyticsOverview } from '../../lib/api/client';

const readValue = (payload: Record<string, unknown> | null, key: string) => {
    if (!payload) return '-';
    const value = payload[key];
    if (value === undefined || value === null) return '-';
    return String(value);
};

export function AnalyticsModule() {
    const query = useQuery({
        queryKey: ['analytics-overview'],
        queryFn: () => getAnalyticsOverview(),
    });

    const data = query.data;
    const cards = [
        { label: 'Listing Views', value: readValue(data, 'totalListingViews') },
        { label: 'Card Clicks', value: readValue(data, 'totalCardClicks') },
        { label: 'Bookmarks', value: readValue(data, 'totalBookmarks') },
        { label: 'Searches', value: readValue(data, 'totalSearches') },
    ];

    return (
        <OpsCard title="Analytics" description="Operational analytics summary for review and publish planning.">
            {query.isPending ? <div className="admin-alert info">Loading analytics...</div> : null}
            {query.error ? <OpsErrorState message="Failed to load analytics overview." /> : null}
            {!query.isPending && !query.error ? (
                <div className="ops-kpi-grid">
                    {cards.map((card) => (
                        <div key={card.label} className="ops-kpi-card">
                            <div className="ops-kpi-label">{card.label}</div>
                            <div className="ops-kpi-value">{card.value}</div>
                        </div>
                    ))}
                </div>
            ) : null}
        </OpsCard>
    );
}
