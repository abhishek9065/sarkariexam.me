import React, { useState, useEffect } from 'react';
import './AuditTrail.css';
import { formatNumber } from '../../utils/formatters';

export interface AuditEvent {
    id: string;
    timestamp: string;
    userId: string;
    userName: string;
    userEmail: string;
    action: string;
    resource: string;
    resourceId: string;
    details: Record<string, any>;
    ipAddress: string;
    userAgent: string;
    location?: {
        country: string;
        city: string;
        region: string;
    };
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: 'authentication' | 'authorization' | 'data' | 'system' | 'security' | 'admin';
    status: 'success' | 'failure' | 'warning' | 'info';
    metadata?: Record<string, any>;
}

export interface AuditFilters {
    dateFrom: string;
    dateTo: string;
    userId: string;
    action: string;
    resource: string;
    severity: string[];
    category: string[];
    status: string[];
    ipAddress: string;
    searchQuery: string;
}

export interface AuditStats {
    totalEvents: number;
    criticalEvents: number;
    failedAttempts: number;
    uniqueUsers: number;
    topActions: Array<{ action: string; count: number }>;
    topResources: Array<{ resource: string; count: number }>;
    eventsByHour: Array<{ hour: string; count: number }>;
    eventsByCategory: Array<{ category: string; count: number }>;
}

interface AuditTrailProps {
    events: AuditEvent[];
    stats: AuditStats;
    loading?: boolean;
    onExport?: (filters: AuditFilters) => Promise<void>;
    onRefresh?: () => Promise<void>;
    onFilterChange?: (filters: AuditFilters) => void;
    autoRefresh?: boolean;
    refreshInterval?: number;
}

const SEVERITY_COLORS = {
    low: '#22c55e',
    medium: '#eab308',
    high: '#f97316',
    critical: '#ef4444'
};

const STATUS_COLORS = {
    success: '#22c55e',
    failure: '#ef4444',
    warning: '#eab308',
    info: '#3b82f6'
};

const CATEGORY_ICONS = {
    authentication: '🔐',
    authorization: '🛡️',
    data: '📊',
    system: '⚙️',
    security: '🔒',
    admin: '👑'
};

export function AuditTrail({ 
    events, 
    stats, 
    loading = false, 
    onExport,
    onRefresh,
    onFilterChange,
    autoRefresh = false,
    refreshInterval = 30000
}: AuditTrailProps) {
    const [numberLocale] = useState(() => {
        if (typeof window === 'undefined') return 'en-IN';
        try {
            return localStorage.getItem('admin_number_locale') || 'en-IN';
        } catch {
            return 'en-IN';
        }
    });
    const [filters, setFilters] = useState<AuditFilters>({
        dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        dateTo: new Date().toISOString().split('T')[0],
        userId: '',
        action: '',
        resource: '',
        severity: [],
        category: [],
        status: [],
        ipAddress: '',
        searchQuery: ''
    });
    
    const [viewMode, setViewMode] = useState<'table' | 'timeline' | 'chart'>('table');
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [sortConfig, setSortConfig] = useState<{ key: keyof AuditEvent; direction: 'asc' | 'desc' }>({ 
        key: 'timestamp', 
        direction: 'desc' 
    });

    // Auto-refresh functionality
    useEffect(() => {
        if (autoRefresh && onRefresh) {
            const interval = setInterval(onRefresh, refreshInterval);
            return () => clearInterval(interval);
        }
    }, [autoRefresh, refreshInterval, onRefresh]);

    // Filter change handler
    useEffect(() => {
        if (onFilterChange) {
            onFilterChange(filters);
        }
    }, [filters, onFilterChange]);

    const handleFilterChange = (key: keyof AuditFilters, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleArrayFilterChange = (key: 'severity' | 'category' | 'status', value: string) => {
        setFilters(prev => {
            const currentArray = prev[key] as string[];
            const newArray = currentArray.includes(value)
                ? currentArray.filter(item => item !== value)
                : [...currentArray, value];
            return { ...prev, [key]: newArray };
        });
    };

    const handleSort = (key: keyof AuditEvent) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const sortedEvents = React.useMemo(() => {
        return [...events].sort((a, b) => {
            const aValue = a[sortConfig.key] as any;
            const bValue = b[sortConfig.key] as any;
            
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [events, sortConfig]);

    const toggleRowExpansion = (eventId: string) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(eventId)) {
                newSet.delete(eventId);
            } else {
                newSet.add(eventId);
            }
            return newSet;
        });
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'critical': return '🚨';
            case 'high': return '⚠️';
            case 'medium': return '⚡';
            case 'low': return 'ℹ️';
            default: return '📝';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success': return '✅';
            case 'failure': return '❌';
            case 'warning': return '⚠️';
            case 'info': return 'ℹ️';
            default: return '📝';
        }
    };

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString();
    };

    const formatDetails = (details: Record<string, any>) => {
        return Object.entries(details).map(([key, value]) => (
            <div key={key} className="detail-item">
                <span className="detail-key">{key}:</span>
                <span className="detail-value">{JSON.stringify(value)}</span>
            </div>
        ));
    };

    const handleExport = async () => {
        if (onExport) {
            await onExport(filters);
        }
    };

    return (
        <div className="audit-trail">
            <div className="audit-header">
                <div className="header-title">
                    <h2>📋 Enhanced Audit Trail</h2>
                    <p>Comprehensive security and activity monitoring with advanced search and analytics</p>
                </div>
                
                <div className="header-actions">
                    <div className="view-mode-selector">
                        <button 
                            className={`view-mode-btn ${viewMode === 'table' ? 'active' : ''}`}
                            onClick={() => setViewMode('table')}
                        >
                            📊 Table
                        </button>
                        <button 
                            className={`view-mode-btn ${viewMode === 'timeline' ? 'active' : ''}`}
                            onClick={() => setViewMode('timeline')}
                        >
                            📈 Timeline
                        </button>
                        <button 
                            className={`view-mode-btn ${viewMode === 'chart' ? 'active' : ''}`}
                            onClick={() => setViewMode('chart')}
                        >
                            📉 Analytics
                        </button>
                    </div>
                    
                    <div className="action-buttons">
                        {onRefresh && (
                            <button 
                                className="refresh-btn"
                                onClick={onRefresh}
                                disabled={loading}
                            >
                                🔄 {loading ? 'Refreshing...' : 'Refresh'}
                            </button>
                        )}
                        
                        {onExport && (
                            <button 
                                className="export-btn"
                                onClick={handleExport}
                                disabled={loading}
                            >
                                📥 Export
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Statistics Overview */}
            <div className="audit-stats">
                <div className="stats-grid">
                    <div className="stat-card total">
                        <div className="stat-icon">📊</div>
                        <div className="stat-content">
                            <span className="stat-value">{formatNumber(stats.totalEvents, '0', numberLocale)}</span>
                            <span className="stat-label">Total Events</span>
                        </div>
                    </div>
                    
                    <div className="stat-card critical">
                        <div className="stat-icon">🚨</div>
                        <div className="stat-content">
                            <span className="stat-value">{formatNumber(stats.criticalEvents, '0', numberLocale)}</span>
                            <span className="stat-label">Critical Events</span>
                        </div>
                    </div>
                    
                    <div className="stat-card failed">
                        <div className="stat-icon">❌</div>
                        <div className="stat-content">
                            <span className="stat-value">{formatNumber(stats.failedAttempts, '0', numberLocale)}</span>
                            <span className="stat-label">Failed Attempts</span>
                        </div>
                    </div>
                    
                    <div className="stat-card users">
                        <div className="stat-icon">👥</div>
                        <div className="stat-content">
                            <span className="stat-value">{formatNumber(stats.uniqueUsers, '0', numberLocale)}</span>
                            <span className="stat-label">Unique Users</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Advanced Filters */}
            <div className="audit-filters">
                <div className="filters-header">
                    <h3>🔍 Advanced Filters</h3>
                </div>
                
                <div className="filters-grid">
                    <div className="filter-group date-range">
                        <label>Date Range:</label>
                        <div className="date-inputs">
                            <input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                                className="date-input"
                            />
                            <span>to</span>
                            <input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                                className="date-input"
                            />
                        </div>
                    </div>
                    
                    <div className="filter-group">
                        <label>Search:</label>
                        <input
                            type="text"
                            value={filters.searchQuery}
                            onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                            placeholder="Search events, users, actions..."
                            className="search-input"
                        />
                    </div>
                    
                    <div className="filter-group">
                        <label>User ID:</label>
                        <input
                            type="text"
                            value={filters.userId}
                            onChange={(e) => handleFilterChange('userId', e.target.value)}
                            placeholder="Filter by user ID"
                            className="text-input"
                        />
                    </div>
                    
                    <div className="filter-group">
                        <label>IP Address:</label>
                        <input
                            type="text"
                            value={filters.ipAddress}
                            onChange={(e) => handleFilterChange('ipAddress', e.target.value)}
                            placeholder="Filter by IP address"
                            className="text-input"
                        />
                    </div>
                    
                    <div className="filter-group">
                        <label>Severity:</label>
                        <div className="checkbox-group">
                            {['low', 'medium', 'high', 'critical'].map(severity => (
                                <label key={severity} className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={filters.severity.includes(severity)}
                                        onChange={() => handleArrayFilterChange('severity', severity)}
                                    />
                                    <span className={`severity-badge ${severity}`}>
                                        {getSeverityIcon(severity)} {severity.toUpperCase()}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                    
                    <div className="filter-group">
                        <label>Category:</label>
                        <div className="checkbox-group">
                            {Object.keys(CATEGORY_ICONS).map(category => (
                                <label key={category} className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={filters.category.includes(category)}
                                        onChange={() => handleArrayFilterChange('category', category)}
                                    />
                                    <span className="category-badge">
                                        {CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS]} {category.toUpperCase()}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                    
                    <div className="filter-group">
                        <label>Status:</label>
                        <div className="checkbox-group">
                            {['success', 'failure', 'warning', 'info'].map(status => (
                                <label key={status} className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={filters.status.includes(status)}
                                        onChange={() => handleArrayFilterChange('status', status)}
                                    />
                                    <span className={`status-badge ${status}`}>
                                        {getStatusIcon(status)} {status.toUpperCase()}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Events Display */}
            <div className="audit-content">
                {viewMode === 'table' && (
                    <div className="events-table-container">
                        <div className="table-controls">
                            <span className="results-count">
                                Showing {sortedEvents.length} events
                            </span>
                        </div>
                        
                        <div className="events-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th></th>
                                        <th 
                                            className="sortable"
                                            onClick={() => handleSort('timestamp')}
                                        >
                                            Timestamp {sortConfig.key === 'timestamp' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th 
                                            className="sortable"
                                            onClick={() => handleSort('userName')}
                                        >
                                            User {sortConfig.key === 'userName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th 
                                            className="sortable"
                                            onClick={() => handleSort('action')}
                                        >
                                            Action {sortConfig.key === 'action' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th 
                                            className="sortable"
                                            onClick={() => handleSort('resource')}
                                        >
                                            Resource {sortConfig.key === 'resource' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th>Category</th>
                                        <th>Severity</th>
                                        <th>Status</th>
                                        <th>IP Address</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedEvents.map((event) => (
                                        <React.Fragment key={event.id}>
                                            <tr 
                                                className={`event-row ${expandedRows.has(event.id) ? 'expanded' : ''}`}
                                                onClick={() => toggleRowExpansion(event.id)}
                                            >
                                                <td className="expand-cell">
                                                    <span className="expand-icon">
                                                        {expandedRows.has(event.id) ? '▼' : '▶'}
                                                    </span>
                                                </td>
                                                <td className="timestamp-cell">
                                                    {formatTimestamp(event.timestamp)}
                                                </td>
                                                <td className="user-cell">
                                                    <div className="user-info">
                                                        <span className="user-name">{event.userName}</span>
                                                        <span className="user-email">{event.userEmail}</span>
                                                    </div>
                                                </td>
                                                <td className="action-cell">
                                                    <code>{event.action}</code>
                                                </td>
                                                <td className="resource-cell">
                                                    <span className="resource-name">{event.resource}</span>
                                                    {event.resourceId && (
                                                        <span className="resource-id">#{event.resourceId}</span>
                                                    )}
                                                </td>
                                                <td className="category-cell">
                                                    <span className="category-badge">
                                                        {CATEGORY_ICONS[event.category]} {event.category}
                                                    </span>
                                                </td>
                                                <td className="severity-cell">
                                                    <span 
                                                        className={`severity-badge ${event.severity}`}
                                                        style={{ color: SEVERITY_COLORS[event.severity] }}
                                                    >
                                                        {getSeverityIcon(event.severity)} {event.severity}
                                                    </span>
                                                </td>
                                                <td className="status-cell">
                                                    <span 
                                                        className={`status-badge ${event.status}`}
                                                        style={{ color: STATUS_COLORS[event.status] }}
                                                    >
                                                        {getStatusIcon(event.status)} {event.status}
                                                    </span>
                                                </td>
                                                <td className="ip-cell">
                                                    <code>{event.ipAddress}</code>
                                                    {event.location && (
                                                        <span className="location">
                                                            {event.location.city}, {event.location.country}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                            
                                            {expandedRows.has(event.id) && (
                                                <tr className="event-details-row">
                                                    <td colSpan={9}>
                                                        <div className="event-details">
                                                            <div className="details-section">
                                                                <h4>📝 Event Details</h4>
                                                                {formatDetails(event.details)}
                                                            </div>
                                                            
                                                            <div className="details-section">
                                                                <h4>🌐 Technical Information</h4>
                                                                <div className="detail-item">
                                                                    <span className="detail-key">User Agent:</span>
                                                                    <span className="detail-value">{event.userAgent}</span>
                                                                </div>
                                                                <div className="detail-item">
                                                                    <span className="detail-key">Event ID:</span>
                                                                    <span className="detail-value">{event.id}</span>
                                                                </div>
                                                                {event.metadata && Object.keys(event.metadata).length > 0 && (
                                                                    <div className="detail-item">
                                                                        <span className="detail-key">Metadata:</span>
                                                                        <div className="metadata-content">
                                                                            {formatDetails(event.metadata)}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        {sortedEvents.length === 0 && (
                            <div className="empty-state">
                                <div className="empty-icon">📋</div>
                                <h3>No audit events found</h3>
                                <p>Try adjusting your filters to see more results</p>
                            </div>
                        )}
                    </div>
                )}
                
                {viewMode === 'timeline' && (
                    <div className="timeline-view">
                        <h3>📈 Timeline View (Coming Soon)</h3>
                        <p>Interactive timeline visualization will be available in the next update.</p>
                    </div>
                )}
                
                {viewMode === 'chart' && (
                    <div className="analytics-view">
                        <h3>📉 Analytics Dashboard (Coming Soon)</h3>
                        <p>Advanced analytics and visualization charts will be available in the next update.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AuditTrail;


