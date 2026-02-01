import React, { useState, useEffect } from 'react';
import './PasswordPolicy.css';

export interface PasswordPolicyRule {
    id: string;
    name: string;
    description: string;
    requirement: string;
    isActive: boolean;
    severity: 'required' | 'recommended' | 'optional';
    regex?: string;
    minValue?: number;
    maxValue?: number;
}

export interface PasswordCompliance {
    score: number; // 0-100
    passed: string[];
    failed: string[];
    warnings: string[];
    isCompliant: boolean;
    strengthLevel: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
}

interface PasswordPolicyProps {
    rules: PasswordPolicyRule[];
    currentPassword?: string;
    onUpdateRule: (ruleId: string, updates: Partial<PasswordPolicyRule>) => Promise<void>;
    onTestPassword?: (password: string) => PasswordCompliance;
    loading?: boolean;
}

const DEFAULT_RULES: PasswordPolicyRule[] = [
    {
        id: 'min-length',
        name: 'Minimum Length',
        description: 'Password must be at least 8 characters long',
        requirement: 'At least 8 characters',
        isActive: true,
        severity: 'required',
        minValue: 8
    },
    {
        id: 'max-length',
        name: 'Maximum Length',
        description: 'Password cannot exceed 128 characters',
        requirement: 'Maximum 128 characters',
        isActive: true,
        severity: 'recommended',
        maxValue: 128
    },
    {
        id: 'uppercase',
        name: 'Uppercase Letter',
        description: 'Password must contain at least one uppercase letter (A-Z)',
        requirement: 'At least 1 uppercase letter',
        isActive: true,
        severity: 'required',
        regex: '[A-Z]'
    },
    {
        id: 'lowercase',
        name: 'Lowercase Letter',
        description: 'Password must contain at least one lowercase letter (a-z)',
        requirement: 'At least 1 lowercase letter',
        isActive: true,
        severity: 'required',
        regex: '[a-z]'
    },
    {
        id: 'number',
        name: 'Numeric Character',
        description: 'Password must contain at least one number (0-9)',
        requirement: 'At least 1 number',
        isActive: true,
        severity: 'required',
        regex: '[0-9]'
    },
    {
        id: 'special',
        name: 'Special Character',
        description: 'Password must contain at least one special character (!@#$%^&*)',
        requirement: 'At least 1 special character',
        isActive: true,
        severity: 'recommended',
        regex: '[!@#$%^&*(),.?":{}|<>]'
    },
    {
        id: 'no-dictionary',
        name: 'No Dictionary Words',
        description: 'Password should not contain common dictionary words',
        requirement: 'Avoid common words',
        isActive: true,
        severity: 'recommended'
    },
    {
        id: 'no-repetition',
        name: 'No Character Repetition',
        description: 'Password should not have more than 2 consecutive identical characters',
        requirement: 'No character repetition (aaa)',
        isActive: true,
        severity: 'recommended',
        regex: '(.)\\\\1{2,}'
    },
    {
        id: 'no-sequence',
        name: 'No Sequential Characters',
        description: 'Password should not contain sequential characters (abc, 123)',
        requirement: 'Avoid sequences (abc, 123)',
        isActive: true,
        severity: 'recommended'
    },
    {
        id: 'no-personal-info',
        name: 'No Personal Information',
        description: 'Password should not contain personal information like name, email',
        requirement: 'Avoid personal information',
        isActive: true,
        severity: 'required'
    }
];

export function PasswordPolicy({ 
    rules = DEFAULT_RULES, 
    currentPassword = '', 
    onUpdateRule, 
    onTestPassword, 
    loading = false 
}: PasswordPolicyProps) {
    const [testPassword, setTestPassword] = useState('');
    const [compliance, setCompliance] = useState<PasswordCompliance | null>(null);
    const [showTestPassword, setShowTestPassword] = useState(false);
    const [selectedSeverity, setSelectedSeverity] = useState<'all' | 'required' | 'recommended' | 'optional'>('all');

    // Test password compliance
    const testPasswordCompliance = (password: string): PasswordCompliance => {
        if (onTestPassword) {
            return onTestPassword(password);
        }

        // Default implementation
        const passed: string[] = [];
        const failed: string[] = [];
        const warnings: string[] = [];
        let score = 0;

        const activeRules = rules.filter(rule => rule.isActive);
        const totalRules = activeRules.length;

        activeRules.forEach(rule => {
            let rulePass = false;

            switch (rule.id) {
                case 'min-length':
                    rulePass = password.length >= (rule.minValue || 8);
                    break;
                case 'max-length':
                    rulePass = password.length <= (rule.maxValue || 128);
                    break;
                case 'uppercase':
                case 'lowercase':
                case 'number':
                case 'special':
                    if (rule.regex) {
                        rulePass = new RegExp(rule.regex).test(password);
                    }
                    break;
                case 'no-repetition':
                    if (rule.regex) {
                        rulePass = !new RegExp(rule.regex).test(password);
                    }
                    break;
                case 'no-sequence':
                    // Simple sequence detection
                    rulePass = !/(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|123|234|345|456|567|678|789)/i.test(password);
                    break;
                case 'no-dictionary':
                    // Simple dictionary word check (in real app, use proper dictionary)
                    const commonWords = ['password', 'admin', '12345', 'qwerty', 'letmein', 'welcome', 'monkey', 'dragon'];
                    rulePass = !commonWords.some(word => password.toLowerCase().includes(word));
                    break;
                case 'no-personal-info':
                    // Basic check (in real app, check against user info)
                    rulePass = !/(admin|user|test|example|sarkari)/i.test(password);
                    break;
                default:
                    rulePass = true;
            }

            if (rulePass) {
                passed.push(rule.name);
                if (rule.severity === 'required') score += 15;
                else if (rule.severity === 'recommended') score += 10;
                else score += 5;
            } else {
                if (rule.severity === 'required') {
                    failed.push(rule.name);
                } else {
                    warnings.push(rule.name);
                }
            }
        });

        // Normalize score to 0-100
        score = Math.min(100, Math.max(0, score));

        const isCompliant = failed.length === 0;
        let strengthLevel: PasswordCompliance['strengthLevel'] = 'very-weak';

        if (score >= 90) strengthLevel = 'very-strong';
        else if (score >= 75) strengthLevel = 'strong';
        else if (score >= 60) strengthLevel = 'good';
        else if (score >= 40) strengthLevel = 'fair';
        else if (score >= 20) strengthLevel = 'weak';

        return {
            score,
            passed,
            failed,
            warnings,
            isCompliant,
            strengthLevel
        };
    };

    useEffect(() => {
        if (testPassword || currentPassword) {
            const password = testPassword || currentPassword;
            setCompliance(testPasswordCompliance(password));
        } else {
            setCompliance(null);
        }
    }, [testPassword, currentPassword, rules]);

    const handleToggleRule = async (rule: PasswordPolicyRule) => {
        try {
            await onUpdateRule(rule.id, { isActive: !rule.isActive });
        } catch (error) {
            console.error('Failed to update rule:', error);
        }
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'required': return '🔴';
            case 'recommended': return '🟡';
            case 'optional': return '🟢';
            default: return '🔘';
        }
    };

    const getStrengthColor = (level: string) => {
        switch (level) {
            case 'very-strong': return '#16a34a';
            case 'strong': return '#22c55e';
            case 'good': return '#65a30d';
            case 'fair': return '#eab308';
            case 'weak': return '#f97316';
            case 'very-weak': return '#ef4444';
            default: return '#64748b';
        }
    };

    const getStrengthIcon = (level: string) => {
        switch (level) {
            case 'very-strong': return '🛡️';
            case 'strong': return '🔒';
            case 'good': return '✅';
            case 'fair': return '⚠️';
            case 'weak': return '🔓';
            case 'very-weak': return '❌';
            default: return '🔘';
        }
    };

    const filteredRules = rules.filter(rule => 
        selectedSeverity === 'all' || rule.severity === selectedSeverity
    );

    const requiredRules = rules.filter(rule => rule.severity === 'required' && rule.isActive);
    const recommendedRules = rules.filter(rule => rule.severity === 'recommended' && rule.isActive);
    const optionalRules = rules.filter(rule => rule.severity === 'optional' && rule.isActive);

    return (
        <div className="password-policy">
            <div className="policy-header">
                <div className="header-title">
                    <h2>🔐 Password Policy Management</h2>
                    <p>Configure password requirements and security policies</p>
                </div>
                
                <div className="policy-stats">
                    <div className="stat-card required">
                        <span className="stat-value">{requiredRules.length}</span>
                        <span className="stat-label">Required Rules</span>
                    </div>
                    <div className="stat-card recommended">
                        <span className="stat-value">{recommendedRules.length}</span>
                        <span className="stat-label">Recommended</span>
                    </div>
                    <div className="stat-card optional">
                        <span className="stat-value">{optionalRules.length}</span>
                        <span className="stat-label">Optional</span>
                    </div>
                </div>
            </div>

            {/* Password Tester */}
            <div className="password-tester">
                <div className="tester-header">
                    <h3>🔍 Password Compliance Checker</h3>
                    <p>Test a password against current policy rules</p>
                </div>
                
                <div className="test-input-group">
                    <div className="test-input-wrapper">
                        <input
                            type={showTestPassword ? 'text' : 'password'}
                            value={testPassword}
                            onChange={(e) => setTestPassword(e.target.value)}
                            placeholder="Enter password to test compliance..."
                            className="test-password-input"
                        />
                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowTestPassword(!showTestPassword)}
                        >
                            {showTestPassword ? '👁️' : '👁️‍🗨️'}
                        </button>
                    </div>
                    
                    {compliance && testPassword && (
                        <div className="compliance-result">
                            <div className="compliance-overview">
                                <div className="compliance-score">
                                    <div 
                                        className="score-circle"
                                        style={{ 
                                            background: `conic-gradient(${getStrengthColor(compliance.strengthLevel)} ${compliance.score * 3.6}deg, rgba(100, 116, 139, 0.2) ${compliance.score * 3.6}deg)` 
                                        }}
                                    >
                                        <div className="score-content">
                                            <span className="score-value">{compliance.score}</span>
                                            <span className="score-label">Score</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="compliance-details">
                                    <div className="strength-indicator">
                                        <span className="strength-icon">
                                            {getStrengthIcon(compliance.strengthLevel)}
                                        </span>
                                        <span 
                                            className="strength-text"
                                            style={{ color: getStrengthColor(compliance.strengthLevel) }}
                                        >
                                            {compliance.strengthLevel.replace('-', ' ').toUpperCase()}
                                        </span>
                                    </div>
                                    
                                    <div className="compliance-status">
                                        <span className={`status-badge ${compliance.isCompliant ? 'compliant' : 'non-compliant'}`}>
                                            {compliance.isCompliant ? '✅ Compliant' : '❌ Non-Compliant'}
                                        </span>
                                    </div>
                                    
                                    <div className="compliance-summary">
                                        <div className="summary-item">
                                            <span className="summary-label">Passed:</span>
                                            <span className="summary-value passed">{compliance.passed.length}</span>
                                        </div>
                                        <div className="summary-item">
                                            <span className="summary-label">Failed:</span>
                                            <span className="summary-value failed">{compliance.failed.length}</span>
                                        </div>
                                        <div className="summary-item">
                                            <span className="summary-label">Warnings:</span>
                                            <span className="summary-value warnings">{compliance.warnings.length}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {(compliance.failed.length > 0 || compliance.warnings.length > 0) && (
                                <div className="compliance-issues">
                                    {compliance.failed.length > 0 && (
                                        <div className="issues-section failed">
                                            <h4>❌ Failed Requirements:</h4>
                                            <ul>
                                                {compliance.failed.map(issue => (
                                                    <li key={issue}>{issue}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    
                                    {compliance.warnings.length > 0 && (
                                        <div className="issues-section warnings">
                                            <h4>⚠️ Recommendations:</h4>
                                            <ul>
                                                {compliance.warnings.map(warning => (
                                                    <li key={warning}>{warning}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Policy Rules */}
            <div className="policy-rules">
                <div className="rules-header">
                    <h3>⚙️ Policy Rules Configuration</h3>
                    
                    <select 
                        value={selectedSeverity} 
                        onChange={(e) => setSelectedSeverity(e.target.value as any)}
                        className="severity-filter"
                    >
                        <option value="all">All Severities</option>
                        <option value="required">🔴 Required Only</option>
                        <option value="recommended">🟡 Recommended Only</option>
                        <option value="optional">🟢 Optional Only</option>
                    </select>
                </div>
                
                <div className="rules-list">
                    {filteredRules.map((rule) => (
                        <div key={rule.id} className={`rule-card ${rule.isActive ? 'active' : 'inactive'} ${rule.severity}`}>
                            <div className="rule-main">
                                <div className="rule-toggle">
                                    <input
                                        type="checkbox"
                                        checked={rule.isActive}
                                        onChange={() => handleToggleRule(rule)}
                                        disabled={loading}
                                        className="rule-checkbox"
                                    />
                                </div>
                                
                                <div className="rule-content">
                                    <div className="rule-header">
                                        <div className="rule-title">
                                            <span className="severity-icon">
                                                {getSeverityIcon(rule.severity)}
                                            </span>
                                            <span className="rule-name">{rule.name}</span>
                                        </div>
                                        <span className={`severity-badge ${rule.severity}`}>
                                            {rule.severity.toUpperCase()}
                                        </span>
                                    </div>
                                    
                                    <div className="rule-description">
                                        {rule.description}
                                    </div>
                                    
                                    <div className="rule-requirement">
                                        <strong>Requirement:</strong> {rule.requirement}
                                    </div>
                                    
                                    {rule.regex && (
                                        <div className="rule-regex">
                                            <strong>Pattern:</strong> 
                                            <code>{rule.regex}</code>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default PasswordPolicy;"
