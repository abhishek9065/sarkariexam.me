import React, { useState, useEffect } from 'react';
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
    const [selectedRule, setSelectedRule] = useState<string | null>(null);
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
                                    onChange={(e) => {\n                                        const value = e.target.value;\n                                        if (value.includes('/')) {\n                                            setNewRule(prev => ({ ...prev, ip: '', range: value }));\n                                        } else {\n                                            setNewRule(prev => ({ ...prev, ip: value, range: '' }));\n                                        }\n                                    }}\n                                    placeholder=\"192.168.1.1 or 192.168.1.0/24\"\n                                    className=\"ip-input\"\n                                />\n                                <div className=\"input-help\">\n                                    Enter a single IP (192.168.1.1) or CIDR range (192.168.1.0/24)\n                                </div>\n                            </div>\n\n                            <div className=\"form-group\">\n                                <label>Description</label>\n                                <input\n                                    type=\"text\"\n                                    value={newRule.description}\n                                    onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}\n                                    placeholder=\"Office network, VPN server, etc.\"\n                                    className=\"description-input\"\n                                />\n                            </div>\n\n                            <div className=\"form-group\">\n                                <label>Priority (1-999, lower = higher priority)</label>\n                                <input\n                                    type=\"number\"\n                                    min=\"1\"\n                                    max=\"999\"\n                                    value={newRule.priority}\n                                    onChange={(e) => setNewRule(prev => ({ ...prev, priority: parseInt(e.target.value) || 100 }))}\n                                    className=\"priority-input\"\n                                />\n                            </div>\n\n                            <div className=\"form-group checkbox-group\">\n                                <label className=\"checkbox-label\">\n                                    <input\n                                        type=\"checkbox\"\n                                        checked={newRule.isActive}\n                                        onChange={(e) => setNewRule(prev => ({ ...prev, isActive: e.target.checked }))}\n                                    />\n                                    <span>Enable rule immediately</span>\n                                </label>\n                            </div>\n                        </div>\n\n                        <div className=\"modal-footer\">\n                            <button \n                                className=\"cancel-btn\"\n                                onClick={() => setShowAddRule(false)}\n                            >\n                                Cancel\n                            </button>\n                            <button \n                                className=\"save-btn\"\n                                onClick={handleAddRule}\n                                disabled={!newRule.description || (!newRule.ip && !newRule.range)}\n                            >\n                                Add Rule\n                            </button>\n                        </div>\n                    </div>\n                </div>\n            )}\n\n            {/* Rules List */}\n            <div className=\"rules-section\">\n                <h3>🛡️ Access Rules ({filteredRules.length})</h3>\n                \n                {filteredRules.length === 0 ? (\n                    <div className=\"no-rules\">\n                        <div className=\"no-rules-icon\">🌐</div>\n                        <h4>No IP Rules Configured</h4>\n                        <p>Add your first IP access rule to start controlling access by IP address.</p>\n                        <button \n                            className=\"add-first-rule-btn\"\n                            onClick={() => setShowAddRule(true)}\n                        >\n                            ➕ Add First Rule\n                        </button>\n                    </div>\n                ) : (\n                    <div className=\"rules-list\">\n                        {filteredRules.map((rule) => (\n                            <div key={rule.id} className={`rule-card ${rule.isActive ? 'active' : 'inactive'} ${rule.type}`}>\n                                <div className=\"rule-main\">\n                                    <div className=\"rule-info\">\n                                        <div className=\"rule-header\">\n                                            <div className=\"rule-type-badge\">\n                                                {rule.type === 'allow' ? '✅ ALLOW' : '🚫 BLOCK'}\n                                            </div>\n                                            <div className=\"rule-ip\">\n                                                <span className=\"ip-icon\">🌐</span>\n                                                <span className=\"ip-text\">{rule.ip}</span>\n                                            </div>\n                                            <div className=\"rule-priority\">\n                                                Priority: {rule.priority}\n                                            </div>\n                                        </div>\n                                        <div className=\"rule-description\">\n                                            {rule.description}\n                                        </div>\n                                        <div className=\"rule-meta\">\n                                            <span>Created by {rule.createdBy}</span>\n                                            <span>•</span>\n                                            <span>{formatTimestamp(rule.createdAt)}</span>\n                                            {rule.lastTriggered && (\n                                                <>\n                                                    <span>•</span>\n                                                    <span>Last used: {formatTimestamp(rule.lastTriggered)}</span>\n                                                </>\n                                            )}\n                                        </div>\n                                    </div>\n                                    <div className=\"rule-stats\">\n                                        <div className=\"stat\">\n                                            <span className=\"stat-value\">{rule.hitCount}</span>\n                                            <span className=\"stat-label\">Hits</span>\n                                        </div>\n                                        <div className={`status-badge ${rule.isActive ? 'active' : 'inactive'}`}>\n                                            {rule.isActive ? '🟢 Active' : '🔴 Inactive'}\n                                        </div>\n                                    </div>\n                                </div>\n                                \n                                <div className=\"rule-actions\">\n                                    <button\n                                        className={`toggle-btn ${rule.isActive ? 'deactivate' : 'activate'}`}\n                                        onClick={() => handleToggleRule(rule)}\n                                        disabled={loading}\n                                        title={rule.isActive ? 'Deactivate rule' : 'Activate rule'}\n                                    >\n                                        {rule.isActive ? '⏸️ Disable' : '▶️ Enable'}\n                                    </button>\n                                    <button\n                                        className=\"delete-btn\"\n                                        onClick={() => handleDeleteRule(rule.id)}\n                                        disabled={loading}\n                                        title=\"Delete rule\"\n                                    >\n                                        🗑️ Delete\n                                    </button>\n                                </div>\n                            </div>\n                        ))}\n                    </div>\n                )}\n            </div>\n\n            {/* Recent Attempts */}\n            <div className=\"attempts-section\">\n                <h3>📊 Recent Access Attempts ({recentAttempts.length})</h3>\n                \n                {recentAttempts.length === 0 ? (\n                    <div className=\"no-attempts\">\n                        <p>No recent access attempts to display.</p>\n                    </div>\n                ) : (\n                    <div className=\"attempts-list\">\n                        <div className=\"attempts-header\">\n                            <div className=\"header-ip\">IP Address</div>\n                            <div className=\"header-location\">Location</div>\n                            <div className=\"header-action\">Action</div>\n                            <div className=\"header-time\">Time</div>\n                            <div className=\"header-reason\">Reason</div>\n                        </div>\n                        {recentAttempts.slice(0, 50).map((attempt) => (\n                            <div key={attempt.id} className={`attempt-row ${attempt.action}`}>\n                                <div className=\"attempt-ip\">\n                                    <span className=\"ip-text\">{attempt.ip}</span>\n                                </div>\n                                <div className=\"attempt-location\">\n                                    <span className=\"location-flag\">{getLocationFlag(attempt.location)}</span>\n                                    <span className=\"location-text\">{attempt.location || 'Unknown'}</span>\n                                </div>\n                                <div className=\"attempt-action\">\n                                    <span className={`action-badge ${attempt.action}`}>\n                                        {attempt.action === 'allowed' ? '✅ Allowed' : '🚫 Blocked'}\n                                    </span>\n                                </div>\n                                <div className=\"attempt-time\">\n                                    {formatTimestamp(attempt.timestamp)}\n                                </div>\n                                <div className=\"attempt-reason\">\n                                    {attempt.reason}\n                                </div>\n                            </div>\n                        ))}\n                    </div>\n                )}\n            </div>\n        </div>\n    );\n}\n\nexport default IPAccessControl;"