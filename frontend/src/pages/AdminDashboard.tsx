import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../utils';
import { formatNumber } from '../utils/formatters';
import { adminRequest } from '../utils/adminRequest';
import './AdminDashboard.css';

interface DashboardStats {
    totalAnnouncements: number;
    totalUsers: number;
    totalViews: number;
    totalBookmarks: number;
    activeJobs: number;
    expiringSoon: number;
    newToday: number;
    newThisWeek: number;
}

interface CategoryStats {
    type: string;
    count: number;
    views: number;
}

interface TrendData {
    date: string;
    count: number;
    views: number;
}

interface TopContent {
    id: string;
    title: string;
    type: string;
    views: number;
    organization: string;
}

interface UserStats {
    totalUsers: number;
    newToday: number;
    newThisWeek: number;
    activeSubscribers: number;
}

interface DashboardData {
    overview: DashboardStats;
    categories: CategoryStats[];
    trends: TrendData[];
    topContent: TopContent[];
    users: UserStats;
}

export function AdminDashboard() {
    const navigate = useNavigate();
    const { token, user, isAuthenticated } = useAuth();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'users'>('overview');
    const [error, setError] = useState<string | null>(null);
    const [numberLocale] = useState(() => {
        if (typeof window === 'undefined') return 'en-IN';
        try {
            return localStorage.getItem('admin_number_locale') || 'en-IN';
        } catch {
            return 'en-IN';
        }
    });

    useEffect(() => {
        if (!isAuthenticated || user?.role !== 'admin') {
            navigate('/');
            return;
        }

        const fetchDashboard = async () => {
            try {
                const res = await adminRequest(`${API_BASE}/api/admin/dashboard`, {
                    headers: { Authorization: `Bearer ${token}` },
                    onRateLimit: (rateLimitResponse) => {
                        const retryAfter = rateLimitResponse.headers.get('Retry-After');
                        setError(retryAfter
                            ? `Too many requests. Try again in ${retryAfter}s.`
                            : 'Too many requests. Please wait and try again.');
                    },
                });

                if (res.status === 429) {
                    return;
                }

                if (!res.ok) {
                    throw new Error('Failed to load dashboard');
                }

                const { data } = await res.json();
                setData(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboard();
    }, [isAuthenticated, user, token, navigate]);

    if (loading) {
        return (
            <div className="admin-dashboard">
                <div className="loading-spinner">Loading dashboard...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="admin-dashboard">
                <div className="error-message">{error}</div>
            </div>
        );
    }

    const getTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            job: '#6366f1',
            result: '#10b981',
            'admit-card': '#f59e0b',
            'answer-key': '#8b5cf6',
            admission: '#ec4899',
            syllabus: '#3b82f6'
        };
        return colors[type] || '#6b7280';
    };

    const maxTrendCount = Math.max(...(data?.trends?.map(t => t.count) || [1]));
    const formatMetric = (value: number | null | undefined) => (
        formatNumber(typeof value === 'number' ? value : undefined, '0', numberLocale)
    );

    return (
        <div className="admin-dashboard">
            <header className="dashboard-header">
                <h1>📊 Admin Dashboard</h1>
                <div className="header-actions">
                    <button onClick={() => navigate('/admin')} className="btn-secondary">
                        ← Back to Admin
                    </button>
                </div>
            </header>

            <nav className="dashboard-tabs">
                <button
                    className={activeTab === 'overview' ? 'active' : ''}
                    onClick={() => setActiveTab('overview')}
                >
                    📈 Overview
                </button>
                <button
                    className={activeTab === 'content' ? 'active' : ''}
                    onClick={() => setActiveTab('content')}
                >
                    📝 Content
                </button>
                <button
                    className={activeTab === 'users' ? 'active' : ''}
                    onClick={() => setActiveTab('users')}
                >
                    👥 Users
                </button>
            </nav>

            {activeTab === 'overview' && data && (
                <div className="dashboard-grid">
                    {/* Stats Cards */}
                    <div className="stats-row">
                        <div className="stat-card primary">
                            <div className="stat-icon">📋</div>
                            <div className="stat-content">
                                <div className="stat-value">{formatMetric(data.overview.totalAnnouncements)}</div>
                                <div className="stat-label">Total Listings</div>
                            </div>
                        </div>
                        <div className="stat-card success">
                            <div className="stat-icon">👥</div>
                            <div className="stat-content">
                                <div className="stat-value">{formatMetric(data.overview.totalUsers)}</div>
                                <div className="stat-label">Total Users</div>
                            </div>
                        </div>
                        <div className="stat-card info">
                            <div className="stat-icon">👁️</div>
                            <div className="stat-content">
                                <div className="stat-value">{formatMetric(data.overview?.totalViews ?? 0)}</div>
                                <div className="stat-label">Total Views</div>
                            </div>
                        </div>
                        <div className="stat-card warning">
                            <div className="stat-icon">⏰</div>
                            <div className="stat-content">
                                <div className="stat-value">{formatMetric(data.overview.expiringSoon)}</div>
                                <div className="stat-label">Expiring Soon</div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="quick-stats">
                        <div className="quick-stat">
                            <span className="label">New Today</span>
                            <span className="value green">+{formatMetric(data.overview.newToday)}</span>
                        </div>
                        <div className="quick-stat">
                            <span className="label">This Week</span>
                            <span className="value blue">+{formatMetric(data.overview.newThisWeek)}</span>
                        </div>
                        <div className="quick-stat">
                            <span className="label">Active Jobs</span>
                            <span className="value purple">{formatMetric(data.overview.activeJobs)}</span>
                        </div>
                        <div className="quick-stat">
                            <span className="label">Bookmarks</span>
                            <span className="value orange">{formatMetric(data.overview.totalBookmarks)}</span>
                        </div>
                    </div>

                    {/* Categories Chart */}
                    <div className="chart-card">
                        <h3>📊 Content by Category</h3>
                        <div className="bar-chart">
                            {(data.categories ?? []).map(cat => (
                                <div key={cat.type} className="bar-item">
                                    <div className="bar-label">{cat.type}</div>
                                    <div className="bar-container">
                                        <div
                                            className="bar-fill"
                                            style={{
                                                width: `${(cat.count / Math.max(...(data.categories ?? []).map(c => c.count), 1)) * 100}%`,
                                                background: getTypeColor(cat.type)
                                            }}
                                        />
                                        <span className="bar-value">{formatMetric(cat.count)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Trends Chart */}
                    <div className="chart-card">
                        <h3>📈 Posting Trends (Last 30 Days)</h3>
                        <div className="trend-chart">
                            {(data.trends ?? []).slice(-14).map((trend, i) => (
                                <div key={i} className="trend-bar">
                                    <div
                                        className="trend-fill"
                                        style={{ height: `${(trend.count / maxTrendCount) * 100}%` }}
                                    />
                                    <div className="trend-label">
                                        {new Date(trend.date).toLocaleDateString('en-IN', { day: 'numeric' })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Content */}
                    <div className="list-card">
                        <h3>🔥 Top Performing Content</h3>
                        <div className="top-list">
                            {(data.topContent ?? []).slice(0, 5).map((item, i) => (
                                <div key={item.id} className="top-item">
                                    <span className="rank">#{i + 1}</span>
                                    <div className="item-info">
                                        <div className="item-title">{item.title}</div>
                                        <div className="item-meta">
                                            <span
                                                className="type-badge"
                                                style={{ background: getTypeColor(item.type) }}
                                            >
                                                {item.type}
                                            </span>
                                            <span>{formatMetric(item.views ?? 0)} views</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* User Stats */}
                    <div className="list-card">
                        <h3>👥 User Overview</h3>
                        <div className="user-stats-grid">
                            <div className="user-stat">
                                <div className="value">{formatMetric(data.users.totalUsers)}</div>
                                <div className="label">Total Users</div>
                            </div>
                            <div className="user-stat">
                                <div className="value green">+{formatMetric(data.users.newToday)}</div>
                                <div className="label">New Today</div>
                            </div>
                            <div className="user-stat">
                                <div className="value blue">+{formatMetric(data.users.newThisWeek)}</div>
                                <div className="label">This Week</div>
                            </div>
                            <div className="user-stat">
                                <div className="value purple">{formatMetric(data.users.activeSubscribers)}</div>
                                <div className="label">Subscribers</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'content' && (
                <div className="content-management">
                    <p className="coming-soon">Content management features coming soon...</p>
                </div>
            )}

            {activeTab === 'users' && (
                <div className="user-management">
                    <p className="coming-soon">User management features coming soon...</p>
                </div>
            )}
        </div>
    );
}

export default AdminDashboard;
