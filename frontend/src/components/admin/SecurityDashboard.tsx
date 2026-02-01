import React, { useState, useEffect } from 'react';
import './SecurityDashboard.css';

export interface SecurityMetrics {
    totalSessions: number;
    activeSessions: number;
    suspiciousSessions: number;
    failedLogins: number;
    blockedIPs: number;
    activeIPRules: number;
    twoFactorUsers: number;
    passwordPolicyCompliance: number;
    lastSecurityScan: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    alerts: SecurityAlert[];
    recentActivity: SecurityActivity[];
}

export interface SecurityAlert {
    id: string;
    type: 'warning' | 'error' | 'info';
    title: string;
    message: string;
    timestamp: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    actionRequired: boolean;
    resolved: boolean;
}

export interface SecurityActivity {
    id: string;
    action: string;
    user: string;
    ip: string;
    timestamp: string;
    success: boolean;
    details?: string;
}

interface SecurityDashboardProps {
    metrics: SecurityMetrics;
    onRefresh: () => Promise<void>;
    onResolveAlert: (alertId: string) => Promise<void>;
    onRunSecurityScan: () => Promise<void>;
    loading?: boolean;
}

export function SecurityDashboard({ 
    metrics, 
    onRefresh, 
    onResolveAlert, 
    onRunSecurityScan, 
    loading = false 
}: SecurityDashboardProps) {
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [selectedTimeframe, setSelectedTimeframe] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
    const [showAllAlerts, setShowAllAlerts] = useState(false);

    // Auto refresh every 30 seconds if enabled
    useEffect(() => {
        if (!autoRefresh) return;
        
        const interval = setInterval(() => {
            onRefresh();
        }, 30000);
        
        return () => clearInterval(interval);
    }, [autoRefresh, onRefresh]);

    const getRiskColor = (risk: string) => {
        switch (risk) {
            case 'low': return '#22c55e';
            case 'medium': return '#fbbf24';
            case 'high': return '#f97316';
            case 'critical': return '#ef4444';
            default: return '#64748b';
        }
    };

    const getRiskIcon = (risk: string) => {
        switch (risk) {
            case 'low': return '🟢';
            case 'medium': return '🟡';
            case 'high': return '🟠';
            case 'critical': return '🔴';
            default: return '🔘';
        }
    };

    const getAlertIcon = (type: string, severity: string) => {
        if (severity === 'critical') return '🚨';
        if (severity === 'high') return '⚠️';
        switch (type) {
            case 'warning': return '⚠️';
            case 'error': return '❌';
            case 'info': return 'ℹ️';
            default: return '🔔';
        }
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return date.toLocaleDateString();
    };

    const unresolvedAlerts = metrics.alerts.filter(alert => !alert.resolved);
    const criticalAlerts = unresolvedAlerts.filter(alert => alert.severity === 'critical');
    const highAlerts = unresolvedAlerts.filter(alert => alert.severity === 'high');

    return (
        <div className="security-dashboard">
            <div className="security-header">
                <div className="header-title">
                    <h2>🔐 Security Center</h2>
                    <p>Real-time security monitoring and threat detection</p>
                </div>
                
                <div className="header-controls">
                    <select 
                        value={selectedTimeframe} 
                        onChange={(e) => setSelectedTimeframe(e.target.value as any)}
                        className="timeframe-select"
                    >
                        <option value="1h">Last Hour</option>
                        <option value="24h">Last 24 Hours</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                    </select>
                    
                    <label className="auto-refresh-toggle">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                        />
                        <span>Auto-refresh</span>
                    </label>
                    
                    <button 
                        className="refresh-btn"
                        onClick={onRefresh}
                        disabled={loading}
                        title="Refresh security metrics"
                    >
                        <span className={`refresh-icon ${loading ? 'spinning' : ''}`}>🔄</span>
                        Refresh
                    </button>
                </div>
            </div>

            {/* Risk Overview */}
            <div className="risk-overview">
                <div className="risk-main">
                    <div className="risk-indicator">
                        <div 
                            className="risk-circle"
                            style={{ 
                                background: `conic-gradient(${getRiskColor(metrics.riskLevel)} 0deg, ${getRiskColor(metrics.riskLevel)} 270deg, rgba(100, 116, 139, 0.2) 270deg, rgba(100, 116, 139, 0.2) 360deg)` 
                            }}
                        >
                            <div className="risk-content">
                                <span className="risk-icon">{getRiskIcon(metrics.riskLevel)}</span>
                                <span className="risk-text">{metrics.riskLevel.toUpperCase()}</span>
                                <span className="risk-label">Security Risk</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="risk-summary">
                        <h3>Security Status</h3>
                        <div className="risk-items">
                            <div className="risk-item">
                                <span className="risk-item-label">Last Scan:</span>
                                <span className="risk-item-value">{formatTimestamp(metrics.lastSecurityScan)}</span>
                            </div>
                            <div className="risk-item">
                                <span className="risk-item-label">Active Alerts:</span>
                                <span className="risk-item-value">{unresolvedAlerts.length}</span>
                            </div>
                            <div className="risk-item">
                                <span className="risk-item-label">Critical Issues:</span>
                                <span className="risk-item-value critical">{criticalAlerts.length}</span>
                            </div>
                        </div>
                        
                        <button 
                            className="scan-btn"
                            onClick={onRunSecurityScan}
                            disabled={loading}
                        >
                            🔍 Run Security Scan
                        </button>
                    </div>
                </div>
            </div>

            {/* Security Metrics Grid */}
            <div className="metrics-grid">
                <div className="metric-card sessions">
                    <div className="metric-header">
                        <span className="metric-icon">👥</span>
                        <h4>Sessions</h4>
                    </div>
                    <div className="metric-stats">
                        <div className="metric-main">
                            <span className="metric-value">{metrics.activeSessions}</span>
                            <span className="metric-label">Active</span>
                        </div>
                        <div className="metric-secondary">
                            <div className="metric-item">
                                <span className="value">{metrics.totalSessions}</span>
                                <span className="label">Total</span>
                            </div>
                            <div className="metric-item">
                                <span className="value suspicious">{metrics.suspiciousSessions}</span>
                                <span className="label">Suspicious</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="metric-card authentication">
                    <div className="metric-header">
                        <span className="metric-icon">🔐</span>
                        <h4>Authentication</h4>
                    </div>
                    <div className="metric-stats">
                        <div className="metric-main">
                            <span className="metric-value">{metrics.failedLogins}</span>
                            <span className="metric-label">Failed Logins</span>
                        </div>
                        <div className="metric-secondary">
                            <div className="metric-item">
                                <span className="value">{metrics.twoFactorUsers}</span>
                                <span className="label">2FA Users</span>
                            </div>
                            <div className="metric-item">
                                <span className="value">{metrics.passwordPolicyCompliance}%</span>
                                <span className="label">Policy Compliance</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="metric-card network">
                    <div className="metric-header">
                        <span className="metric-icon">🌐</span>
                        <h4>Network Security</h4>
                    </div>
                    <div className="metric-stats">
                        <div className="metric-main">
                            <span className="metric-value">{metrics.blockedIPs}</span>
                            <span className="metric-label">Blocked IPs</span>
                        </div>
                        <div className="metric-secondary">
                            <div className="metric-item">
                                <span className="value">{metrics.activeIPRules}</span>
                                <span className="label">Active Rules</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Security Alerts */}
            <div className="alerts-section">
                <div className="alerts-header">
                    <h3>🚨 Security Alerts ({unresolvedAlerts.length})</h3>
                    
                    {unresolvedAlerts.length > 3 && (
                        <button 
                            className="show-all-btn"
                            onClick={() => setShowAllAlerts(!showAllAlerts)}
                        >
                            {showAllAlerts ? 'Show Less' : `Show All (${unresolvedAlerts.length})`}
                        </button>
                    )}
                </div>
                
                {unresolvedAlerts.length === 0 ? (
                    <div className="no-alerts">
                        <span className="no-alerts-icon">✅</span>
                        <h4>All Clear!</h4>
                        <p>No active security alerts. Your system is secure.</p>
                    </div>
                ) : (
                    <div className="alerts-list">
                        {(showAllAlerts ? unresolvedAlerts : unresolvedAlerts.slice(0, 3)).map((alert) => (
                            <div key={alert.id} className={`alert-card ${alert.severity}`}>
                                <div className="alert-main">
                                    <div className="alert-icon">
                                        {getAlertIcon(alert.type, alert.severity)}
                                    </div>
                                    <div className="alert-content">
                                        <div className="alert-title">{alert.title}</div>
                                        <div className="alert-message">{alert.message}</div>
                                        <div className="alert-meta">
                                            <span className={`severity-badge ${alert.severity}`}>
                                                {alert.severity.toUpperCase()}
                                            </span>
                                            <span className="alert-time">
                                                {formatTimestamp(alert.timestamp)}
                                            </span>
                                            {alert.actionRequired && (
                                                <span className="action-required">⚡ Action Required</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="alert-actions">
                                    <button 
                                        className="resolve-btn"
                                        onClick={() => onResolveAlert(alert.id)}
                                        disabled={loading}
                                    >
                                        ✅ Resolve
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Recent Activity */}
            <div className="activity-section">
                <h3>📊 Recent Security Activity</h3>
                
                {metrics.recentActivity.length === 0 ? (
                    <div className="no-activity">
                        <p>No recent security activity to display.</p>
                    </div>
                ) : (
                    <div className="activity-list">
                        <div className="activity-header">
                            <div className="header-action">Action</div>
                            <div className="header-user">User</div>
                            <div className="header-ip">IP Address</div>
                            <div className="header-time">Time</div>
                            <div className="header-status">Status</div>
                        </div>
                        {metrics.recentActivity.slice(0, 10).map((activity) => (
                            <div key={activity.id} className={`activity-row ${activity.success ? 'success' : 'failure'}`}>
                                <div className="activity-action">{activity.action}</div>
                                <div className="activity-user">{activity.user}</div>
                                <div className="activity-ip">
                                    <span className="ip-text">{activity.ip}</span>
                                </div>
                                <div className="activity-time">{formatTimestamp(activity.timestamp)}</div>
                                <div className="activity-status">
                                    <span className={`status-badge ${activity.success ? 'success' : 'failure'}`}>
                                        {activity.success ? '✅ Success' : '❌ Failed'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default SecurityDashboard;"
