import { useState, useEffect, useMemo, useCallback } from 'react';
import './AnalyticsDashboard.css';

const apiBase = import.meta.env.VITE_API_BASE ?? '';

interface AnalyticsData {
    totalAnnouncements: number;
    totalViews: number;
    totalEmailSubscribers: number;
    totalPushSubscribers: number;
    totalSearches: number;
    totalBookmarks: number;
    totalRegistrations: number;
    totalSubscriptionsVerified: number;
    totalSubscriptionsUnsubscribed: number;
    totalListingViews: number;
    totalCardClicks: number;
    totalCategoryClicks: number;
    totalFilterApplies: number;
    totalDigestClicks?: number;
    totalDeepLinkClicks?: number;
    rollupLastUpdatedAt?: string | null;
    dailyRollups?: Array<{
        date: string;
        count: number;
        views: number;
        listingViews: number;
        cardClicks: number;
        categoryClicks: number;
        filterApplies: number;
        searches: number;
        bookmarkAdds: number;
        registrations: number;
    }>;
    engagementWindowDays?: number;
    typeBreakdown: { type: string; count: number }[];
    categoryBreakdown: { category: string; count: number }[];
    funnel?: {
        listingViews: number;
        cardClicks: number;
        detailViews: number;
        detailViewsRaw?: number;
        detailViewsAdjusted?: number;
        hasAnomaly?: boolean;
        bookmarkAdds: number;
        subscriptionsVerified: number;
    };
    ctrByType?: Array<{
        type: string;
        listingViews: number;
        cardClicks: number;
        ctr: number;
    }>;
    digestClicks?: {
        total: number;
        variants: Array<{ variant: string; clicks: number }>;
        frequencies: Array<{ frequency: string; clicks: number }>;
        campaigns: Array<{ campaign: string; clicks: number }>;
    };
    deepLinkAttribution?: {
        total: number;
        sources: Array<{ source: string; clicks: number }>;
        mediums: Array<{ medium: string; clicks: number }>;
        campaigns: Array<{ campaign: string; clicks: number }>;
    };
}

interface PopularAnnouncement {
    id: string;
    title: string;
    type: string;
    category?: string;
    viewCount: number;
}

// CSS-based Donut Chart using conic-gradient
const TYPE_COLORS: Record<string, string> = {
    job: '#2563EB',
    result: '#10B981',
    'admit-card': '#8B5CF6',
    'answer-key': '#F59E0B',
    syllabus: '#EC4899',
    admission: '#06B6D4',
};

function DonutChart({ data, total }: { data: { type: string; count: number }[]; total: number }) {
    if (total === 0 || !data || data.length === 0) return null;

    // Build conic-gradient segments
    let currentAngle = 0;
    const segments = data.map((item) => {
        const percentage = (item.count / total) * 100;
        const segment = `${TYPE_COLORS[item.type] || '#6B7280'} ${currentAngle}deg ${currentAngle + percentage * 3.6}deg`;
        currentAngle += percentage * 3.6;
        return segment;
    });

    return (
        <div
            className="donut-ring"
            style={{
                background: `conic-gradient(${segments.join(', ')})`,
            }}
        />
    );
}

export function AnalyticsDashboard({ adminToken }: { adminToken: string | null }) {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [popular, setPopular] = useState<PopularAnnouncement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [showZeroTrend, setShowZeroTrend] = useState(false);
    const typeBreakdown = analytics?.typeBreakdown ?? [];
    const categoryBreakdown = analytics?.categoryBreakdown ?? [];

    const sortedTypeBreakdown = useMemo(() => {
        return [...typeBreakdown].sort((a, b) => b.count - a.count);
    }, [typeBreakdown]);

    const sortedCategories = useMemo(() => {
        return [...categoryBreakdown]
            .sort((a, b) => b.count - a.count)
            .slice(0, 12);
    }, [categoryBreakdown]);

    const rollups = analytics?.dailyRollups ?? [];
    const { trendRows, zeroTrendCount } = useMemo(() => {
        const nonZero = rollups.filter((item) => (item.views ?? 0) > 0 || (item.searches ?? 0) > 0);
        const zeroCount = Math.max(0, rollups.length - nonZero.length);
        return {
            trendRows: showZeroTrend ? rollups : nonZero,
            zeroTrendCount: zeroCount,
        };
    }, [rollups, showZeroTrend]);
    const maxViews = Math.max(1, ...trendRows.map((item) => item.views ?? 0));
    const maxSearches = Math.max(1, ...trendRows.map((item) => item.searches ?? 0));

    const loadAnalytics = useCallback(async (options?: { silent?: boolean }) => {
        if (!adminToken) {
            setError('Not authenticated');
            setLoading(false);
            return;
        }

        if (options?.silent) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const [overviewRes, popularRes] = await Promise.all([
                fetch(`${apiBase}/api/analytics/overview`, {
                    headers: { Authorization: `Bearer ${adminToken}` }
                }),
                fetch(`${apiBase}/api/analytics/popular?limit=10`, {
                    headers: { Authorization: `Bearer ${adminToken}` }
                })
            ]);

            if (overviewRes.ok && popularRes.ok) {
                const overviewData = await overviewRes.json();
                const popularData = await popularRes.json();
                // Defensive: Ensure we never set undefined values
                    setAnalytics(overviewData.data ?? {
                    totalAnnouncements: 0,
                    totalViews: 0,
                    totalEmailSubscribers: 0,
                    totalPushSubscribers: 0,
                    totalSearches: 0,
                    totalBookmarks: 0,
                    totalRegistrations: 0,
                    totalSubscriptionsVerified: 0,
                    totalSubscriptionsUnsubscribed: 0,
                    totalListingViews: 0,
                    totalCardClicks: 0,
                    totalCategoryClicks: 0,
                    totalFilterApplies: 0,
                    totalDigestClicks: 0,
                    totalDeepLinkClicks: 0,
                    typeBreakdown: [],
                    categoryBreakdown: [],
                        funnel: {
                            listingViews: 0,
                            cardClicks: 0,
                            detailViews: 0,
                            detailViewsRaw: 0,
                            detailViewsAdjusted: 0,
                            hasAnomaly: false,
                            bookmarkAdds: 0,
                            subscriptionsVerified: 0,
                        },
                    ctrByType: [],
                    digestClicks: { total: 0, variants: [], frequencies: [], campaigns: [] },
                    deepLinkAttribution: { total: 0, sources: [], mediums: [], campaigns: [] },
                });
                setPopular(popularData.data ?? []);
                setError(null);
            } else {
                setError('Failed to load analytics');
            }
        } catch {
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [adminToken]);

    useEffect(() => {
        loadAnalytics();
    }, [loadAnalytics]);

    const handleExport = async () => {
        if (!adminToken) return;
        setExporting(true);
        try {
            const response = await fetch(`${apiBase}/api/analytics/export/csv`, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            if (!response.ok) {
                setError('Failed to export analytics');
                return;
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `analytics-rollups-${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            setError('Failed to export analytics');
        } finally {
            setExporting(false);
        }
    };

    if (loading) {
        return <div className="analytics-loading">Loading analytics...</div>;
    }

    if (error) {
        return <div className="analytics-error">Error: {error}</div>;
    }

    if (!analytics) return null;
    const engagementWindow = analytics.engagementWindowDays ?? 30;
    const ctr = analytics.totalListingViews > 0
        ? Math.round((analytics.totalCardClicks / analytics.totalListingViews) * 100)
        : 0;
    const ctrByType = analytics.ctrByType ?? [];
    const digestClicks = analytics.digestClicks;
    const deepLinkAttribution = analytics.deepLinkAttribution;
    const digestTotal = digestClicks?.total ?? 0;
    const deepLinkTotal = deepLinkAttribution?.total ?? 0;
    const funnel = analytics.funnel;
    const rawDetailViews = funnel?.detailViewsRaw ?? funnel?.detailViews ?? 0;
    const adjustedDetailViews = funnel?.detailViewsAdjusted ?? funnel?.detailViews ?? 0;
    const hasAnomaly = funnel?.hasAnomaly ?? Boolean(
        (funnel?.cardClicks ?? 0) > 0 && rawDetailViews > (funnel?.cardClicks ?? 0)
    );
    const funnelHasDirectTraffic = Boolean(
        (funnel?.cardClicks ?? 0) > 0 && rawDetailViews > (funnel?.cardClicks ?? 0)
    );
    const detailViewsLabel = hasAnomaly ? 'Detail views (adjusted)' : (funnelHasDirectTraffic ? 'Detail views (all)' : 'Detail views');
    const funnelSteps = [
        { label: 'Listing views', value: funnel?.listingViews ?? 0 },
        {
            label: 'Card clicks',
            value: funnel?.cardClicks ?? 0,
            rate: funnel?.listingViews ? Math.round((funnel.cardClicks / funnel.listingViews) * 100) : 0
        },
        {
            label: detailViewsLabel,
            value: adjustedDetailViews,
            rate: funnel?.cardClicks ? Math.round((adjustedDetailViews / funnel.cardClicks) * 100) : 0,
            rateLabel: funnelHasDirectTraffic ? 'Includes direct traffic' : undefined,
        },
        {
            label: 'Bookmarks',
            value: funnel?.bookmarkAdds ?? 0,
            rate: funnel?.detailViews ? Math.round((funnel.bookmarkAdds / funnel.detailViews) * 100) : 0
        },
        {
            label: 'Subscriptions verified',
            value: funnel?.subscriptionsVerified ?? 0,
            rate: funnel?.bookmarkAdds ? Math.round((funnel.subscriptionsVerified / funnel.bookmarkAdds) * 100) : 0
        },
    ];
    const formatLastUpdated = (value?: string | null) => {
        if (!value) return 'Rollup not updated yet';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Rollup not updated yet';
        const diffMs = Date.now() - date.getTime();
        if (diffMs < 60 * 1000) return 'Rollup updated just now';
        if (diffMs < 60 * 60 * 1000) return `Rollup updated ${Math.round(diffMs / 60000)}m ago`;
        if (diffMs < 24 * 60 * 60 * 1000) return `Rollup updated ${Math.round(diffMs / (60 * 60 * 1000))}h ago`;
        return `Rollup updated ${Math.round(diffMs / (24 * 60 * 60 * 1000))}d ago`;
    };

    return (
        <div className="analytics-dashboard">
            <div className="analytics-actions">
                <span className="analytics-subtitle">Export rollups for the last {engagementWindow} days.</span>
                <button
                    className="admin-btn secondary"
                    onClick={() => loadAnalytics({ silent: true })}
                    disabled={refreshing}
                >
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
                <button className="admin-btn secondary" onClick={handleExport} disabled={exporting}>
                    {exporting ? 'Exporting...' : 'Export CSV'}
                </button>
            </div>
            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card views">
                    <div className="stat-icon" aria-hidden="true">V</div>
                    <div className="stat-info">
                        <div className="stat-value">{(analytics.totalViews ?? 0).toLocaleString()}</div>
                        <div className="stat-label">Total Views</div>
                    </div>
                </div>
                <div className="stat-card posts">
                    <div className="stat-icon" aria-hidden="true">A</div>
                    <div className="stat-info">
                        <div className="stat-value">{analytics.totalAnnouncements}</div>
                        <div className="stat-label">Announcements</div>
                    </div>
                </div>
                <div className="stat-card subscribers">
                    <div className="stat-icon" aria-hidden="true">E</div>
                    <div className="stat-info">
                        <div className="stat-value">{analytics.totalEmailSubscribers ?? 0}</div>
                        <div className="stat-label">Email Subscribers</div>
                    </div>
                </div>
                <div className="stat-card push">
                    <div className="stat-icon" aria-hidden="true">P</div>
                    <div className="stat-info">
                        <div className="stat-value">{analytics.totalPushSubscribers ?? 0}</div>
                        <div className="stat-label">Push Subscribers</div>
                    </div>
                </div>
            </div>

            <div className="analytics-section">
                <div className="analytics-section-header">
                    <div>
                        <h3>Engagement (last {engagementWindow} days)</h3>
                        <p className="analytics-subtitle">Searches, bookmarks, and signups from tracked events.</p>
                    </div>
                    <span className="analytics-updated">{formatLastUpdated(analytics.rollupLastUpdatedAt ?? null)}</span>
                </div>
                <div className="engagement-grid">
                    <div className="engagement-card">
                        <div className="engagement-label">Searches</div>
                        <div className="engagement-value">{(analytics.totalSearches ?? 0).toLocaleString()}</div>
                    </div>
                    <div className="engagement-card">
                        <div className="engagement-label">Bookmarks</div>
                        <div className="engagement-value">{(analytics.totalBookmarks ?? 0).toLocaleString()}</div>
                    </div>
                    <div className="engagement-card">
                        <div className="engagement-label">Registrations</div>
                        <div className="engagement-value">{(analytics.totalRegistrations ?? 0).toLocaleString()}</div>
                    </div>
                    <div className="engagement-card">
                        <div className="engagement-label">Unsubscribes</div>
                        <div className="engagement-value">{(analytics.totalSubscriptionsUnsubscribed ?? 0).toLocaleString()}</div>
                    </div>
                    <div className="engagement-card">
                        <div className="engagement-label">Listing views</div>
                        <div className="engagement-value">{(analytics.totalListingViews ?? 0).toLocaleString()}</div>
                    </div>
                    <div className="engagement-card">
                        <div className="engagement-label">Card clicks</div>
                        <div className="engagement-value">{(analytics.totalCardClicks ?? 0).toLocaleString()}</div>
                    </div>
                    <div className="engagement-card">
                        <div className="engagement-label">Category clicks</div>
                        <div className="engagement-value">{(analytics.totalCategoryClicks ?? 0).toLocaleString()}</div>
                    </div>
                    <div className="engagement-card">
                        <div className="engagement-label">Filter applies</div>
                        <div className="engagement-value">{(analytics.totalFilterApplies ?? 0).toLocaleString()}</div>
                    </div>
                    <div className="engagement-card">
                        <div className="engagement-label">CTR</div>
                        <div className="engagement-value">{ctr}%</div>
                    </div>
                    <div className="engagement-card">
                        <div className="engagement-label">Digest clicks</div>
                        <div className="engagement-value">{(analytics.totalDigestClicks ?? 0).toLocaleString()}</div>
                    </div>
                    <div className="engagement-card">
                        <div className="engagement-label">Deep link clicks</div>
                        <div className="engagement-value">{(analytics.totalDeepLinkClicks ?? 0).toLocaleString()}</div>
                    </div>
                </div>
                <p className="engagement-hint">CTR uses card clicks divided by listing views. If listing views are zero, make sure listing view events are tracked.</p>
                <p className="analytics-hint">
                    {analytics.rollupLastUpdatedAt
                        ? 'Zero values mean no tracked activity yet.'
                        : 'Tracking not configured. Configure rollups to populate engagement metrics.'}
                </p>
            </div>

            <div className="analytics-section">
                <div className="analytics-section-header">
                    <div>
                        <h3>Engagement funnel</h3>
                        <p className="analytics-subtitle">Conversion steps for the last {engagementWindow} days.</p>
                    </div>
                </div>
                <div className="funnel-grid">
                {funnelSteps.map((step, index) => (
                    <div key={step.label} className="funnel-card">
                        <div className="funnel-label">{step.label}</div>
                        <div className="funnel-value">{step.value.toLocaleString()}</div>
                        {index > 0 && (
                            <div className="funnel-rate">
                                {step.rateLabel ?? `${step.rate}% of previous`}
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {hasAnomaly && (
                <div className="analytics-warning">
                    <strong>⚠ Funnel anomaly:</strong> Detail views ({rawDetailViews.toLocaleString()}) exceed card clicks ({(funnel?.cardClicks ?? 0).toLocaleString()}).
                    Funnel rates use the adjusted value ({adjustedDetailViews.toLocaleString()}).
                </div>
            )}
            {funnelHasDirectTraffic && (
                <p className="analytics-hint">
                    Detail views can exceed card clicks because they include direct/SEO visits and deep links.
                </p>
            )}
            </div>

            <div className="analytics-section">
                <div className="analytics-section-header">
                    <div>
                        <h3>CTR by listing type</h3>
                        <p className="analytics-subtitle">Card clicks per listing view, grouped by listing type.</p>
                    </div>
                </div>
                <p className="analytics-hint">
                    CTR is based on listing views tracked with a type filter, so totals can be lower than overall views.
                </p>
                {ctrByType.length === 0 ? (
                    <div className="empty-state">No CTR data yet. Apply a type filter to generate listing view events.</div>
                ) : (
                    <table className="analytics-table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th className="numeric">Listing views</th>
                                <th className="numeric">Card clicks</th>
                                <th className="numeric">CTR</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ctrByType.map((item) => (
                                <tr key={item.type}>
                                    <td><span className={`type-badge ${item.type}`}>{item.type}</span></td>
                                    <td className="numeric">{item.listingViews.toLocaleString()}</td>
                                    <td className="numeric">{item.cardClicks.toLocaleString()}</td>
                                    <td className="numeric">{item.ctr}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="analytics-section">
                <div className="analytics-section-header">
                    <div>
                        <h3>Digest A/B clicks</h3>
                        <p className="analytics-subtitle">Click activity from digest emails.</p>
                    </div>
                </div>
                {digestClicks ? (
                    <>
                        <div className="digest-grid">
                            <div className="digest-card">
                                <div className="digest-label">Total clicks</div>
                                <div className="digest-value">{digestClicks.total.toLocaleString()}</div>
                            </div>
                            <div className="digest-card">
                                <div className="digest-label">Variants</div>
                                <div className="digest-chips">
                                    {digestClicks.variants.length === 0 ? (
                                        <span className="digest-chip">Not configured</span>
                                    ) : (
                                        digestClicks.variants.map((item) => (
                                            <span key={item.variant} className="digest-chip">
                                                {item.variant}: {item.clicks}
                                            </span>
                                        ))
                                    )}
                                </div>
                            </div>
                            <div className="digest-card">
                                <div className="digest-label">Frequency</div>
                                <div className="digest-chips">
                                    {digestClicks.frequencies.length === 0 ? (
                                        <span className="digest-chip">Not configured</span>
                                    ) : (
                                        digestClicks.frequencies.map((item) => (
                                            <span key={item.frequency} className="digest-chip">
                                                {item.frequency}: {item.clicks}
                                            </span>
                                        ))
                                    )}
                                </div>
                            </div>
                            <div className="digest-card">
                                <div className="digest-label">Top campaigns</div>
                                <div className="digest-chips">
                                    {digestClicks.campaigns.length === 0 ? (
                                        <span className="digest-chip">Not configured</span>
                                    ) : (
                                        digestClicks.campaigns.map((item) => (
                                            <span key={item.campaign} className="digest-chip">
                                                {item.campaign}: {item.clicks}
                                            </span>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                        {digestTotal === 0 && (
                            <div className="digest-note">Tracking enabled, no clicks yet.</div>
                        )}
                    </>
                ) : (
                    <div className="empty-state">Digest click tracking not configured.</div>
                )}
            </div>

            <div className="analytics-section">
                <div className="analytics-section-header">
                    <div>
                        <h3>Deep link attribution</h3>
                        <p className="analytics-subtitle">Top sources, mediums, and campaigns from tracked links.</p>
                    </div>
                </div>
                {deepLinkAttribution ? (
                    <>
                        <div className="digest-grid">
                            <div className="digest-card">
                                <div className="digest-label">Total deep link clicks</div>
                                <div className="digest-value">{deepLinkAttribution.total.toLocaleString()}</div>
                            </div>
                            <div className="digest-card">
                                <div className="digest-label">Sources</div>
                                <div className="digest-chips">
                                    {deepLinkAttribution.sources.length === 0 ? (
                                        <span className="digest-chip">Not configured</span>
                                    ) : (
                                        deepLinkAttribution.sources.map((item) => (
                                            <span key={item.source} className="digest-chip">
                                                {item.source}: {item.clicks}
                                            </span>
                                        ))
                                    )}
                                </div>
                            </div>
                            <div className="digest-card">
                                <div className="digest-label">Mediums</div>
                                <div className="digest-chips">
                                    {deepLinkAttribution.mediums.length === 0 ? (
                                        <span className="digest-chip">Not configured</span>
                                    ) : (
                                        deepLinkAttribution.mediums.map((item) => (
                                            <span key={item.medium} className="digest-chip">
                                                {item.medium}: {item.clicks}
                                            </span>
                                        ))
                                    )}
                                </div>
                            </div>
                            <div className="digest-card">
                                <div className="digest-label">Campaigns</div>
                                <div className="digest-chips">
                                    {deepLinkAttribution.campaigns.length === 0 ? (
                                        <span className="digest-chip">Not configured</span>
                                    ) : (
                                        deepLinkAttribution.campaigns.map((item) => (
                                            <span key={item.campaign} className="digest-chip">
                                                {item.campaign}: {item.clicks}
                                            </span>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                        {deepLinkTotal === 0 && (
                            <div className="digest-note">Tracking enabled, no clicks yet.</div>
                        )}
                    </>
                ) : (
                    <div className="empty-state">Deep link tracking not configured.</div>
                )}
            </div>

            <div className="analytics-section">
                <div className="analytics-section-header">
                    <div>
                        <h3>Trend lines</h3>
                        <p className="analytics-subtitle">Views vs searches (daily).</p>
                    </div>
                    {zeroTrendCount > 0 && (
                        <button
                            className="admin-btn secondary small"
                            onClick={() => setShowZeroTrend((prev) => !prev)}
                        >
                            {showZeroTrend ? `Hide ${zeroTrendCount} zero days` : `Show ${zeroTrendCount} zero days`}
                        </button>
                    )}
                </div>
                {trendRows.length === 0 ? (
                    <div className="empty-state">
                        {rollups.length === 0
                            ? 'No rollup data yet.'
                            : 'All days are zero-activity. Toggle to show them.'}
                    </div>
                ) : (
                    <div className="trend-list">
                        {trendRows.map((item) => (
                            <div key={item.date} className="trend-row">
                                <div className="trend-date">{item.date}</div>
                                <div className="trend-bars">
                                    <div
                                        className="trend-bar views"
                                        style={{ width: `${(item.views / maxViews) * 100}%` }}
                                    />
                                    <div
                                        className="trend-bar searches"
                                        style={{ width: `${(item.searches / maxSearches) * 100}%` }}
                                    />
                                </div>
                                <div className="trend-values">
                                    {item.views} views · {item.searches} searches
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {analytics.rollupLastUpdatedAt && (
                    <div className="analytics-subtitle">Last rollup: {new Date(analytics.rollupLastUpdatedAt).toLocaleString()}</div>
                )}
            </div>

            {/* Type Breakdown with Donut Chart */}
            <div className="analytics-section">
                <h3>Posts by Type</h3>
                <div className="chart-container">
                    {/* CSS Donut Chart */}
                    <div className="donut-chart">
                        <DonutChart data={sortedTypeBreakdown} total={analytics.totalAnnouncements} />
                        <div className="donut-center">
                            <span className="donut-value">{analytics.totalAnnouncements}</span>
                            <span className="donut-label">Total</span>
                        </div>
                    </div>
                    {/* Breakdown Bars */}
                    <div className="type-breakdown">
                        {sortedTypeBreakdown.map((item) => {
                            const percent = analytics.totalAnnouncements > 0
                                ? (item.count / analytics.totalAnnouncements) * 100
                                : 0;
                            const barColor = TYPE_COLORS[item.type] || '#6B7280';
                            return (
                                <div key={item.type} className="breakdown-item">
                                    <span className={`type-badge ${item.type}`}>{item.type}</span>
                                    <div className="breakdown-bar">
                                        <div
                                            className="breakdown-fill"
                                            style={{ width: `${percent}%`, backgroundColor: barColor }}
                                        />
                                    </div>
                                    <span className="breakdown-count">{item.count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Popular Announcements */}
            <div className="analytics-section">
                <div className="analytics-section-header">
                    <div>
                        <h3>Most Popular Announcements</h3>
                        <p className="analytics-subtitle">Top 10 announcements by total views.</p>
                    </div>
                </div>
                <table className="analytics-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Title</th>
                            <th>Type</th>
                            <th className="numeric">Views</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(popular ?? []).map((item, index) => (
                            <tr key={item.id}>
                                <td>{index + 1}</td>
                                <td>{item.title.substring(0, 50)}{item.title.length > 50 ? '...' : ''}</td>
                                <td><span className={`type-badge ${item.type}`}>{item.type}</span></td>
                                <td className="view-count numeric">{(item.viewCount ?? 0).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Category Breakdown */}
            <div className="analytics-section">
                <h3>Top Categories</h3>
                <div className="category-chips">
                    {sortedCategories.map((item) => (
                        <div key={item.category} className="category-chip">
                            <span className="category-name">{item.category}</span>
                            <span className="category-count">{item.count}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
