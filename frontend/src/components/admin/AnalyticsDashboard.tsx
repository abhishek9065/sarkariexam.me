import { useState, useEffect, useMemo, useCallback } from 'react';
import { adminRequest } from '../../utils/adminRequest';
import { formatNumber } from '../../utils/formatters';
import { QuickActions } from './QuickActions';
import { MiniSparkline } from './MiniSparkline';
import { KpiCard } from './KpiCard';
import { MetricDefinitionTooltip } from './MetricDefinitionTooltip';
import { ActionOverflowMenu } from './ActionOverflowMenu';
import type {
    AnalyticsAnomaly,
    AnalyticsComparison,
    MetricDefinition,
    NumberLocalePref,
} from '../../types';
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
    totalCardClicksInApp?: number;
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
        cardClicksRaw?: number;
        cardClicksInApp?: number;
        detailViews: number;
        detailViewsRaw?: number;
        detailViewsAdjusted?: number;
        detailViewsDirect?: number;
        detailViewsUnattributed?: number;
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
    topSearches?: Array<{ query: string; count: number }>;
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
        viewTrendMode?: 'normal' | 'baseline' | string;
        clickThroughRate: number;
        funnelDropRate: number;
        listingCoverage: number;
        listingCoverageWindowPct?: number;
        listingCoverageAllTimePct?: number;
        attributionCoveragePct?: number;
        topType?: { type: string; count: number; share?: number | null } | null;
        topCategory?: { category: string; count: number; share?: number | null } | null;
        anomaly?: boolean;
        rollupAgeMinutes?: number | null;
        healthFlags?: {
            zeroListingEvents: boolean;
            staleRollups: boolean;
            inAppClickCollapse: boolean;
            staleThresholdMinutes: number;
        };
    };
    comparison?: AnalyticsComparison;
    anomalies?: AnalyticsAnomaly[];
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

const DEFAULT_ANALYTICS: AnalyticsData = {
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
    totalCardClicksInApp: 0,
    totalCategoryClicks: 0,
    totalFilterApplies: 0,
    totalDigestClicks: 0,
    totalDeepLinkClicks: 0,
    rollupLastUpdatedAt: null,
    dailyRollups: [],
    engagementWindowDays: 30,
    typeBreakdown: [],
    categoryBreakdown: [],
    funnel: {
        listingViews: 0,
        cardClicks: 0,
        cardClicksRaw: 0,
        cardClicksInApp: 0,
        detailViews: 0,
        detailViewsRaw: 0,
        detailViewsAdjusted: 0,
        detailViewsDirect: 0,
        detailViewsUnattributed: 0,
        hasAnomaly: false,
        bookmarkAdds: 0,
        subscriptionsVerified: 0,
    },
    ctrByType: [],
    topSearches: [],
    digestClicks: {
        total: 0,
        variants: [],
        frequencies: [],
        campaigns: [],
    },
    deepLinkAttribution: {
        total: 0,
        sources: [],
        mediums: [],
        campaigns: [],
    },
    insights: {
        viewTrendPct: 0,
        viewTrendDirection: 'flat',
        viewTrendMode: 'normal',
        clickThroughRate: 0,
        funnelDropRate: 0,
        listingCoverage: 0,
        listingCoverageWindowPct: 0,
        listingCoverageAllTimePct: 0,
        attributionCoveragePct: 0,
        topType: null,
        topCategory: null,
        anomaly: false,
        rollupAgeMinutes: null,
        healthFlags: {
            zeroListingEvents: false,
            staleRollups: false,
            inAppClickCollapse: false,
            staleThresholdMinutes: 45,
        },
    },
    comparison: {
        viewsDeltaPct: 0,
        searchesDeltaPct: 0,
        ctrDeltaPct: 0,
        dropOffDeltaPct: 0,
        compareDays: 30,
    },
    anomalies: [],
};

const asArray = <T,>(value: unknown): T[] => {
    return Array.isArray(value) ? (value as T[]) : [];
};

const asNumber = (value: unknown): number => {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeAnalyticsData = (value: unknown): AnalyticsData => {
    const incoming = (value ?? {}) as Partial<AnalyticsData>;
    const digest = (incoming.digestClicks ?? {}) as NonNullable<AnalyticsData['digestClicks']>;
    const deepLink = (incoming.deepLinkAttribution ?? {}) as NonNullable<AnalyticsData['deepLinkAttribution']>;
    return {
        ...DEFAULT_ANALYTICS,
        ...incoming,
        typeBreakdown: asArray(incoming.typeBreakdown),
        categoryBreakdown: asArray(incoming.categoryBreakdown),
        dailyRollups: asArray(incoming.dailyRollups),
        ctrByType: asArray(incoming.ctrByType),
        topSearches: asArray(incoming.topSearches),
        digestClicks: {
            total: asNumber(digest.total),
            variants: asArray(digest.variants),
            frequencies: asArray(digest.frequencies),
            campaigns: asArray(digest.campaigns),
        },
        deepLinkAttribution: {
            total: asNumber(deepLink.total),
            sources: asArray(deepLink.sources),
            mediums: asArray(deepLink.mediums),
            campaigns: asArray(deepLink.campaigns),
        },
        funnel: {
            ...DEFAULT_ANALYTICS.funnel,
            ...(incoming.funnel ?? {}),
        } as NonNullable<AnalyticsData['funnel']>,
        insights: {
            ...DEFAULT_ANALYTICS.insights,
            ...(incoming.insights ?? {}),
        } as NonNullable<AnalyticsData['insights']>,
        comparison: {
            ...(DEFAULT_ANALYTICS.comparison ?? {}),
            ...((incoming.comparison ?? {}) as AnalyticsComparison),
        },
        anomalies: asArray(incoming.anomalies),
    };
};

// CSS-based Donut Chart using conic-gradient
const TYPE_COLORS: Record<string, string> = {
    job: '#38BDF8',
    result: '#34D399',
    'admit-card': '#2DD4BF',
    'answer-key': '#F59E0B',
    syllabus: '#FB7185',
    admission: '#F97316',
};

const METRIC_DEFINITIONS: Record<MetricDefinition['key'], MetricDefinition> = {
    ctr: {
        key: 'ctr',
        label: 'Click-through rate',
        description: 'Percent of listing views that converted into card clicks.',
    },
    drop_off_rate: {
        key: 'drop_off_rate',
        label: 'Drop-off rate',
        description: 'Percent of listing views that did not convert into card clicks.',
    },
    tracking_coverage: {
        key: 'tracking_coverage',
        label: 'Attribution coverage',
        description: 'Share of detail views with recognized attribution source metadata.',
    },
    conversion_rate: {
        key: 'conversion_rate',
        label: 'Conversion rate',
        description: 'Step-to-step completion rate across the engagement funnel.',
    },
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

const buildAreaPath = (values: number[], width: number, height: number) => {
    if (values.length === 0) return '';
    const max = Math.max(1, ...values);
    const step = values.length > 1 ? width / (values.length - 1) : 0;
    const points = values.map((value, index) => {
        const x = values.length > 1 ? index * step : width / 2;
        const y = height - (value / max) * height;
        return { x, y };
    });
    const path = points
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
        .join(' ');
    const last = points[points.length - 1];
    const first = points[0];
    return `${path} L ${last.x.toFixed(2)} ${height} L ${first.x.toFixed(2)} ${height} Z`;
};

const formatShortDate = (value?: string) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(date);
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
    const viewsArea = buildAreaPath(viewValues, width, height);
    const searchesArea = buildAreaPath(searchValues, width, height);

    return (
        <svg className="trend-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Views and searches trend">
            <path className="trend-area views" d={viewsArea} />
            <path className="trend-area searches" d={searchesArea} />
            <path className="trend-line views" d={viewsPath} />
            <path className="trend-line searches" d={searchesPath} />
        </svg>
    );
}

export function AnalyticsDashboard({
    adminToken,
    onEditById,
    onOpenList,
    onDrilldown,
    onMetricDrilldown,
    onUnauthorized,
    onLoadingChange,
    enableUxV2 = true,
    enableV3 = false,
}: {
    adminToken?: string | null;
    onEditById?: (id: string) => void;
    onOpenList?: () => void;
    onDrilldown?: (query: Record<string, string>) => void;
    onMetricDrilldown?: (source: string, query: Record<string, string>) => void;
    onUnauthorized?: () => void;
    onLoadingChange?: (loading: boolean) => void;
    enableUxV2?: boolean;
    enableV3?: boolean;
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
    const [compareDays, setCompareDays] = useState(30);
    const [actionMessage, setActionMessage] = useState<string | null>(null);
    const [showExportPreview, setShowExportPreview] = useState(false);
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const [popularPage, setPopularPage] = useState(0);
    const [showAllEngagementMetrics, setShowAllEngagementMetrics] = useState(false);
    const [numberLocale, setNumberLocale] = useState<NumberLocalePref>(() => {
        if (typeof window === 'undefined') return enableUxV2 ? 'auto' : 'en-IN';
        try {
            const stored = localStorage.getItem('admin_number_locale');
            if (stored === 'auto' || stored === 'en-IN' || stored === 'en-US') {
                if (!enableUxV2 && stored === 'auto') return 'en-IN';
                return stored;
            }
            return enableUxV2 ? 'auto' : 'en-IN';
        } catch {
            return enableUxV2 ? 'auto' : 'en-IN';
        }
    });
    const typeBreakdown = analytics?.typeBreakdown ?? [];
    const categoryBreakdown = analytics?.categoryBreakdown ?? [];

    useEffect(() => {
        if (!actionMessage) return;
        const timer = window.setTimeout(() => setActionMessage(null), 4000);
        return () => window.clearTimeout(timer);
    }, [actionMessage]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem('admin_number_locale', numberLocale);
        } catch {
            // ignore storage errors
        }
    }, [numberLocale]);

    useEffect(() => {
        onLoadingChange?.(loading || refreshing);
    }, [loading, refreshing, onLoadingChange]);

    const sortedTypeBreakdown = useMemo(() => {
        return [...typeBreakdown].sort((a, b) => b.count - a.count);
    }, [typeBreakdown]);

    const sortedCategories = useMemo(() => {
        return [...categoryBreakdown]
            .sort((a, b) => b.count - a.count)
            .slice(0, 12);
    }, [categoryBreakdown]);

    const rollups = analytics?.dailyRollups ?? [];
    const previewRows = useMemo(() => {
        if (!rollups.length) return [];
        return [...rollups].slice(-5).reverse();
    }, [rollups]);
    const resolvedNumberLocale = numberLocale === 'auto'
        ? (typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-IN')
        : numberLocale;
    const formatMetric = useCallback((value: number | null | undefined, fallback = '0') => {
        return formatNumber(typeof value === 'number' ? value : undefined, fallback, numberLocale);
    }, [numberLocale]);
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
    const recentRollups = rollups.slice(-14);
    const last7Rollups = recentRollups.slice(-7);
    const prev7Rollups = recentRollups.slice(0, Math.max(0, recentRollups.length - 7));
    const viewsLast7 = last7Rollups.reduce((sum, item) => sum + (item.views ?? 0), 0);
    const prev7Views = prev7Rollups.reduce((sum, item) => sum + (item.views ?? 0), 0);
    const searchesLast7 = last7Rollups.reduce((sum, item) => sum + (item.searches ?? 0), 0);
    const prev7Searches = prev7Rollups.reduce((sum, item) => sum + (item.searches ?? 0), 0);
    const viewsDeltaPct = prev7Views > 0
        ? Math.round(((viewsLast7 - prev7Views) / prev7Views) * 100)
        : null;
    const searchesDeltaPct = prev7Searches > 0
        ? Math.round(((searchesLast7 - prev7Searches) / prev7Searches) * 100)
        : null;

    const loadAnalytics = useCallback(async (options?: { silent?: boolean; forceFresh?: boolean }) => {
        if (options?.silent) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const nocache = options?.forceFresh ? '&nocache=1' : '';
            const compareParam = enableV3 ? `&compareDays=${compareDays}` : '';
            const headers = adminToken ? { Authorization: `Bearer ${adminToken}` } : undefined;
            const onRateLimit = (response: Response) => {
                const retryAfter = response.headers.get('Retry-After');
                setError(retryAfter
                    ? `Too many requests. Try again in ${retryAfter}s.`
                    : 'Too many requests. Please wait and try again.');
            };
            const [overviewRes, popularRes] = await Promise.all([
                adminRequest(`${apiBase}/api/analytics/overview?days=${rangeDays}${compareParam}${nocache}`, {
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
                setAnalytics(normalizeAnalyticsData(overviewData.data));
                setPopular(asArray<PopularAnnouncement>(popularData.data));
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
    }, [adminToken, compareDays, enableV3, rangeDays, onUnauthorized]);

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
                    setAnalytics(normalizeAnalyticsData(message.data));
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

    const openMetricDrilldown = (source: string, query: Record<string, string>) => {
        if (onDrilldown) {
            onDrilldown(query);
            onMetricDrilldown?.(source, query);
            return;
        }
        onOpenList?.();
        onMetricDrilldown?.(source, query);
    };

    if (loading) {
        return <div className="analytics-loading">Loading analytics...</div>;
    }

    if (error) {
        return <div className="analytics-error">Error: {error}</div>;
    }

    if (!analytics) return null;
    const engagementWindow = analytics.engagementWindowDays ?? 30;
    const primaryCardClicks = analytics.totalCardClicksInApp
        ?? analytics.funnel?.cardClicksInApp
        ?? analytics.funnel?.cardClicks
        ?? analytics.totalCardClicks;
    const ctr = analytics.totalListingViews > 0
        ? Math.round((primaryCardClicks / analytics.totalListingViews) * 100)
        : 0;
    const ctrByType = analytics.ctrByType ?? [];
    const digestClicks = analytics.digestClicks;
    const deepLinkAttribution = analytics.deepLinkAttribution;
    const topSearches = analytics.topSearches ?? [];
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
    const viewTrendMode = insights?.viewTrendMode ?? 'normal';
    const viewTrendDirection = insights?.viewTrendDirection ?? (viewTrendPct > 2 ? 'up' : viewTrendPct < -2 ? 'down' : 'flat');
    const viewTrendLabel = viewTrendDirection === 'up'
        ? `Up ${Math.abs(viewTrendPct)}%`
        : viewTrendDirection === 'down'
            ? `Down ${Math.abs(viewTrendPct)}%`
            : 'Stable';
    const rollupAge = insights?.rollupAgeMinutes ?? null;
    const insightCtr = insights?.clickThroughRate ?? ctr;
    const ctrTone = insightCtr >= 10 ? 'good' : insightCtr >= 5 ? 'warn' : 'bad';
    const funnelDropTone = (insights?.funnelDropRate ?? 0) >= 80 ? 'bad' : (insights?.funnelDropRate ?? 0) >= 60 ? 'warn' : 'good';
    const trendTone = viewTrendDirection === 'up' ? 'good' : viewTrendDirection === 'down' ? 'bad' : 'warn';
    const totalTypeCount = sortedTypeBreakdown.reduce((sum, item) => sum + item.count, 0);
    const viewsDeltaTone = viewsDeltaPct === null ? 'flat' : viewsDeltaPct >= 0 ? 'up' : 'down';
    const searchesDeltaTone = searchesDeltaPct === null ? 'flat' : searchesDeltaPct >= 0 ? 'up' : 'down';
    const comparison = analytics.comparison ?? DEFAULT_ANALYTICS.comparison!;
    const anomalies = analytics.anomalies ?? [];
    const trendListRows = trendRows.slice(-10).reverse();
    const POPULAR_PAGE_SIZE = 5;
    const popularTotalPages = Math.max(1, Math.ceil(popular.length / POPULAR_PAGE_SIZE));
    const safePopularPage = Math.min(popularPage, popularTotalPages - 1);
    const popularItems = popular.slice(safePopularPage * POPULAR_PAGE_SIZE, (safePopularPage + 1) * POPULAR_PAGE_SIZE);
    const funnel = analytics.funnel;
    const rawDetailViews = funnel?.detailViewsRaw ?? funnel?.detailViews ?? 0;
    const adjustedDetailViews = funnel?.detailViewsAdjusted ?? funnel?.detailViews ?? 0;
    const detailViewsDirect = funnel?.detailViewsDirect ?? 0;
    const detailViewsUnattributed = funnel?.detailViewsUnattributed ?? 0;
    const hasAnomaly = insights?.healthFlags?.inAppClickCollapse
        ?? funnel?.hasAnomaly
        ?? false;
    const funnelHasDirectTraffic = !hasAnomaly && (detailViewsDirect > 0 || detailViewsUnattributed > 0);
    const detailViewsLabel = 'Detail views (in-app)';
    const attributionCoverage = insights?.attributionCoveragePct;
    const finalCoverage = typeof attributionCoverage === 'number'
        ? attributionCoverage
        : (insights?.listingCoverage ?? 0);
    const finalCoverageTone = finalCoverage >= 80 ? 'good' : finalCoverage >= 50 ? 'warn' : 'bad';
    const coverageMetaText = finalCoverage === 0
        ? 'No attributed detail views in this window. Verify source tagging on in-app links.'
        : finalCoverage < 50
            ? 'Many detail views are unattributed. Review source-tag normalization and URL attribution.'
            : 'Attributed detail views vs total detail views';
    const showCoverageAction = finalCoverage === 0 && rawDetailViews > 0;
    const lowCtrThreshold = 5;
    const minViewsForCtrFlag = 20;
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
            rateLabel: 'In-app attributed detail views',
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

    const engagementCards = [
        { label: 'Searches', value: analytics.totalSearches, category: 'traffic' as const },
        { label: 'Bookmarks', value: analytics.totalBookmarks, category: 'engagement' as const },
        { label: 'Registrations', value: analytics.totalRegistrations, category: 'conversion' as const },
        { label: 'Unsubscribes', value: analytics.totalSubscriptionsUnsubscribed, category: 'risk' as const },
        { label: 'Listing views', value: analytics.totalListingViews, category: 'traffic' as const },
        { label: 'Card clicks (in-app)', value: primaryCardClicks, category: 'engagement' as const },
        ...(analytics.totalCardClicks > primaryCardClicks
            ? [{ label: 'Card clicks (all sources)', value: analytics.totalCardClicks, category: 'traffic' as const }]
            : []),
        { label: 'Category clicks', value: analytics.totalCategoryClicks, category: 'engagement' as const },
        { label: 'Filter applies', value: analytics.totalFilterApplies, category: 'engagement' as const },
        { label: 'CTR', value: insightCtr, category: 'conversion' as const, suffix: '%' },
        { label: 'Digest clicks', value: analytics.totalDigestClicks ?? 0, category: 'engagement' as const },
        { label: 'Deep link clicks', value: analytics.totalDeepLinkClicks ?? 0, category: 'traffic' as const },
    ];

    const visibleEngagementCards = enableUxV2 && !showAllEngagementMetrics
        ? engagementCards.slice(0, 8)
        : engagementCards;

    const isBaselineTrend = viewTrendMode === 'baseline'
        || (rollups.length <= 7 && prev7Views === 0 && viewsLast7 > 0);
    const displayTrendLabel = isBaselineTrend ? 'New baseline' : viewTrendLabel;
    const displayTrendTone = isBaselineTrend ? 'good' : trendTone;

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
    const rollupFreshness = formatLastUpdated(analytics.rollupLastUpdatedAt ?? null);

    return (
        <div className={`analytics-dashboard ${refreshing ? 'refreshing' : ''}`}>
            <div className="analytics-actions">
                <div className="analytics-actions-left">
                    <span className="analytics-subtitle">
                        {enableUxV2
                            ? 'Export rollups and monitor trends.'
                            : `Export rollups for the last ${engagementWindow} days.`}
                    </span>
                    {enableUxV2 && <span className="window-badge">{engagementWindow} day window</span>}
                    <span className="analytics-freshness">{rollupFreshness}</span>
                    <div className="range-toggle">
                        {[7, 30, 90].map((days) => (
                            <button
                                key={days}
                                className={`admin-btn secondary small ${rangeDays === days ? 'active' : ''}`}
                                onClick={() => setRangeDays(days)}
                                aria-pressed={rangeDays === days}
                            >
                                {days} days
                            </button>
                        ))}
                    </div>
                    {enableV3 && (
                        <div className="range-toggle compare-toggle">
                            <span className="compare-label">Compare</span>
                            {[7, 30].map((days) => (
                                <button
                                    key={`compare-${days}`}
                                    className={`admin-btn secondary small ${compareDays === days ? 'active' : ''}`}
                                    onClick={() => setCompareDays(days)}
                                    aria-pressed={compareDays === days}
                                >
                                    {days}d
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="locale-toggle">
                        <label htmlFor="number-locale">Number format</label>
                        <select
                            id="number-locale"
                            value={numberLocale}
                            onChange={(event) => setNumberLocale(event.target.value as NumberLocalePref)}
                        >
                            {enableUxV2 && (
                                <option value="auto">Auto ({typeof navigator !== 'undefined' ? navigator.language : 'Browser'})</option>
                            )}
                            <option value="en-IN">India</option>
                            <option value="en-US">International</option>
                        </select>
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
                    aria-pressed={liveEnabled}
                    title={liveEnabled ? 'Click to pause live updates' : 'Click to resume live updates'}
                >
                    {liveEnabled ? '⏸ Pause live' : '▶ Resume live'}
                </button>
                <button
                    className="admin-btn secondary"
                    onClick={() => loadAnalytics({ silent: true })}
                    disabled={refreshing}
                >
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
                <div className="export-dropdown-wrap">
                    <button
                        className="admin-btn secondary"
                        onClick={() => setShowExportDropdown((prev) => !prev)}
                        aria-expanded={showExportDropdown}
                        aria-haspopup="true"
                    >
                        {enableUxV2 ? 'Export options ▾' : 'Export ▾'}
                    </button>
                    {showExportDropdown && (
                        <div className="export-dropdown-menu" role="menu">
                            <button
                                role="menuitem"
                                onClick={() => { setShowExportPreview((prev) => !prev); setShowExportDropdown(false); }}
                            >
                                {enableUxV2
                                    ? (showExportPreview ? 'Hide preview table' : 'Preview export table')
                                    : (showExportPreview ? '👁 Hide preview' : '👁 Preview export')}
                            </button>
                            <div className="export-dropdown-divider" />
                            <button
                                role="menuitem"
                                onClick={() => { handleExport(); setShowExportDropdown(false); }}
                                disabled={exporting}
                            >
                                {enableUxV2
                                    ? (exporting ? 'Exporting CSV…' : 'Download CSV file')
                                    : (exporting ? '⏳ Exporting…' : '📥 Download CSV')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {actionMessage && (
                <div className="analytics-note" role="status">{actionMessage}</div>
            )}
            {enableV3 && (
                <div className="analytics-comparison-grid" aria-label="Comparison metrics">
                    <div className={`comparison-card ${comparison.viewsDeltaPct >= 0 ? 'up' : 'down'}`}>
                        <div className="comparison-label">Views delta</div>
                        <div className="comparison-value">{comparison.viewsDeltaPct}%</div>
                        <div className="comparison-meta">vs previous {comparison.compareDays} days</div>
                    </div>
                    <div className={`comparison-card ${comparison.searchesDeltaPct >= 0 ? 'up' : 'down'}`}>
                        <div className="comparison-label">Search delta</div>
                        <div className="comparison-value">{comparison.searchesDeltaPct}%</div>
                        <div className="comparison-meta">vs previous {comparison.compareDays} days</div>
                    </div>
                    <div className={`comparison-card ${comparison.ctrDeltaPct >= 0 ? 'up' : 'down'}`}>
                        <div className="comparison-label">CTR delta</div>
                        <div className="comparison-value">{comparison.ctrDeltaPct}%</div>
                        <div className="comparison-meta">vs previous {comparison.compareDays} days</div>
                    </div>
                    <div className={`comparison-card ${comparison.dropOffDeltaPct <= 0 ? 'up' : 'down'}`}>
                        <div className="comparison-label">Drop-off delta</div>
                        <div className="comparison-value">{comparison.dropOffDeltaPct}%</div>
                        <div className="comparison-meta">vs previous {comparison.compareDays} days</div>
                    </div>
                </div>
            )}
            {enableV3 && anomalies.length > 0 && (
                <div className="analytics-section">
                    <div className="analytics-section-header">
                        <div>
                            <h3>Anomaly watch</h3>
                            <p className="analytics-subtitle">Segments that need action now.</p>
                        </div>
                    </div>
                    <div className="anomaly-grid">
                        {anomalies.map((anomaly) => (
                            <div key={anomaly.key} className={`anomaly-card ${anomaly.severity}`}>
                                <div className="anomaly-title">
                                    <span className={`anomaly-severity ${anomaly.severity}`}>{anomaly.severity}</span>
                                    <span>{anomaly.key.replace(/_/g, ' ')}</span>
                                </div>
                                <p>{anomaly.message}</p>
                                {anomaly.targetQuery && (
                                    <button
                                        className="admin-btn secondary small"
                                        onClick={() => openMetricDrilldown(anomaly.key, anomaly.targetQuery as Record<string, string>)}
                                    >
                                        Fix now
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {showExportPreview && (
                <div className="analytics-preview">
                    <div className="analytics-preview-header">
                        <h4>Export preview</h4>
                        <span className="analytics-preview-meta">Showing the latest {previewRows.length} rollups</span>
                    </div>
                    {previewRows.length === 0 ? (
                        <div className="empty-state">
                            <span className="empty-state-icon" aria-hidden="true">📊</span>
                            <span>No rollup data yet. Generate traffic to preview exports.</span>
                        </div>
                    ) : (
                        <table className="analytics-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th className="numeric">Views</th>
                                    <th className="numeric">Searches</th>
                                    <th className="numeric">Listing views</th>
                                    <th className="numeric">Card clicks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {previewRows.map((row) => (
                                    <tr key={row.date}>
                                        <td>{formatShortDate(row.date)}</td>
                                        <td className="numeric">{formatMetric(row.views)}</td>
                                        <td className="numeric">{formatMetric(row.searches)}</td>
                                        <td className="numeric">{formatMetric(row.listingViews)}</td>
                                        <td className="numeric">{formatMetric(row.cardClicks)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
            <div className="kpi-grid">
                {enableUxV2 ? (
                    <>
                        <KpiCard
                            label="Views last 7 days"
                            value={formatMetric(viewsLast7)}
                            sub="Highlights recent demand"
                            delta={viewsDeltaPct === null ? 'No prior 7d data' : `${viewsDeltaPct > 0 ? '+' : ''}${viewsDeltaPct}% vs prev 7d`}
                            deltaTone={viewsDeltaTone}
                            tone="traffic"
                        />
                        <KpiCard
                            label="CTR last 30 days"
                            value={`${ctr}%`}
                            sub="Card clicks / listing views"
                            tone="conversion"
                            title={`CTR tone: ${ctrTone || 'neutral'} — ${ctr >= 10 ? 'Good (≥10%)' : ctr >= 5 ? 'Moderate (5–9%)' : 'Low (<5%)'}`}
                        />
                        <KpiCard
                            label="Searches last 7 days"
                            value={formatMetric(searchesLast7)}
                            sub="Keyword interest trend"
                            delta={searchesDeltaPct === null ? 'No prior 7d data' : `${searchesDeltaPct > 0 ? '+' : ''}${searchesDeltaPct}% vs prev 7d`}
                            deltaTone={searchesDeltaTone}
                            tone="engagement"
                        />
                    </>
                ) : (
                    <>
                        <div className="kpi-card">
                            <div className="kpi-label">Views last 7 days</div>
                            <div className="kpi-value">{formatMetric(viewsLast7)}</div>
                            <div className="kpi-sub">Highlights recent demand</div>
                            <div className={`kpi-delta ${viewsDeltaTone}`}>
                                {viewsDeltaPct === null ? 'No prior 7d data' : `${viewsDeltaPct > 0 ? '+' : ''}${viewsDeltaPct}% vs prev 7d`}
                            </div>
                        </div>
                        <div className={`kpi-card ${ctrTone}`} title={`CTR tone: ${ctrTone || 'neutral'} — ${ctr >= 10 ? 'Good (≥10%)' : ctr >= 5 ? 'Moderate (5–9%)' : 'Low (<5%)'}`}>
                            <div className="kpi-label">CTR last 30 days</div>
                            <div className="kpi-value">{ctr}%</div>
                            <div className="kpi-sub">Card clicks / listing views</div>
                        </div>
                        <div className="kpi-card">
                            <div className="kpi-label">Searches last 7 days</div>
                            <div className="kpi-value">{formatMetric(searchesLast7)}</div>
                            <div className="kpi-sub">Keyword interest trend</div>
                            <div className={`kpi-delta ${searchesDeltaTone}`}>
                                {searchesDeltaPct === null ? 'No prior 7d data' : `${searchesDeltaPct > 0 ? '+' : ''}${searchesDeltaPct}% vs prev 7d`}
                            </div>
                        </div>
                    </>
                )}
            </div>
            {/* Quick Actions */}
            <QuickActions
                expiringThisWeek={0}
                pendingReview={0}
                onViewExpiring={onOpenList}
                onViewPending={onOpenList}
            />
            <div className="analytics-section">
                <div className="analytics-section-header">
                    <div>
                        <h3>Weekly Trend</h3>
                        <p className="analytics-subtitle">Views and searches across the last {rangeDays} days.</p>
                    </div>
                    {enableUxV2 && <span className="window-badge">Range: {rangeDays} days</span>}
                    {zeroTrendCount > 0 && (
                        <div className="trend-toggle">
                            <button
                                type="button"
                                className="admin-btn secondary small"
                                onClick={() => setShowZeroTrend((prev) => !prev)}
                            >
                                {showZeroTrend ? 'Hide days with no traffic' : `Include ${zeroTrendCount} days with no traffic`}
                            </button>
                        </div>
                    )}
                </div>
                {trendRows.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-state-icon" aria-hidden="true">📈</span>
                        <span>No rollup data yet. Publish a few announcements to start tracking trends.</span>
                    </div>
                ) : (
                    <>
                        <div className="trend-chart-wrap">
                            <div className="trend-legend">
                                <span className="legend-item views">Views</span>
                                <span className="legend-item searches">Searches</span>
                            </div>
                            <TrendChart data={trendRows.map((item) => ({
                                date: item.date,
                                views: item.views ?? 0,
                                searches: item.searches ?? 0,
                            }))} />
                        </div>
                        <div className="trend-list">
                            {trendListRows.map((item) => (
                                <div key={item.date} className="trend-row">
                                    <div className="trend-date">{formatShortDate(item.date)}</div>
                                    <div className="trend-bars" aria-hidden="true">
                                        <span
                                            className="trend-bar views"
                                            style={{ width: `${Math.min(100, Math.round(((item.views ?? 0) / maxViews) * 100))}%` }}
                                        />
                                        <span
                                            className="trend-bar searches"
                                            style={{ width: `${Math.min(100, Math.round(((item.searches ?? 0) / maxSearches) * 100))}%` }}
                                        />
                                    </div>
                                    <div className="trend-values">
                                        {formatMetric(item.views)} / {formatMetric(item.searches)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card views">
                    <div className="stat-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg></div>
                    <div className="stat-info">
                        <div className="stat-value">{formatMetric(analytics.totalViews)}</div>
                        <div className="stat-label">Total Views</div>
                        <div className="stat-meta">
                            <MiniSparkline
                                data={rollups.slice(-7).map(r => r.views ?? 0)}
                                color="blue"
                                height={24}
                                width={60}
                                locale={resolvedNumberLocale}
                            />
                        </div>
                    </div>
                </div>
                <div className="stat-card posts">
                    <div className="stat-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg></div>
                    <div className="stat-info">
                        <div className="stat-value">{formatMetric(analytics.totalAnnouncements)}</div>
                        <div className="stat-label">Announcements</div>
                        <div className="stat-meta">Published + scheduled</div>
                    </div>
                </div>
                <div className="stat-card subscribers">
                    <div className="stat-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg></div>
                    <div className="stat-info">
                        <div className="stat-value">{formatMetric(analytics.totalEmailSubscribers)}</div>
                        <div className="stat-label">Email Subscribers</div>
                        <div className="stat-meta">
                            {analytics.totalEmailSubscribers > 0
                                ? 'Verified opt-ins'
                                : 'No subscribers yet. Set up email capture to activate this channel.'}
                        </div>
                    </div>
                </div>
                <div className="stat-card push">
                    <div className="stat-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg></div>
                    <div className="stat-info">
                        <div className="stat-value">{formatMetric(analytics.totalPushSubscribers)}</div>
                        <div className="stat-label">Push Subscribers</div>
                        <div className="stat-meta">
                            {analytics.totalPushSubscribers > 0
                                ? 'Active devices'
                                : 'No devices subscribed yet. Prompt users to enable notifications.'}
                        </div>
                    </div>
                </div>
            </div>

            <div className={`analytics-section ${digestNotConfigured || digestHasNoData ? 'section-muted' : ''}`}>
                <div className="analytics-section-header">
                    <div>
                        <h3>Engagement Overview</h3>
                        <p className="analytics-subtitle">Searches, bookmarks, and signups from the last {engagementWindow} days.</p>
                    </div>
                    {enableUxV2 && <span className="window-badge">{engagementWindow} day window</span>}
                    <span className="analytics-updated">{formatLastUpdated(analytics.rollupLastUpdatedAt ?? null)}</span>
                </div>
                <div className="engagement-grid">
                    {visibleEngagementCards.map((item) => (
                        <div key={item.label} className={`engagement-card metric-${item.category} ${item.label === 'CTR' ? ctrTone : ''}`}>
                            <div className="engagement-label">
                                {item.label}
                                {item.label === 'CTR' && (
                                    <MetricDefinitionTooltip definition={METRIC_DEFINITIONS.ctr} />
                                )}
                            </div>
                            <div className="engagement-value">
                                {item.suffix ? `${item.value}${item.suffix}` : formatMetric(item.value)}
                            </div>
                        </div>
                    ))}
                </div>
                {enableUxV2 && engagementCards.length > 8 && (
                    <button
                        type="button"
                        className="admin-btn secondary small"
                        onClick={() => setShowAllEngagementMetrics((prev) => !prev)}
                    >
                        {showAllEngagementMetrics ? 'Show fewer metrics' : `Show more metrics (${engagementCards.length - 8})`}
                    </button>
                )}
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
                        <h3>Content Mix</h3>
                        <p className="analytics-subtitle">Distribution of announcements by type and top categories.</p>
                    </div>
                </div>
                {totalTypeCount === 0 ? (
                    <div className="empty-state">
                        <span className="empty-state-icon" aria-hidden="true">🗂️</span>
                        <span>No content breakdown yet. Create announcements to see distribution.</span>
                    </div>
                ) : (
                    <>
                        <div className="chart-container">
                            <div className="donut-chart">
                                <DonutChart data={sortedTypeBreakdown} total={totalTypeCount} />
                                <div className="donut-center">
                                    <div className="donut-value">{formatMetric(totalTypeCount)}</div>
                                    <div className="donut-label">Total posts</div>
                                </div>
                            </div>
                            <div className="type-breakdown">
                                {sortedTypeBreakdown.map((item) => {
                                    const share = totalTypeCount > 0 ? Math.round((item.count / totalTypeCount) * 100) : 0;
                                    return (
                                        <div key={item.type} className="breakdown-item">
                                            <span className={`type-badge ${item.type}`}>{item.type}</span>
                                            <div className="breakdown-bar" aria-hidden="true">
                                                <span
                                                    className="breakdown-fill"
                                                    style={{
                                                        width: `${share}%`,
                                                        background: TYPE_COLORS[item.type] || 'var(--border-light)',
                                                    }}
                                                />
                                            </div>
                                            <span className="breakdown-count">{formatMetric(item.count)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="analytics-hint">Higher coverage means more content variety. Aim for balanced distribution across types.</div>
                        <div className="category-chips">
                            {sortedCategories.length === 0 ? (
                                <span className="digest-chip">No categories tracked yet</span>
                            ) : (
                                sortedCategories.map((item) => (
                                    <span key={item.category} className="category-chip">
                                        {item.category}
                                        <span className="category-count">{formatMetric(item.count)}</span>
                                    </span>
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>

            <div className="analytics-section">
                <div className="analytics-section-header">
                    <div>
                        <h3>Top Searches</h3>
                        <p className="analytics-subtitle">Most frequent search terms in the last {engagementWindow} days.</p>
                    </div>
                    {enableUxV2 && <span className="window-badge">{engagementWindow} day window</span>}
                </div>
                {topSearches.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-state-icon" aria-hidden="true">🔍</span>
                        <span>No search terms tracked yet. Users need to search to populate this section.</span>
                    </div>
                ) : (
                    <table className="analytics-table">
                        <thead>
                            <tr>
                                <th>Query</th>
                                <th className="numeric">Count</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topSearches.map((item) => (
                                <tr key={item.query}>
                                    <td>{item.query}</td>
                                    <td className="numeric">{formatMetric(item.count)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                <p className="analytics-hint">Search terms are normalized (lowercase) and capped at 80 characters.</p>
            </div>

            <div className="analytics-section">
                <div className="analytics-section-header">
                    <div>
                        <h3>Popular Announcements</h3>
                        <p className="analytics-subtitle">Top viewed announcements in the last {rangeDays} days.</p>
                    </div>
                    <button
                        className="admin-btn secondary small"
                        onClick={onOpenList}
                        type="button"
                    >
                        Open content list
                    </button>
                </div>
                {popular.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-state-icon" aria-hidden="true">🏆</span>
                        <span>No popular announcements yet. Views will appear after traffic arrives.</span>
                    </div>
                ) : (
                    <>
                        <table className="analytics-table popular-table">
                            <thead>
                                <tr>
                                    <th>Announcement</th>
                                    <th className="numeric">Views</th>
                                    <th>Status</th>
                                    <th className="numeric">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {popularItems.map((item) => (
                                    <tr key={item.id}>
                                        <td>
                                            <div className="popular-title">
                                                <span className={`type-badge ${item.type}`}>{item.type}</span>
                                                <span>{item.title}</span>
                                            </div>
                                            <span className="popular-meta">{item.category || 'Uncategorized'}</span>
                                        </td>
                                        <td className="numeric">{formatMetric(item.viewCount)}</td>
                                        <td>
                                            <span className={`status-pill ${item.status === 'published' ? 'success' : item.status === 'archived' ? 'muted' : 'warning'}`}>
                                                {item.status ?? 'published'}
                                            </span>
                                        </td>
                                        <td className="numeric">
                                            <div className="popular-actions">
                                                <button
                                                    className="admin-btn secondary small"
                                                    type="button"
                                                    onClick={() => handlePopularView(item)}
                                                >
                                                    View
                                                </button>
                                                {enableUxV2 ? (
                                                    <ActionOverflowMenu
                                                        itemLabel={item.title}
                                                        actions={[
                                                            { id: 'edit', label: 'Edit', onClick: () => handlePopularEdit(item) },
                                                            {
                                                                id: 'publish_toggle',
                                                                label: item.status === 'published' ? 'Unpublish' : 'Archive',
                                                                onClick: () => handlePopularUnpublish(item),
                                                                tone: 'warning',
                                                            },
                                                            { id: 'boost', label: 'Boost', onClick: handlePopularBoost, tone: 'info' },
                                                        ]}
                                                    />
                                                ) : (
                                                    <>
                                                        <button
                                                            className="admin-btn secondary small"
                                                            type="button"
                                                            onClick={() => handlePopularEdit(item)}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            className="admin-btn warning small"
                                                            type="button"
                                                            onClick={() => handlePopularUnpublish(item)}
                                                        >
                                                            Unpublish
                                                        </button>
                                                        <button
                                                            className="admin-btn info small"
                                                            type="button"
                                                            onClick={handlePopularBoost}
                                                        >
                                                            Boost
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {popular.length > POPULAR_PAGE_SIZE && (
                            <div className="table-pagination">
                                <span>Showing {safePopularPage * POPULAR_PAGE_SIZE + 1}–{Math.min((safePopularPage + 1) * POPULAR_PAGE_SIZE, popular.length)} of {popular.length}</span>
                                <div className="table-pagination-controls">
                                    <button
                                        className="admin-btn secondary small"
                                        disabled={safePopularPage === 0}
                                        onClick={() => setPopularPage((p) => Math.max(0, p - 1))}
                                        type="button"
                                    >
                                        ← Prev
                                    </button>
                                    <span>{safePopularPage + 1} / {popularTotalPages}</span>
                                    <button
                                        className="admin-btn secondary small"
                                        disabled={safePopularPage >= popularTotalPages - 1}
                                        onClick={() => setPopularPage((p) => Math.min(popularTotalPages - 1, p + 1))}
                                        type="button"
                                    >
                                        Next →
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="analytics-section">
                <div className="analytics-section-header">
                    <div>
                        <h3>Insights</h3>
                        <p className="analytics-subtitle">Automated signals from the most recent rollups.</p>
                    </div>
                    {enableUxV2 && <span className="window-badge">{engagementWindow} day window</span>}
                </div>
                <div className="insights-grid">
                    <div className={`insight-card ${displayTrendTone}`}>
                        <div className="insight-label">Weekly views trend</div>
                        <div className={`insight-value ${isBaselineTrend ? 'flat' : viewTrendDirection}`}>{displayTrendLabel}</div>
                        <div className="insight-meta">{formatMetric(viewsLast7)} vs {formatMetric(prev7Views)} views</div>
                    </div>
                    <div className={`insight-card ${ctrTone}`}>
                        <div className="insight-label" title={!enableUxV2 ? 'Click-Through Rate: percentage of listing views that resulted in card clicks' : undefined}>
                            Click-through rate
                            {enableUxV2 && <MetricDefinitionTooltip definition={METRIC_DEFINITIONS.ctr} />}
                        </div>
                        <div className="insight-value">{insightCtr}%</div>
                        <div className="insight-meta">From listing views to card clicks</div>
                    </div>
                    <div className={`insight-card ${funnelDropTone}`}>
                        <div className="insight-label" title={!enableUxV2 ? 'Percentage of listing views that did not result in a card click' : undefined}>
                            Drop-off rate
                            {enableUxV2 && <MetricDefinitionTooltip definition={METRIC_DEFINITIONS.drop_off_rate} />}
                        </div>
                        <div className="insight-value">{insights?.funnelDropRate ?? 0}%</div>
                        <div className="insight-meta">Listing views not clicked</div>
                    </div>
                    <div className={`insight-card ${finalCoverageTone}`}>
                        <div className="insight-label" title={!enableUxV2 ? 'Percent of detail views carrying recognized source attribution' : undefined}>
                            Tracking coverage
                            {enableUxV2 && <MetricDefinitionTooltip definition={METRIC_DEFINITIONS.tracking_coverage} />}
                        </div>
                        <div className="insight-value">{finalCoverage.toFixed(1)}%</div>
                        <div className="insight-meta">{coverageMetaText}</div>
                        {showCoverageAction && (
                            <button
                                className="admin-btn secondary small insight-action"
                                onClick={() => setActionMessage('Attribution coverage is based on detail-view source tags. Ensure in-app links include source and backend source normalization maps those tags to in_app.')}
                            >
                                Fix tracking coverage
                            </button>
                        )}
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
                    {hasAnomaly && (
                        <div className="insight-card warning">
                            <div className="insight-label">Data anomaly</div>
                            <div className="insight-value">Check funnel</div>
                            <div className="insight-meta">In-app click collapse or unattributed detail-view spike detected</div>
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
                    {enableUxV2 && (
                        <span className="window-badge">
                            {engagementWindow} day window <MetricDefinitionTooltip definition={METRIC_DEFINITIONS.conversion_rate} />
                        </span>
                    )}
                </div>
                <div className="funnel-grid">
                    {funnelSteps.map((step, index) => (
                        <div key={step.label} className="funnel-card">
                            <div
                                className="funnel-label"
                                title={step.label === detailViewsLabel ? 'In-app attributed detail views only' : undefined}
                            >
                                {step.label}
                                {step.label === detailViewsLabel && (
                                    <button
                                        type="button"
                                        className="info-icon"
                                        aria-label="In-app detail views include only recognized in-app source attribution"
                                        title="In-app detail views include only recognized in-app source attribution"
                                    >
                                        ⓘ
                                    </button>
                                )}
                            </div>
                            <div className="funnel-value">{formatMetric(step.value)}</div>
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
                        <strong>Warning: Funnel anomaly.</strong> In-app clicks ({formatMetric(funnel?.cardClicks)}) are not keeping pace with in-app detail views ({formatMetric(adjustedDetailViews)}).
                        <br />
                        Raw detail views ({formatMetric(rawDetailViews)}) include direct and unattributed traffic. Direct: {formatMetric(detailViewsDirect)}, Unattributed: {formatMetric(detailViewsUnattributed)}.
                        <div className="analytics-suggestion">Suggestion: verify in-app source tagging and attribution normalization before acting on conversion drop signals.</div>
                    </div>
                )}
                {funnelHasDirectTraffic && !hasAnomaly && (
                    <p className="analytics-hint">
                        Raw detail views include traffic outside in-app navigation paths. Direct: {formatMetric(detailViewsDirect)}, Unattributed: {formatMetric(detailViewsUnattributed)}.
                    </p>
                )}
            </div>

            <div className="analytics-section">
                <div className="analytics-section-header">
                    <div>
                        <h3>CTR by Listing Type</h3>
                        <p className="analytics-subtitle">Card clicks per listing view, grouped by type.</p>
                    </div>
                    {enableUxV2 && <span className="window-badge">{engagementWindow} day window</span>}
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
                                {ctrByType.map((item) => (
                                    <tr key={item.type}>
                                        <td>
                                            <span className={`type-badge ${item.type}`}>{item.type}</span>
                                            {item.ctr < lowCtrThreshold && item.listingViews > minViewsForCtrFlag && (
                                                <span className="ctr-flag" title="Low CTR" aria-label={`Low CTR for ${item.type}`}>Low CTR</span>
                                            )}
                                        </td>
                                        <td className="numeric">{formatMetric(item.listingViews)}</td>
                                        <td className="numeric">{formatMetric(item.cardClicks)}</td>
                                        <td className="numeric">
                                            <div className="ctr-cell">
                                                <span className="ctr-value">{item.ctr}%</span>
                                                <span className="ctr-bar">
                                                    <span style={{ width: `${Math.min(100, Math.max(item.ctr, item.ctr > 0 ? 5 : 0))}%` }} />
                                                </span>
                                                {enableV3 && (
                                                    <button
                                                        type="button"
                                                        className="admin-btn secondary small ctr-drilldown-btn"
                                                        onClick={() => openMetricDrilldown('ctr_by_type', {
                                                            tab: 'list',
                                                            type: item.type,
                                                            status: 'published',
                                                            sort: 'views',
                                                            mode: 'ctr',
                                                        })}
                                                    >
                                                        Open list
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
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
                                <div className="digest-value">{formatMetric(digestClicks.total)}</div>
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
                                <div className="digest-value">{formatMetric(deepLinkAttribution.total)}</div>
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
        </div>
    );
}

