import { useState, useEffect, useMemo, useCallback } from 'react';
import { adminRequest } from '../../utils/adminRequest';
import { QuickActions } from './QuickActions';
import { MiniSparkline } from './MiniSparkline';
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
    insights?: {
        viewTrendPct: number;
        viewTrendDirection: 'up' | 'down' | 'flat' | string;
        clickThroughRate: number;
        funnelDropRate: number;
        listingCoverage: number;
        topType?: { type: string; count: number; share?: number | null } | null;
        topCategory?: { category: string; count: number; share?: number | null } | null;
        anomaly?: boolean;
        rollupAgeMinutes?: number | null;
    };
}

interface PopularAnnouncement {
    id: string;
    title: string;
    type: string;
    category?: string;
    viewCount: number;
    slug?: string;
    status?: string;
    isActive?: boolean;
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

const buildLinePath = (values: number[], width: number, height: number) => {
    if (values.length === 0) return '';
    const max = Math.max(1, ...values);
    const step = values.length > 1 ? width / (values.length - 1) : 0;
    return values
        .map((value, index) => {
            const x = values.length > 1 ? index * step : width / 2;
            const y = height - (value / max) * height;
            return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(' ');
};

function TrendChart({
    data,
    width = 520,
    height = 140,
}: {
    data: Array<{ date: string; views: number; searches: number }>;
    width?: number;
    height?: number;
}) {
    if (!data.length) return null;
    const viewValues = data.map((item) => item.views ?? 0);
    const searchValues = data.map((item) => item.searches ?? 0);
    const viewsPath = buildLinePath(viewValues, width, height);
    const searchesPath = buildLinePath(searchValues, width, height);

    return (
        <svg className="trend-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Views and searches trend">
            <path className="trend-line views" d={viewsPath} />
            <path className="trend-line searches" d={searchesPath} />
        </svg>
    );
}

export function AnalyticsDashboard({
    adminToken,
    onEditById,
    onOpenList,
    onUnauthorized,
}: {
    adminToken?: string | null;
    onEditById?: (id: string) => void;
    onOpenList?: () => void;
    onUnauthorized?: () => void;
}) {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [popular, setPopular] = useState<PopularAnnouncement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [showZeroTrend, setShowZeroTrend] = useState(false);
    const [liveEnabled, setLiveEnabled] = useState(true);
    const [liveStatus, setLiveStatus] = useState<'idle' | 'connecting' | 'live' | 'error'>('idle');
    const [rangeDays, setRangeDays] = useState(30);
    const [actionMessage, setActionMessage] = useState<string | null>(null);
    const typeBreakdown = analytics?.typeBreakdown ?? [];
    const categoryBreakdown = analytics?.categoryBreakdown ?? [];

    useEffect(() => {
        if (!actionMessage) return;
        const timer = window.setTimeout(() => setActionMessage(null), 4000);
        return () => window.clearTimeout(timer);
    }, [actionMessage]);

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
    const viewsLast7 = rollups.slice(-7).reduce((sum, item) => sum + (item.views ?? 0), 0);
    const prev7Views = rollups.slice(0, Math.max(0, rollups.length - 7)).reduce((sum, item) => sum + (item.views ?? 0), 0);

    const loadAnalytics = useCallback(async (options?: { silent?: boolean; forceFresh?: boolean }) => {
        if (options?.silent) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const nocache = options?.forceFresh ? '&nocache=1' : '';
            const headers = adminToken ? { Authorization: `Bearer ${adminToken}` } : undefined;
            const onRateLimit = (response: Response) => {
                const retryAfter = response.headers.get('Retry-After');
                setError(retryAfter
                    ? `Too many requests. Try again in ${retryAfter}s.`
                    : 'Too many requests. Please wait and try again.');
            };
            const [overviewRes, popularRes] = await Promise.all([
                adminRequest(`${apiBase}/api/analytics/overview?days=${rangeDays}${nocache}`, {
                    headers,
                    onRateLimit,
                }),
                adminRequest(`${apiBase}/api/analytics/popular?limit=10${nocache}`, {
                    headers,
                    onRateLimit,
                })
            ]);

            if (overviewRes.status === 401 || overviewRes.status === 403 || popularRes.status === 401 || popularRes.status === 403) {
                onUnauthorized?.();
                return;
            }

            if (overviewRes.status === 429 || popularRes.status === 429) {
                setError('Too many requests. Please wait and try again.');
                return;
            }

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
                    insights: {
                        viewTrendPct: 0,
                        viewTrendDirection: 'flat',
                        clickThroughRate: 0,
                        funnelDropRate: 0,
                        listingCoverage: 0,
                        topType: null,
                        topCategory: null,
                        anomaly: false,
                        rollupAgeMinutes: null,
                    },
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
    }, [adminToken, rangeDays, onUnauthorized]);

    useEffect(() => {
        loadAnalytics();
    }, [loadAnalytics]);

    useEffect(() => {
        if (!liveEnabled) {
            setLiveStatus('idle');
            return;
        }

        if (typeof window === 'undefined') return;
        setLiveStatus('connecting');

        let ws: WebSocket | null = null;
        const baseUrl = apiBase ? new URL(apiBase, window.location.origin) : new URL(window.location.origin);
        const wsProtocol = baseUrl.protocol === 'https:' ? 'wss' : 'ws';
        const tokenParam = adminToken ? `token=${encodeURIComponent(adminToken)}&` : '';
        const wsUrl = `${wsProtocol}://${baseUrl.host}/ws/analytics?${tokenParam}days=${rangeDays}`;

        try {
            ws = new WebSocket(wsUrl);
        } catch {
            setLiveStatus('error');
            return;
        }

        ws.onopen = () => setLiveStatus('live');
        ws.onerror = () => setLiveStatus('error');
        ws.onclose = () => setLiveStatus(liveEnabled ? 'error' : 'idle');
        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data as string);
                if (message?.type === 'analytics:update' && message.data) {
                    setAnalytics(message.data);
                }
            } catch {
                // ignore malformed messages
            }
        };

        return () => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        };
    }, [adminToken, liveEnabled, rangeDays]);

    const handleExport = async () => {
        setExporting(true);
        try {
            const response = await adminRequest(`${apiBase}/api/analytics/export/csv`, {
                headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : undefined,
            });
            if (response.status === 401 || response.status === 403) {
                onUnauthorized?.();
                return;
            }
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

    const handlePopularView = (item: PopularAnnouncement) => {
        if (!item.slug) {
            setActionMessage('Open list to view this announcement.');
            return;
        }
        window.open(`/${item.type}/${item.slug}`, '_blank', 'noopener,noreferrer');
    };

    const handlePopularEdit = (item: PopularAnnouncement) => {
        if (!onEditById) {
            setActionMessage('Open list to edit this announcement.');
            return;
        }
        onOpenList?.();
        onEditById(item.id);
    };

    const handlePopularUnpublish = async (item: PopularAnnouncement) => {
        setActionMessage(null);
        try {
            const response = await adminRequest(`${apiBase}/api/admin/announcements/${item.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
                    'Idempotency-Key': crypto.randomUUID(),
                },
                maxRetries: 0,
                body: JSON.stringify({ status: 'archived' }),
            });
            if (response.status === 401 || response.status === 403) {
                onUnauthorized?.();
                return;
            }
            if (!response.ok) {
                setActionMessage('Failed to unpublish announcement.');
                return;
            }
            setActionMessage('Announcement unpublished.');
            loadAnalytics({ silent: true, forceFresh: true });
        } catch (error) {
            console.error(error);
            setActionMessage('Failed to unpublish announcement.');
        }
    };

    const handlePopularBoost = () => {
        setActionMessage('Boosting is not configured yet. Configure promotions to enable this action.');
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
    const digestNotConfigured = !digestClicks;
    const digestHasNoData = digestClicks && digestClicks.total === 0
        && digestClicks.variants.length === 0
        && digestClicks.frequencies.length === 0
        && digestClicks.campaigns.length === 0;
    const deepLinkNotConfigured = !deepLinkAttribution;
    const deepLinkHasNoData = deepLinkAttribution && deepLinkAttribution.total === 0
        && deepLinkAttribution.sources.length === 0
        && deepLinkAttribution.mediums.length === 0
        && deepLinkAttribution.campaigns.length === 0;
    const insights = analytics.insights;
    const viewTrendPct = insights?.viewTrendPct ?? 0;
    const viewTrendDirection = insights?.viewTrendDirection ?? (viewTrendPct > 2 ? 'up' : viewTrendPct < -2 ? 'down' : 'flat');
    const viewTrendLabel = viewTrendDirection === 'up'
        ? `Up ${Math.abs(viewTrendPct)}%`
        : viewTrendDirection === 'down'
            ? `Down ${Math.abs(viewTrendPct)}%`
            : 'Stable';
    const rollupAge = insights?.rollupAgeMinutes ?? null;
    const ctrTone = ctr >= 10 ? 'good' : ctr >= 5 ? 'warn' : 'bad';
    const listingCoverage = insights?.listingCoverage ?? 0;
    const coverageTone = listingCoverage >= 25 ? 'good' : listingCoverage >= 10 ? 'warn' : 'bad';
    const coverageMeta = listingCoverage === 0
        ? 'No listing view events tracked. Verify listing pages fire view events.'
        : listingCoverage < 10
            ? 'Low coverage. Ensure list pages and filters trigger listing view tracking.'
            : 'Listing views vs total views';
    const funnelDropTone = (insights?.funnelDropRate ?? 0) >= 80 ? 'bad' : (insights?.funnelDropRate ?? 0) >= 60 ? 'warn' : 'good';
    const trendTone = viewTrendDirection === 'up' ? 'good' : viewTrendDirection === 'down' ? 'bad' : 'warn';
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
    const lowCtrThreshold = 5;
    const lowCtrMinViews = 10;
    
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

    // Recalculate coverage if 0 but we have views
    const calculatedCoverage = analytics.totalViews > 0 
        ? Math.round((analytics.totalListingViews / analytics.totalViews) * 100) 
        : 0;
    const finalCoverage = (listingCoverage === 0 && analytics.totalListingViews > 0) 
        ? calculatedCoverage 
        : listingCoverage;
    const finalCoverageTone = finalCoverage >= 25 ? 'good' : finalCoverage >= 10 ? 'warn' : 'bad';
    const coverageMetaText = finalCoverage === 0
        ? 'No listing view events tracked. Verify listing pages fire view events.'
        : finalCoverage < 10
            ? 'Low coverage. Ensure list pages and filters trigger listing view tracking.'
            : 'Listing views vs total views';

    // Weekly trend anomaly check
    const isNewData = rollups.length <= 7 && prev7Views === 0;
    const displayTrendLabel = isNewData ? 'New' : viewTrendLabel;
    const displayTrendTone = isNewData ? 'good' : trendTone;

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
        <div className={`analytics-dashboard ${refreshing ? 'refreshing' : ''}`}>
            <div className="analytics-actions">
                <div className="analytics-actions-left">
                    <span className="analytics-subtitle">Export rollups for the last {engagementWindow} days.</span>
                    <div className="range-toggle">
                        {[7, 30, 90].map((days) => (
                            <button
                                key={days}
                                className={`admin-btn secondary small ${rangeDays === days ? 'active' : ''}`}
                                onClick={() => setRangeDays(days)}
                            >
                                {days} days
                            </button>
                        ))}
                    </div>
                </div>
                <div className="analytics-live">
                    <span className={`live-dot ${liveStatus}`} aria-hidden="true" />
                    <span className="live-text">
                        {liveStatus === 'live' ? 'Live updates on' : liveStatus === 'connecting' ? 'Connecting...' : liveStatus === 'error' ? 'Live updates paused' : 'Live updates off'}
                    </span>
                </div>
                <button
                    className="admin-btn secondary small"
                    onClick={() => setLiveEnabled((prev) => !prev)}
                >
                    {liveEnabled ? 'Pause live' : 'Resume live'}
                </button>
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
            {actionMessage && (
                <div className="analytics-note" role="status">{actionMessage}</div>
            )}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-label">Views last 7 days</div>
                    <div className="kpi-value">{viewsLast7.toLocaleString()}</div>
                    <div className="kpi-sub">Highlights recent demand</div>
                </div>
                <div className={`kpi-card ${ctrTone}`}>
                    <div className="kpi-label">CTR last 30 days</div>
                    <div className="kpi-value">{ctr}%</div>
                    <div className="kpi-sub">Card clicks / listing views</div>
                </div>
            </div>
            {/* Quick Actions */}
            <QuickActions
                expiringThisWeek={0}
                pendingReview={0}
                onViewExpiring={onOpenList}
                onViewPending={onOpenList}
            />
            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card views">
                    <div className="stat-icon" aria-hidden="true">V</div>
                    <div className="stat-info">
                        <div className="stat-value">{(analytics.totalViews ?? 0).toLocaleString()}</div>
                        <div className="stat-label">Total Views</div>
                        <div className="stat-meta">
                            <MiniSparkline
                                data={rollups.slice(-7).map(r => r.views ?? 0)}
                                color="blue"
                                height={24}
                                width={60}
                            />
                        </div>
                    </div>
                </div>
                <div className="stat-card posts">
                    <div className="stat-icon" aria-hidden="true">A</div>
                    <div className="stat-info">
                        <div className="stat-value">{analytics.totalAnnouncements}</div>
                        <div className="stat-label">Announcements</div>
                        <div className="stat-meta">Published + scheduled</div>
                    </div>
                </div>
                <div className="stat-card subscribers">
                    <div className="stat-icon" aria-hidden="true">E</div>
                    <div className="stat-info">
                        <div className="stat-value">{analytics.totalEmailSubscribers ?? 0}</div>
                        <div className="stat-label">Email Subscribers</div>
                        <div className="stat-meta">Verified opt-ins</div>
                    </div>
                </div>
                <div className="stat-card push">
                    <div className="stat-icon" aria-hidden="true">P</div>
                    <div className="stat-info">
                        <div className="stat-value">{analytics.totalPushSubscribers ?? 0}</div>
                        <div className="stat-label">Push Subscribers</div>
                        <div className="stat-meta">Active devices</div>
                    </div>
                </div>
            </div>

            <div className={`analytics-section ${digestNotConfigured || digestHasNoData ? 'section-muted' : ''}`}>
                <div className="analytics-section-header">
                    <div>
                        <h3>Engagement Overview</h3>
                        <p className="analytics-subtitle">Searches, bookmarks, and signups from the last {engagementWindow} days.</p>
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
                    <div className={`engagement-card ${ctrTone}`}>
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
                        <h3>Insights</h3>
                        <p className="analytics-subtitle">Automated signals from the most recent rollups.</p>
                    </div>
                </div>
                <div className="insights-grid">
                    <div className={`insight-card ${displayTrendTone}`}>
                        <div className="insight-label">Weekly views trend</div>
                        <div className={`insight-value ${isNewData ? 'flat' : viewTrendDirection}`}>{displayTrendLabel}</div>
                        <div className="insight-meta">{viewsLast7.toLocaleString()} vs {prev7Views.toLocaleString()} views</div>
                    </div>
                    <div className={`insight-card ${ctrTone}`}>
                        <div className="insight-label">Click-through rate</div>
                        <div className="insight-value">{insights?.clickThroughRate ?? ctr}%</div>
                        <div className="insight-meta">From listing views to card clicks</div>
                    </div>
                    <div className={`insight-card ${funnelDropTone}`}>
                        <div className="insight-label">Drop-off rate</div>
                        <div className="insight-value">{insights?.funnelDropRate ?? 0}%</div>
                        <div className="insight-meta">Listing views not clicked</div>
                    </div>
                    <div className={`insight-card ${finalCoverageTone}`}>
                        <div className="insight-label">Tracking coverage</div>
                        <div className="insight-value">{finalCoverage}%</div>
                        <div className="insight-meta">{coverageMetaText}</div>
                    </div>
                    <div className="insight-card">
                        <div className="insight-label">Top listing type</div>
                        <div className="insight-value">{insights?.topType?.type ?? 'N/A'}</div>
                        <div className="insight-meta">
                            {insights?.topType
                                ? `${insights.topType.count} posts - ${(insights.topType.share ?? 0).toFixed(1)}% share`
                                : 'No dominant type yet'}
                        </div>
                    </div>
                    <div className="insight-card">
                        <div className="insight-label">Top category</div>
                        <div className="insight-value">{insights?.topCategory?.category ?? 'N/A'}</div>
                        <div className="insight-meta">
                            {insights?.topCategory
                                ? `${insights.topCategory.count} posts - ${(insights.topCategory.share ?? 0).toFixed(1)}% share`
                                : 'No dominant category yet'}
                        </div>
                    </div>
                    <div className="insight-card">
                        <div className="insight-label">Rollup freshness</div>
                        <div className="insight-value">
                            {rollupAge === null ? 'Not available' : rollupAge < 60 ? `${rollupAge}m ago` : `${Math.round(rollupAge / 60)}h ago`}
                        </div>
                        <div className="insight-meta">Latest rollup update</div>
                    </div>
                    {insights?.anomaly && (
                        <div className="insight-card warning">
                            <div className="insight-label">Data anomaly</div>
                            <div className="insight-value">Check funnel</div>
                            <div className="insight-meta">Detail views exceed card clicks</div>
                        </div>
                    )}
                </div>
            </div>

            <div className="analytics-section">
                <div className="analytics-section-header">
                    <div>
                        <h3>Engagement Funnel</h3>
                        <p className="analytics-subtitle">Conversion from views to subscriptions in the last {engagementWindow} days.</p>
                    </div>
                </div>
                <div className="funnel-grid">
                    {funnelSteps.map((step, index) => (
                        <div key={step.label} className="funnel-card">
                            <div className="funnel-label" title={step.label === 'Detail views (adjusted)' ? 'Capped at card clicks to calculate conversion' : undefined}>
                                {step.label}
                                {step.label === 'Detail views (adjusted)' && <span className="info-icon" title="Adjusted to not exceed card clicks for valid conversion rates">ⓘ</span>}
                            </div>
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
                        <strong>⚠ Funnel anomaly:</strong> Raw Detail views ({rawDetailViews.toLocaleString()}) exceed Card clicks ({(funnel?.cardClicks ?? 0).toLocaleString()}).
                        <br />
                        The funnel uses the adjusted value ({adjustedDetailViews.toLocaleString()}) to ensure percentages make sense.
                        <div className="analytics-suggestion">Suggestion: Check if users are bypassing listing pages (direct links/SEO) or if card clicks are under-tracked.</div>
                    </div>
                )}
                {funnelHasDirectTraffic && !hasAnomaly && (
                    <p className="analytics-hint">
                        Detail views include direct/SEO visits, so they may exceed card clicks.
                    </p>
                )}
            </div>

            <div className="analytics-section">
                <div className="analytics-section-header">
                    <div>
                        <h3>CTR by Listing Type</h3>
                        <p className="analytics-subtitle">Card clicks per listing view, grouped by type.</p>
                    </div>
                </div>
                <p className="analytics-hint">
                    CTR is based on listing views tracked with a type filter, so totals can be lower than overall views.
                </p>
                {ctrByType.length === 0 ? (
                    <div className="empty-state">No CTR data yet. Apply a type filter to generate listing view events.</div>
                ) : (
                    <>
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
                                {ctrByType.map((item) => {
                                    const displayedCtr = item.listingViews > 0 ? Math.round((item.cardClicks / item.listingViews) * 100) : 0;
                                    return (
                                        <tr key={item.type}>
                                            <td>
                                                <span className={`type-badge ${item.type}`}>{item.type}</span>
                                                {item.listingViews >= lowCtrMinViews && displayedCtr < lowCtrThreshold && (
                                                    <span className="ctr-flag" title="Low CTR" aria-label={`Low CTR for ${item.type}`}>Low CTR</span>
                                                )}
                                            </td>
                                            <td className="numeric">{item.listingViews.toLocaleString()}</td>
                                            <td className="numeric">{item.cardClicks.toLocaleString()}</td>
                                            <td className="numeric">
                                                <div className="ctr-cell">
                                                    <span className="ctr-value">{displayedCtr}%</span>
                                                    <span className="ctr-bar">
                                                        <span style={{ width: `${Math.min(100, displayedCtr)}%` }} />
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        <p className="analytics-hint">Improve titles and thumbnails for low-CTR types (Result, Answer-key) to lift clicks.</p>
                    </>
                )}
            </div>

            <div className="analytics-section">
                <div className="analytics-section-header">
                    <div>
                        <h3>Digest A/B Clicks</h3>
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
                        {(digestHasNoData || digestNotConfigured) && (
                            <div className="digest-cta">
                                <button
                                    className="admin-btn secondary small"
                                    onClick={() => setActionMessage('Digest setup: configure provider, enable digest campaigns, and record digest_click events.')}
                                >
                                    Set up digest emails
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="empty-state">
                        Digest click tracking not configured.
                        <div className="digest-cta">
                            <button
                                className="admin-btn secondary small"
                                onClick={() => setActionMessage('Digest setup: configure provider, enable digest campaigns, and record digest_click events.')}
                            >
                                Set up digest emails
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className={`analytics-section ${deepLinkNotConfigured || deepLinkHasNoData ? 'section-muted' : ''}`}>
                <div className="analytics-section-header">
                    <div>
                        <h3>Deep Link Attribution</h3>
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
                        {(deepLinkHasNoData || deepLinkNotConfigured) && (
                            <div className="digest-cta">
                                <button
                                    className="admin-btn secondary small"
                                    onClick={() => setActionMessage('UTM setup: include source/medium/campaign in deep links and emit deep_link_click events.')}
                                >
                                    Configure UTM tracking
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="empty-state">
                        Deep link tracking not configured.
                        <div className="digest-cta">
                            <button
                                className="admin-btn secondary small"
                                onClick={() => setActionMessage('UTM setup: include source/medium/campaign in deep links and emit deep_link_click events.')}
                            >
                                Configure UTM tracking
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="analytics-section">
                <div className="analytics-section-header">
                    <div>
                        <h3>Trend Lines</h3>
                        <p className="analytics-subtitle">Daily views vs searches for the selected range.</p>
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
                    <>
                        <div className="trend-chart-wrap">
                            <TrendChart
                                data={trendRows.map((item) => ({
                                    date: item.date,
                                    views: item.views ?? 0,
                                    searches: item.searches ?? 0,
                                }))}
                            />
                            <div className="trend-legend">
                                <span className="legend-item views">Views</span>
                                <span className="legend-item searches">Searches</span>
                            </div>
                        </div>
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
                    </>
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
                        <p className="analytics-subtitle">Top 10 announcements by total views with quick actions.</p>
                    </div>
                </div>
                <table className="analytics-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Title</th>
                            <th>Type</th>
                            <th className="numeric">Views</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(popular ?? []).map((item, index) => (
                            <tr key={item.id}>
                                <td>{index + 1}</td>
                                <td>{item.title.substring(0, 50)}{item.title.length > 50 ? '...' : ''}</td>
                                <td><span className={`type-badge ${item.type}`}>{item.type}</span></td>
                                <td className="view-count numeric">{(item.viewCount ?? 0).toLocaleString()}</td>
                                <td>
                                    <div className="table-actions compact">
                                        <button className="admin-btn secondary small" onClick={() => handlePopularView(item)}>View</button>
                                        <button className="admin-btn secondary small" onClick={() => handlePopularEdit(item)}>Edit</button>
                                        <button
                                            className="admin-btn warning small"
                                            onClick={() => handlePopularUnpublish(item)}
                                            disabled={item.status === 'archived'}
                                        >
                                            Unpublish
                                        </button>
                                        <button className="admin-btn secondary small" onClick={handlePopularBoost}>Boost</button>
                                    </div>
                                </td>
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
