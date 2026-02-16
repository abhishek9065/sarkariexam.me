import { useQuery } from '@tanstack/react-query';

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
        <div className="admin-card">
            <h2>Analytics</h2>
            <p className="admin-muted">Operational analytics summary for review and publish planning.</p>
            {query.isPending ? <div>Loading analytics...</div> : null}
            {query.error ? <div style={{ color: '#b91c1c' }}>Failed to load analytics overview.</div> : null}
            {!query.isPending && !query.error ? (
                <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                    {cards.map((card) => (
                        <div key={card.label} className="admin-card" style={{ marginBottom: 0, background: '#f8fbfd' }}>
                            <div className="admin-muted" style={{ fontSize: 12 }}>{card.label}</div>
                            <div style={{ fontSize: 22, fontWeight: 700 }}>{card.value}</div>
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
