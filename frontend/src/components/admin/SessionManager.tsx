import React, { useState } from 'react';
import './SessionManager.css';

export interface SessionData {
    id: string;
    userId: string;
    ip: string;
    userAgent: string;
    location?: string;
    device: string;
    browser: string;
    os: string;
    lastActivity: string;
    isCurrentSession: boolean;
    loginTime: string;
    isActive: boolean;
    riskScore: 'low' | 'medium' | 'high';
    actions: string[];
}

interface SessionManagerProps {
    sessions: SessionData[];
    onTerminateSession: (sessionId: string) => Promise<void>;
    onTerminateAllOther: () => Promise<void>;
    onRefresh: () => Promise<void>;
    loading?: boolean;
    canManage?: boolean;
}

export function SessionManager({ 
    sessions, 
    onTerminateSession, 
    onTerminateAllOther, 
    onRefresh, 
    loading = false,
    canManage = true,
}: SessionManagerProps) {
    const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
    const [showConfirmTerminate, setShowConfirmTerminate] = useState<string | null>(null);
    const [filterRisk, setFilterRisk] = useState<'all' | 'low' | 'medium' | 'high'>('all');
    const [sortBy, setSortBy] = useState<'lastActivity' | 'loginTime' | 'riskScore'>('lastActivity');

    const currentSession = sessions.find(s => s.isCurrentSession);
    const otherSessions = sessions.filter(s => !s.isCurrentSession);

    // Filter and sort sessions
    const filteredSessions = otherSessions
        .filter(session => filterRisk === 'all' || session.riskScore === filterRisk)
        .sort((a, b) => {
            switch (sortBy) {
                case 'lastActivity':
                    return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
                case 'loginTime':
                    return new Date(b.loginTime).getTime() - new Date(a.loginTime).getTime();
                case 'riskScore':
                    {
                        const riskOrder = { high: 3, medium: 2, low: 1 };
                        return riskOrder[b.riskScore] - riskOrder[a.riskScore];
                    }
                default:
                    return 0;
            }
        });

    const handleTerminateSession = async (sessionId: string) => {
        try {
            await onTerminateSession(sessionId);
            setShowConfirmTerminate(null);
            setSelectedSessions(prev => prev.filter(id => id !== sessionId));
        } catch (error) {
            console.error('Failed to terminate session:', error);
        }
    };

    const handleTerminateMultiple = async () => {
        try {
            await Promise.all(selectedSessions.map(id => onTerminateSession(id)));
            setSelectedSessions([]);
        } catch (error) {
            console.error('Failed to terminate sessions:', error);
        }
    };

    const toggleSessionSelection = (sessionId: string) => {
        setSelectedSessions(prev => 
            prev.includes(sessionId) 
                ? prev.filter(id => id !== sessionId)
                : [...prev, sessionId]
        );
    };

    const deselectAllSessions = () => {
        setSelectedSessions([]);
    };

    const formatLastActivity = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const maskIpAddress = (ip: string) => {
        if (!ip) return '';
        if (ip.includes('.')) {
            const parts = ip.split('.');
            if (parts.length === 4) {
                return `${parts[0]}.${parts[1]}.xxx.xxx`;
            }
        }
        if (ip.includes(':')) {
            const parts = ip.split(':');
            if (parts.length > 3) {
                return `${parts[0]}:${parts[1]}:xxxx:xxxx`;
            }
        }
        return ip;
    };

    const getRiskIcon = (risk: string) => {
        switch (risk) {
            case 'high': return '🔴';
            case 'medium': return '🟡';
            case 'low': return '🟢';
            default: return '🔘';
        }
    };

    const getDeviceIcon = (device: string, browser: string) => {
        if (device.toLowerCase().includes('mobile')) return '📱';
        if (device.toLowerCase().includes('tablet')) return '📟';
        if (browser.toLowerCase().includes('chrome')) return '🌐';
        if (browser.toLowerCase().includes('firefox')) return '🦊';
        if (browser.toLowerCase().includes('safari')) return '🧭';
        return '💻';
    };

    return (
        <div className="session-manager">
            <div className="session-header">
                <div className="session-title">
                    <h2>🔐 Active Sessions</h2>
                    <p>Manage and monitor all active admin sessions for security</p>
                </div>
                <div className="session-controls">
                    <button 
                        className="refresh-btn"
                        onClick={onRefresh}
                        disabled={loading}
                        title="Refresh session list"
                    >
                        <span className="refresh-icon">🔄</span>
                        Refresh
                    </button>
                    {canManage && otherSessions.length > 0 && (
                        <button 
                            className="terminate-all-btn"
                            onClick={onTerminateAllOther}
                            disabled={loading}
                            title="Terminate all other sessions"
                        >
                            <span className="terminate-icon">🚫</span>
                            End All Others
                        </button>
                    )}
                </div>
            </div>

            {/* Current Session */}
            {currentSession && (
                <div className="current-session">
                    <h3>🎯 Current Session</h3>
                    <div className="session-card current">
                        <div className="session-info">
                            <div className="session-primary">
                                <span className="device-icon">
                                    {getDeviceIcon(currentSession.device, currentSession.browser)}
                                </span>
                                <div className="session-details">
                                    <div className="session-name">
                                        {currentSession.device} • {currentSession.browser}
                                    </div>
                                    <div className="session-meta">
                                        <span className="location">{currentSession.location || 'Unknown Location'}</span>
                                        <span className="separator">•</span>
                                        <span className="ip" title={currentSession.ip}>{maskIpAddress(currentSession.ip)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="session-status current-badge">
                                <span>✅ Current Session</span>
                            </div>
                        </div>
                        <div className="session-timeline">
                            <div className="timeline-item">
                                <span className="timeline-label">Login:</span>
                                <span className="timeline-value">
                                    {new Date(currentSession.loginTime).toLocaleString()}
                                </span>
                            </div>
                            <div className="timeline-item">
                                <span className="timeline-label">Last Activity:</span>
                                <span className="timeline-value">
                                    {formatLastActivity(currentSession.lastActivity)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Other Sessions */}
            {otherSessions.length > 0 && (
                <div className="other-sessions">
                    <div className="sessions-controls">
                        <h3>🌐 Other Sessions ({otherSessions.length})</h3>
                        
                        <div className="filters">
                            <select 
                                value={filterRisk} 
                                onChange={(e) => setFilterRisk(e.target.value as any)}
                                className="filter-select"
                            >
                                <option value="all">All Risk Levels</option>
                                <option value="high">🔴 High Risk</option>
                                <option value="medium">🟡 Medium Risk</option>
                                <option value="low">🟢 Low Risk</option>
                            </select>
                            
                            <select 
                                value={sortBy} 
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="sort-select"
                            >
                                <option value="lastActivity">Sort by Activity</option>
                                <option value="loginTime">Sort by Login Time</option>
                                <option value="riskScore">Sort by Risk</option>
                            </select>
                        </div>
                    </div>

                    {canManage && selectedSessions.length > 0 && (
                        <div className="bulk-actions">
                            <div className="selected-info">
                                <span>{selectedSessions.length} session(s) selected</span>
                                <button 
                                    className="deselect-btn"
                                    onClick={deselectAllSessions}
                                >
                                    Clear Selection
                                </button>
                            </div>
                            <button 
                                className="bulk-terminate-btn"
                                onClick={handleTerminateMultiple}
                                disabled={loading}
                            >
                                🚫 Terminate Selected
                            </button>
                        </div>
                    )}

                    <div className="sessions-list">
                        {filteredSessions.map((session) => (
                            <div 
                                key={session.id} 
                                className={`session-card ${selectedSessions.includes(session.id) ? 'selected' : ''}`}
                            >
                                {canManage && (
                                    <div className="session-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={selectedSessions.includes(session.id)}
                                            onChange={() => toggleSessionSelection(session.id)}
                                        />
                                    </div>
                                )}
                                
                                <div className="session-info">
                                    <div className="session-primary">
                                        <span className="device-icon">
                                            {getDeviceIcon(session.device, session.browser)}
                                        </span>
                                        <div className="session-details">
                                            <div className="session-name">
                                                {session.device} • {session.browser}
                                            </div>
                                            <div className="session-meta">
                                                <span className="location">{session.location || 'Unknown Location'}</span>
                                                <span className="separator">•</span>
                                                <span className="ip" title={session.ip}>{maskIpAddress(session.ip)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="session-status">
                                        <div className={`risk-badge risk-${session.riskScore}`}>
                                            <span>{getRiskIcon(session.riskScore)}</span>
                                            <span>{session.riskScore.toUpperCase()}</span>
                                        </div>
                                        <div className={`activity-status ${session.isActive ? 'active' : 'inactive'}`}>
                                            {session.isActive ? '🟢 Active' : '🔴 Inactive'}
                                        </div>
                                    </div>
                                </div>

                                <div className="session-timeline">
                                    <div className="timeline-item">
                                        <span className="timeline-label">Login:</span>
                                        <span className="timeline-value">
                                            {new Date(session.loginTime).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="timeline-item">
                                        <span className="timeline-label">Last Activity:</span>
                                        <span className="timeline-value">
                                            {formatLastActivity(session.lastActivity)}
                                        </span>
                                    </div>
                                    {session.actions.length > 0 && (
                                        <div className="timeline-item">
                                            <span className="timeline-label">Recent Actions:</span>
                                            <span className="timeline-value">
                                                {session.actions.slice(0, 3).join(', ')}
                                                {session.actions.length > 3 && ` +${session.actions.length - 3} more`}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {canManage && (
                                    <div className="session-actions">
                                        <button 
                                            className="terminate-session-btn"
                                            onClick={() => setShowConfirmTerminate(session.id)}
                                            disabled={loading}
                                        >
                                            🚫 Terminate
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {sessions.length === 0 && !loading && (
                <div className="no-other-sessions">
                    <div className="no-sessions-icon">🔒</div>
                    <h3>No sessions found</h3>
                    <p>We could not detect any active admin sessions yet.</p>
                </div>
            )}

            {sessions.length > 0 && otherSessions.length === 0 && currentSession && (
                <div className="no-other-sessions">
                    <div className="no-sessions-icon">🔒</div>
                    <h3>Only Current Session Active</h3>
                    <p>You have no other active sessions. This is good for security!</p>
                </div>
            )}

            {/* Confirmation Dialog */}
            {canManage && showConfirmTerminate && (
                <div className="confirm-overlay">
                    <div className="confirm-dialog">
                        <h3>🚫 Terminate Session</h3>
                        <p>Are you sure you want to terminate this session? The user will be immediately logged out and any unsaved work will be lost.</p>
                        <div className="confirm-actions">
                            <button 
                                className="cancel-btn"
                                onClick={() => setShowConfirmTerminate(null)}
                            >
                                Cancel
                            </button>
                            <button 
                                className="confirm-btn"
                                onClick={() => handleTerminateSession(showConfirmTerminate)}
                            >
                                Terminate Session
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SessionManager;
