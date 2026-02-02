import React, { useState } from 'react';
import './IPAccessControl.css';

export interface IPRule {
    id: string;
    type: 'allow' | 'block';
    ip: string;
    range?: string;
    description: string;
    createdBy: string;
    createdAt: string;
    lastTriggered?: string;
    hitCount: number;
    isActive: boolean;
    priority: number;
}

export interface IPAccessAttempt {
    id: string;
    ip: string;
    timestamp: string;
    action: 'allowed' | 'blocked';
    reason: string;
    userAgent: string;
    location?: string;
    ruleId?: string;
}

interface IPAccessControlProps {
    rules: IPRule[];
    recentAttempts: IPAccessAttempt[];
    onAddRule: (rule: Omit<IPRule, 'id' | 'createdAt' | 'lastTriggered' | 'hitCount'>) => Promise<void>;
    onUpdateRule: (id: string, updates: Partial<IPRule>) => Promise<void>;
    onDeleteRule: (id: string) => Promise<void>;
    onRefresh: () => Promise<void>;
    loading?: boolean;
}

export function IPAccessControl({
    rules,
    recentAttempts,
    onAddRule,
    onUpdateRule,
    onDeleteRule,
    onRefresh,
    loading = false
}: IPAccessControlProps) {
    const [showAddRule, setShowAddRule] = useState(false);
    const [newRule, setNewRule] = useState({
        type: 'allow' as 'allow' | 'block',
        ip: '',
        range: '',
        description: '',
        isActive: true,
        priority: 100
    });
    const [filter, setFilter] = useState<'all' | 'allow' | 'block'>('all');
    const [sortBy, setSortBy] = useState<'priority' | 'createdAt' | 'hitCount'>('priority');

    // IP validation
    const validateIP = (ip: string): boolean => {
        const ipPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const cidrPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/;
        return ipPattern.test(ip) || cidrPattern.test(ip);
    };

    // Filter and sort rules
    const filteredRules = rules
        .filter(rule => filter === 'all' || rule.type === filter)
        .sort((a, b) => {
            switch (sortBy) {
                case 'priority':
                    return a.priority - b.priority;
                case 'createdAt':
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                case 'hitCount':
                    return b.hitCount - a.hitCount;
                default:
                    return 0;
            }
        });

    const handleAddRule = async () => {
        if (!validateIP(newRule.ip) && !validateIP(newRule.range)) {
            alert('Please enter a valid IP address or CIDR range');
            return;
        }

        try {
            await onAddRule({
                ...newRule,
                createdBy: 'Current Admin', // This would come from context in real app
                isActive: newRule.isActive,
                ip: newRule.range || newRule.ip
            });
            
            setNewRule({
                type: 'allow',
                ip: '',
                range: '',
                description: '',
                isActive: true,
                priority: 100
            });
            setShowAddRule(false);
        } catch (error) {
            console.error('Failed to add rule:', error);
            alert('Failed to add rule. Please try again.');
        }
    };

    const handleToggleRule = async (rule: IPRule) => {
        try {
            await onUpdateRule(rule.id, { isActive: !rule.isActive });
        } catch (error) {
            console.error('Failed to toggle rule:', error);
        }
    };

    const handleDeleteRule = async (ruleId: string) => {
        if (window.confirm('Are you sure you want to delete this IP access rule?')) {
            try {
                await onDeleteRule(ruleId);
            } catch (error) {
                console.error('Failed to delete rule:', error);
            }
        }
    };

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString();
    };

    const getLocationFlag = (location?: string) => {
        if (!location) return '🌍';
        const country = location.toLowerCase();
        if (country.includes('united states') || country.includes('usa')) return '🇺🇸';
        if (country.includes('canada')) return '🇨🇦';
        if (country.includes('united kingdom') || country.includes('uk')) return '🇬🇧';
        if (country.includes('germany')) return '🇩🇪';
        if (country.includes('france')) return '🇫🇷';
        if (country.includes('india')) return '🇮🇳';
        if (country.includes('china')) return '🇨🇳';
        if (country.includes('japan')) return '🇯🇵';
        return '🌍';
    };

    const allowRules = rules.filter(r => r.type === 'allow').length;
    const blockRules = rules.filter(r => r.type === 'block').length;
    const activeRules = rules.filter(r => r.isActive).length;
    const recentBlocked = recentAttempts.filter(a => a.action === 'blocked').length;

    return (
        <div className="ip-access-control">
            <div className="ip-header">
                <div className="ip-title">
                    <h2>🌐 IP Access Control</h2>
                    <p>Manage IP-based access rules and monitor connection attempts</p>
                </div>
                <div className="ip-stats">
                    <div className="stat-card">
                        <span className="stat-value">{activeRules}</span>
                        <span className="stat-label">Active Rules</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-value">{allowRules}</span>
                        <span className="stat-label">Allow Rules</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-value">{blockRules}</span>
                        <span className="stat-label">Block Rules</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-value">{recentBlocked}</span>
                        <span className="stat-label">Recent Blocks</span>
                    </div>
                </div>
            </div>

            <div className="ip-controls">
                <div className="control-left">
                    <select 
                        value={filter} 
                        onChange={(e) => setFilter(e.target.value as any)}
                        className="filter-select"
                    >
                        <option value="all">All Rules</option>
                        <option value="allow">✅ Allow Rules</option>
                        <option value="block">🚫 Block Rules</option>
                    </select>
                    
                    <select 
                        value={sortBy} 
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="sort-select"
                    >
                        <option value="priority">Sort by Priority</option>
                        <option value="createdAt">Sort by Created</option>
                        <option value="hitCount">Sort by Usage</option>
                    </select>
                </div>

                <div className="control-right">
                    <button 
                        className="refresh-btn"
                        onClick={onRefresh}
                        disabled={loading}
                        title="Refresh rules and attempts"
                    >
                        <span className="refresh-icon">🔄</span>
                        Refresh
                    </button>
                    <button 
                        className="add-rule-btn"
                        onClick={() => setShowAddRule(true)}
                        disabled={loading}
                    >
                        <span className="add-icon">➕</span>
                        Add Rule
                    </button>
                </div>
            </div>

            {/* Add Rule Modal */}
            {showAddRule && (
                <div className="modal-overlay">
                    <div className="add-rule-modal">
                        <div className="modal-header">
                            <h3>➕ Add IP Access Rule</h3>
                            <button 
                                className="close-btn"
                                onClick={() => setShowAddRule(false)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="form-group">
                                <label>Rule Type</label>
                                <select 
                                    value={newRule.type}
                                    onChange={(e) => setNewRule(prev => ({ ...prev, type: e.target.value as any }))}
                                    className="rule-type-select"
                                >
                                    <option value="allow">✅ Allow Access</option>
                                    <option value="block">🚫 Block Access</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>IP Address or Range</label>
                                <input
                                    type="text"
                                    value={newRule.ip || newRule.range}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (value.includes('/')) {
                                            setNewRule(prev => ({ ...prev, ip: '', range: value }));
                                        } else {
                                            setNewRule(prev => ({ ...prev, ip: value, range: '' }));
                                        }
                                    }}
                                    placeholder="192.168.1.1 or 192.168.1.0/24"
                                    className="ip-input"
                                />
                                <div className="input-help">
                                    Enter a single IP (192.168.1.1) or CIDR range (192.168.1.0/24)
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Description</label>
                                <input
                                    type="text"
                                    value={newRule.description}
                                    onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Office network, VPN server, etc."
                                    className="description-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Priority (1-999, lower = higher priority)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="999"
                                    value={newRule.priority}
                                    onChange={(e) => setNewRule(prev => ({ ...prev, priority: parseInt(e.target.value) || 100 }))}
                                    className="priority-input"
                                />
                            </div>

                            <div className="form-group checkbox-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={newRule.isActive}
                                        onChange={(e) => setNewRule(prev => ({ ...prev, isActive: e.target.checked }))}
                                    />
                                    <span>Enable rule immediately</span>
                                </label>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button 
                                className="cancel-btn"
                                onClick={() => setShowAddRule(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                className="save-btn"
                                onClick={handleAddRule}
                                disabled={!newRule.description || (!newRule.ip && !newRule.range)}
                            >
                                Add Rule
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rules List */}
            <div className="rules-section">
                <h3>🛡️ Access Rules ({filteredRules.length})</h3>
                
                {filteredRules.length === 0 ? (
                    <div className="no-rules">
                        <div className="no-rules-icon">🌐</div>
                        <h4>No IP Rules Configured</h4>
                        <p>Add your first IP access rule to start controlling access by IP address.</p>
                        <button 
                            className="add-first-rule-btn"
                            onClick={() => setShowAddRule(true)}
                        >
                            ➕ Add First Rule
                        </button>
                    </div>
                ) : (
                    <div className="rules-list">
                        {filteredRules.map((rule) => (
                            <div key={rule.id} className={`rule-card ${rule.isActive ? 'active' : 'inactive'} ${rule.type}`}>
                                <div className="rule-main">
                                    <div className="rule-info">
                                        <div className="rule-header">
                                            <div className="rule-type-badge">
                                                {rule.type === 'allow' ? '✅ ALLOW' : '🚫 BLOCK'}
                                            </div>
                                            <div className="rule-ip">
                                                <span className="ip-icon">🌐</span>
                                                <span className="ip-text">{rule.ip}</span>
                                            </div>
                                            <div className="rule-priority">
                                                Priority: {rule.priority}
                                            </div>
                                        </div>
                                        <div className="rule-description">
                                            {rule.description}
                                        </div>
                                        <div className="rule-meta">
                                            <span>Created by {rule.createdBy}</span>
                                            <span>•</span>
                                            <span>{formatTimestamp(rule.createdAt)}</span>
                                            {rule.lastTriggered && (
                                                <>
                                                    <span>•</span>
                                                    <span>Last used: {formatTimestamp(rule.lastTriggered)}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="rule-stats">
                                        <div className="stat">
                                            <span className="stat-value">{rule.hitCount}</span>
                                            <span className="stat-label">Hits</span>
                                        </div>
                                        <div className={`status-badge ${rule.isActive ? 'active' : 'inactive'}`}>
                                            {rule.isActive ? '🟢 Active' : '🔴 Inactive'}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="rule-actions">
                                    <button
                                        className={`toggle-btn ${rule.isActive ? 'deactivate' : 'activate'}`}
                                        onClick={() => handleToggleRule(rule)}
                                        disabled={loading}
                                        title={rule.isActive ? 'Deactivate rule' : 'Activate rule'}
                                    >
                                        {rule.isActive ? '⏸️ Disable' : '▶️ Enable'}
                                    </button>
                                    <button
                                        className="delete-btn"
                                        onClick={() => handleDeleteRule(rule.id)}
                                        disabled={loading}
                                        title="Delete rule"
                                    >
                                        🗑️ Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Recent Attempts */}
            <div className="attempts-section">
                <h3>📊 Recent Access Attempts ({recentAttempts.length})</h3>
                
                {recentAttempts.length === 0 ? (
                    <div className="no-attempts">
                        <p>No recent access attempts to display.</p>
                    </div>
                ) : (
                    <div className="attempts-list">
                        <div className="attempts-header">
                            <div className="header-ip">IP Address</div>
                            <div className="header-location">Location</div>
                            <div className="header-action">Action</div>
                            <div className="header-time">Time</div>
                            <div className="header-reason">Reason</div>
                        </div>
                        {recentAttempts.slice(0, 50).map((attempt) => (
                            <div key={attempt.id} className={`attempt-row ${attempt.action}`}>
                                <div className="attempt-ip">
                                    <span className="ip-text">{attempt.ip}</span>
                                </div>
                                <div className="attempt-location">
                                    <span className="location-flag">{getLocationFlag(attempt.location)}</span>
                                    <span className="location-text">{attempt.location || 'Unknown'}</span>
                                </div>
                                <div className="attempt-action">
                                    <span className={`action-badge ${attempt.action}`}>
                                        {attempt.action === 'allowed' ? '✅ Allowed' : '🚫 Blocked'}
                                    </span>
                                </div>
                                <div className="attempt-time">
                                    {formatTimestamp(attempt.timestamp)}
                                </div>
                                <div className="attempt-reason">
                                    {attempt.reason}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default IPAccessControl;
