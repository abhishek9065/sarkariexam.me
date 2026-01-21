import { useState, useEffect, useMemo } from 'react';
import './AnalyticsDashboard.css';

const apiBase = import.meta.env.VITE_API_BASE ?? '';

interface AnalyticsData {
    totalAnnouncements: number;
    totalViews: number;
    totalEmailSubscribers: number;
    totalPushSubscribers: number;
    typeBreakdown: { type: string; count: number }[];
    categoryBreakdown: { category: string; count: number }[];
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

    useEffect(() => {
        const fetchAnalytics = async () => {
            if (!adminToken) {
                setError('Not authenticated');
                setLoading(false);
                return;
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
                        typeBreakdown: [],
                        categoryBreakdown: []
                    });
                    setPopular(popularData.data ?? []);
                } else {
                    setError('Failed to load analytics');
                }
            } catch {
                setError('Failed to connect to server');
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [adminToken]);

    if (loading) {
        return <div className="analytics-loading">Loading analytics...</div>;
    }

    if (error) {
        return <div className="analytics-error">Error: {error}</div>;
    }

    if (!analytics) return null;

    const sortedTypeBreakdown = useMemo(() => {
        return [...(analytics.typeBreakdown ?? [])].sort((a, b) => b.count - a.count);
    }, [analytics]);

    const sortedCategories = useMemo(() => {
        return [...(analytics.categoryBreakdown ?? [])]
            .sort((a, b) => b.count - a.count)
            .slice(0, 12);
    }, [analytics]);

    return (
        <div className="analytics-dashboard">
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
                <h3>Most Popular Announcements</h3>
                <table className="analytics-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Title</th>
                            <th>Type</th>
                            <th>Views</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(popular ?? []).map((item, index) => (
                            <tr key={item.id}>
                                <td>{index + 1}</td>
                                <td>{item.title.substring(0, 50)}{item.title.length > 50 ? '...' : ''}</td>
                                <td><span className={`type-badge ${item.type}`}>{item.type}</span></td>
                                <td className="view-count">{(item.viewCount ?? 0).toLocaleString()}</td>
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
