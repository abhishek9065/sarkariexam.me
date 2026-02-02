import { useState, useEffect, useRef } from 'react';
import './AdminLogin.css';
import { LazyImage } from '../ui/LazyImage';

interface AdminLoginProps {
    onLogin: (email: string, pass: string, twoFactorCode?: string) => Promise<void>;
    onForgotPassword?: (email: string) => Promise<void>;
    onEnable2FA?: () => Promise<{ qrCode: string; secret: string }>;
    onVerify2FA?: (code: string) => Promise<boolean>;
    loading?: boolean;
    error?: string;
}

interface FormErrors {
    email?: string;
    password?: string;
    general?: string;
    captcha?: string;
    forgotEmail?: string;
}

interface PasswordStrength {
    score: number;
    requirements: {
        length: boolean;
        uppercase: boolean;
        lowercase: boolean;
        number: boolean;
        special: boolean;
    };
}

export function AdminLogin({ onLogin, onForgotPassword, onEnable2FA, onVerify2FA, loading = false, error }: AdminLoginProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [formErrors, setFormErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState({ email: false, password: false });
    const [isFormValid, setIsFormValid] = useState(false);
    const [attemptCount, setAttemptCount] = useState(0);
    const [rememberMe, setRememberMe] = useState(false);
    const [view, setView] = useState<'login' | 'forgot' | 'success' | '2fa' | 'setup2fa'>('login');
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotSent, setForgotSent] = useState(false);
    const [forgotLoading, setForgotLoading] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({ score: 0, requirements: { length: false, uppercase: false, lowercase: false, number: false, special: false } });
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [qrCodeData, setQrCodeData] = useState<{qrCode: string; secret: string} | null>(null);
    const [, setRequire2FA] = useState(false);
    const [sessionInfo, setSessionInfo] = useState<{ip: string; device: string; location?: string} | null>(null);
    
    // Captcha state (Simple math challenge for demo)
    const [captchaChallenge, setCaptchaChallenge] = useState({ q: '3 + 4', a: 7 });
    const [captchaAnswer, setCaptchaAnswer] = useState('');
    const showCaptcha = attemptCount >= 3;

    // Loading timeout ref
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isTimedOut, setIsTimedOut] = useState(false);

    // Load saved email
    useEffect(() => {
        const savedEmail = localStorage.getItem('admin_email');
        const shouldRemember = localStorage.getItem('admin_remember') === 'true';
        
        if (savedEmail && shouldRemember) {
            const trimmed = savedEmail.trim();
            const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
            if (isValid) {
                setEmail(trimmed);
                setRememberMe(true);
            } else {
                localStorage.removeItem('admin_email');
                localStorage.removeItem('admin_remember');
            }
        }
        generateCaptcha();
    }, []);

    // Generate new captcha
    // Calculate password strength
    const calculatePasswordStrength = (password: string): PasswordStrength => {
        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };
        
        const score = Object.values(requirements).filter(Boolean).length;
        return { score, requirements };
    };
    
    const handlePasswordChange = (value: string) => {
        setPassword(value);
        setPasswordStrength(calculatePasswordStrength(value));
    };

    // Handle forgot password submission
    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!forgotEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
            setFormErrors({ forgotEmail: 'Please enter a valid email address' });
            return;
        }

        setForgotLoading(true);
        try {
            if (onForgotPassword) {
                await onForgotPassword(forgotEmail);
                setForgotSent(true);
            } else {
                // Simulate forgot password for demo
                setTimeout(() => {
                    setForgotSent(true);
                    setForgotLoading(false);
                }, 2000);
            }
        } catch (error) {
            console.error(error);
            setFormErrors({ general: 'Failed to send reset email. Please try again.' });
            setForgotLoading(false);
        } finally {
            if (onForgotPassword) setForgotLoading(false);
        }
    };

    // Handle 2FA setup
    const handleSetup2FA = async () => {
        if (!onEnable2FA) return;
        
        try {
            const result = await onEnable2FA();
            setQrCodeData(result);
            setView('setup2fa');
        } catch (error) {
            console.error(error);
            setFormErrors({ general: 'Failed to setup 2FA. Please try again.' });
        }
    };

    // Handle 2FA verification during setup
    const handleVerify2FASetup = async () => {
        if (!onVerify2FA) return;
        
        try {
            const isValid = await onVerify2FA(twoFactorCode);
            if (isValid) {
                setView('login');
                setFormErrors({ general: '2FA has been successfully enabled for your account.' });
                setTwoFactorCode('');
                setQrCodeData(null);
            } else {
                setFormErrors({ general: 'Invalid code. Please check your authenticator app.' });
                setTwoFactorCode('');
            }
        } catch (error) {
            console.error(error);
            setFormErrors({ general: 'Failed to verify 2FA code. Please try again.' });
        }
    };

    const generateCaptcha = () => {
        const a = Math.floor(Math.random() * 10);
        const b = Math.floor(Math.random() * 10);
        setCaptchaChallenge({ q: `${a} + ${b}`, a: a + b });
        setCaptchaAnswer('');
    };

    // Validate form inputs in real-time
    useEffect(() => {
        const errors: FormErrors = {};
        
        if (touched.email && !email) {
            errors.email = 'Email is required';
        } else if (touched.email && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.email = 'Please enter a valid email address';
        }
        
        if (touched.password && !password) {
            errors.password = 'Password is required';
        } else if (touched.password && password && password.length < 6) {
            errors.password = 'Password must be at least 6 characters';
        }

        if (showCaptcha && parseInt(captchaAnswer) !== captchaChallenge.a) {
            errors.captcha = 'Incorrect answer';
        }
        
        setFormErrors(errors);
        const basicValid = email.length > 0 && password.length >= 6 && !errors.email && !errors.password;
        const captchaValid = showCaptcha ? parseInt(captchaAnswer) === captchaChallenge.a : true;
        const twoFAValid = view === '2fa' ? twoFactorCode.length === 6 : true;
        setIsFormValid(basicValid && captchaValid && twoFAValid);
    }, [email, password, touched, captchaAnswer, showCaptcha, captchaChallenge, twoFactorCode, view]);

    // Handle loading timeout
    useEffect(() => {
        if (loading) {
            setIsTimedOut(false);
            timeoutRef.current = setTimeout(() => {
                setIsTimedOut(true);
            }, 30000); // 30s timeout
        } else {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        }
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [loading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched({ email: true, password: true });
        
        if (!isFormValid) {
            if (showCaptcha) generateCaptcha();
            return;
        }

        if (rememberMe) {
            localStorage.setItem('admin_email', email);
            localStorage.setItem('admin_remember', 'true');
        } else {
            localStorage.removeItem('admin_email');
            localStorage.removeItem('admin_remember');
        }
        
        setAttemptCount(prev => prev + 1);
        
        // Pass to parent with better error handling
        try {
            if (view === '2fa') {
                await onLogin(email, password, twoFactorCode);
            } else {
                await onLogin(email, password);
            }
        } catch (error: any) {
            if (showCaptcha) generateCaptcha();
            
            // Check if 2FA is required
            const errorMessage = error?.message || 'Authentication failed';
            const errorCode = error?.code || errorMessage;
            if (errorCode.includes('two_factor_setup_required')) {
                setView('setup2fa');
                setFormErrors({});
                setTwoFactorCode('');
                setQrCodeData(null);
                return;
            }
            if (errorCode.includes('2fa_required') || errorCode.includes('two_factor_required')) {
                setRequire2FA(true);
                setView('2fa');
                setFormErrors({});
                // Get session info for security display
                setSessionInfo({
                    ip: error?.clientIP || 'Unknown',
                    device: navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop',
                    location: error?.location || 'Unknown Location'
                });
                return;
            }
            
            // Provide more specific error messages
            if (errorMessage.includes('invalid credentials') || errorMessage.includes('unauthorized')) {
                setFormErrors({ general: 'Invalid email or password. Please check your credentials.' });
            } else if (errorMessage.includes('invalid_2fa') || errorMessage.includes('invalid_totp')) {
                setFormErrors({ general: 'Invalid 2FA code. Please check your authenticator app.' });
                setTwoFactorCode('');
            } else if (errorMessage.includes('locked') || errorMessage.includes('blocked')) {
                setFormErrors({ general: 'Account temporarily locked due to too many failed attempts.' });
            } else if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
                setFormErrors({ general: 'Network error. Please check your connection and try again.' });
            } else {
                setFormErrors({ general: errorMessage });
            }
        }
    };

    const handleForgotSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!forgotEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
             setFormErrors(prev => ({ ...prev, email: 'Valid email required' }));
             return;
        }
        // Simulate sending logic
        setForgotSent(true);
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    if (view === 'forgot') {
        return (
            <div className="admin-login-container">
                <div className="admin-login-card">
                    <div className="login-header">
                        <h2>Reset Password</h2>
                        <p className="login-subtitle">Enter your admin email to receive reset instructions</p>
                    </div>

                    {!forgotSent ? (
                        <form onSubmit={handleForgotSubmit} className="admin-login-form">
                             <div className="form-group">
                                <label htmlFor="forgot-email" className="form-label">Email Address</label>
                                <div className="input-wrapper">
                                    <input 
                                        id="forgot-email"
                                        type="email" 
                                        className="form-input"
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                        placeholder="admin@example.com"
                                        required
                                    />
                                    <span className="input-icon">📧</span>
                                </div>
                            </div>
                            <button type="submit" className="login-btn">Send Reset Link</button>
                            <div className="login-footer">
                                <button type="button" onClick={() => setView('login')} className="back-link">
                                    <span className="back-icon">←</span> Back to Login
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="admin-login-form">
                            <div className="login-error" style={{ background: 'rgba(34, 197, 94, 0.1)', borderColor: '#22c55e', color: '#22c55e' }}>
                                <span className="error-icon">✅</span>
                                If an account exists for <b>{forgotEmail}</b>, you will receive reset instructions shortly.
                            </div>
                            <div className="login-footer">
                                <button type="button" onClick={() => { setView('login'); setForgotSent(false); }} className="back-link">
                                    <span className="back-icon">←</span> Return to Login
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="admin-login-container">
            <div className="admin-login-card">
                {view === 'login' && (
                    <>
                        <div className="login-header">
                            <div className="security-indicator">
                                <span className="shield-icon">🛡️</span>
                                <span className="security-text">Secure Admin Access</span>
                            </div>
                            <h2>Admin Portal</h2>
                            <p className="login-subtitle">Enter your credentials to access the admin dashboard</p>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="admin-login-form">
                    {(error || formErrors.general || isTimedOut) && (
                        <div className="login-error" role="alert" aria-live="assertive">
                            <span className="error-icon">⚠️</span>
                            <div>
                                {isTimedOut ? 'Request timed out. Please check your connection.' : (error || formErrors.general)}
                                {showCaptcha && (
                                    <div className="security-warning">
                                        Security Check Required due to multiple failed attempts.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    <div className="form-group">
                        <label htmlFor="email" className="form-label">
                            Email Address
                            <span className="required" aria-hidden="true">*</span>
                        </label>
                        <div className={`input-wrapper ${formErrors.email ? 'error' : ''} ${email ? 'filled' : ''}`}>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); if(touched.email) setTouched(prev => ({...prev, email: true})); }}
                                onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                                placeholder="admin@example.com"
                                required
                                disabled={loading}
                                autoComplete="email"
                                className="form-input"
                                aria-invalid={!!formErrors.email}
                                aria-describedby={formErrors.email ? "email-error" : undefined}
                            />
                            <span className="input-icon">📧</span>
                        </div>
                        {formErrors.email && <div id="email-error" className="field-error">{formErrors.email}</div>}
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="password" className="form-label">
                            Password
                            <span className="required" aria-hidden="true">*</span>
                        </label>
                        <div className={`input-wrapper password-wrapper ${formErrors.password ? 'error' : ''} ${password ? 'filled' : ''}`}>
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => handlePasswordChange(e.target.value)}
                                onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
                                placeholder="Enter your password"
                                required
                                disabled={loading}
                                autoComplete="current-password"
                                className="form-input"
                                aria-invalid={!!formErrors.password}
                                aria-describedby={formErrors.password ? "password-error" : undefined}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={togglePasswordVisibility}
                                disabled={loading}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                        {formErrors.password && <div id="password-error" className="field-error">{formErrors.password}</div>}
                        
                        {/* Password Strength Indicator */}
                        {password && (
                            <div className="password-strength">
                                <div className="strength-meter">
                                    <div className={`strength-bar strength-${passwordStrength.score}`} />
                                </div>
                                <div className="strength-text">
                                    {passwordStrength.score === 0 && 'Very Weak'}
                                    {passwordStrength.score === 1 && 'Weak'}
                                    {passwordStrength.score === 2 && 'Fair'}
                                    {passwordStrength.score === 3 && 'Good'}
                                    {passwordStrength.score === 4 && 'Strong'}
                                    {passwordStrength.score === 5 && 'Very Strong'}
                                </div>
                                <div className="strength-requirements">
                                    <div className={`requirement ${passwordStrength.requirements.length ? 'met' : ''}`}>
                                        {passwordStrength.requirements.length ? '✓' : '○'} 8+ characters
                                    </div>
                                    <div className={`requirement ${passwordStrength.requirements.uppercase ? 'met' : ''}`}>
                                        {passwordStrength.requirements.uppercase ? '✓' : '○'} Uppercase letter
                                    </div>
                                    <div className={`requirement ${passwordStrength.requirements.number ? 'met' : ''}`}>
                                        {passwordStrength.requirements.number ? '✓' : '○'} Number
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="form-actions-row">
                        <label className="remember-me">
                            <input 
                                type="checkbox" 
                                className="remember-checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                disabled={loading}
                            />
                            Remember me for 30 days
                        </label>
                        <div className="auth-links">
                            <button 
                                type="button" 
                                className="forgot-password-link" 
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit', marginRight: '12px' }}
                                onClick={() => setView('forgot')}
                                disabled={loading}
                            >
                                Forgot Password?
                            </button>
                            {rememberMe && email && (
                                <button 
                                    type="button" 
                                    className="forgot-password-link" 
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit', marginRight: '12px', color: '#94a3b8' }}
                                    onClick={() => {
                                        setEmail('');
                                        setRememberMe(false);
                                        localStorage.removeItem('admin_email');
                                        localStorage.removeItem('admin_remember');
                                    }}
                                    disabled={loading}
                                >
                                    Use a different email
                                </button>
                            )}
                            {onEnable2FA && (
                                <button 
                                    type="button" 
                                    className="setup-2fa-link" 
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit', color: '#22c55e' }}
                                    onClick={() => setView('setup2fa')}
                                    disabled={loading}
                                    title="Enhance security with 2FA"
                                >
                                    🛡️ Setup 2FA
                                </button>
                            )}
                        </div>
                    </div>

                    {showCaptcha && (
                        <div className="captcha-challenge" role="group" aria-labelledby="captcha-label">
                            <span id="captcha-label" className="captcha-label">Security Check</span>
                            <div className="captcha-input-group">
                                <div className="captcha-question">{captchaChallenge.q} = ?</div>
                                <input
                                    type="number"
                                    className="captcha-input"
                                    value={captchaAnswer}
                                    onChange={(e) => setCaptchaAnswer(e.target.value)}
                                    placeholder="Answer"
                                    required
                                />
                            </div>
                            {formErrors.captcha && <div className="field-error">{formErrors.captcha}</div>}
                        </div>
                    )}
                    
                    <button 
                        type="submit" 
                        className={`login-btn ${!isFormValid ? 'disabled' : ''}`}
                        disabled={loading || !isFormValid}
                    >
                        {loading ? (
                            <>
                                <span className="loading-spinner"></span>
                                Authenticating...
                            </>
                        ) : (
                            <>
                                <span className="login-icon">🔐</span>
                                Sign In
                            </>
                        )}
                    </button>
                    
                    <div className="login-security-info">
                        <div className="security-features">
                            <div className="security-feature">
                                <span>🔒</span>
                                <span>Encrypted 256-bit</span>
                            </div>
                            <div className="security-feature">
                                <span>⏱️</span>
                                <span>Timeout: 30s</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="login-footer">
                        <a href="/" className="back-link">
                            <span className="back-icon">←</span>
                            Back to Home
                        </a>
                        <div className="help-text">
                            Need help? <a href="mailto:admin-support@sarkariexams.me" className="admin-contact-link">Contact system administrator</a>.
                        </div>
                    </div>
                </form>
            </>
            )}

            {view === 'forgot' && (
                <div className="forgot-password-view">
                    <div className="login-header">
                        <h2>Reset Password</h2>
                        <p className="login-subtitle">Enter your email to receive password reset instructions</p>
                    </div>

                    {!forgotSent ? (
                        <form onSubmit={handleForgotPassword} className="forgot-form">
                            {formErrors.general && (
                                <div className="login-error" role="alert">
                                    <span className="error-icon">⚠️</span>
                                    <div>{formErrors.general}</div>
                                </div>
                            )}

                            <div className="form-group">
                                <label htmlFor="forgot-email" className="form-label">
                                    Email Address
                                    <span className="required" aria-hidden="true">*</span>
                                </label>
                                <div className={`input-wrapper ${formErrors.forgotEmail ? 'error' : ''}`}>
                                    <input
                                        id="forgot-email"
                                        type="email"
                                        value={forgotEmail}
                                        onChange={(e) => {
                                            setForgotEmail(e.target.value);
                                            setFormErrors({});
                                        }}
                                        placeholder="admin@example.com"
                                        required
                                        disabled={forgotLoading}
                                        autoComplete="email"
                                        className="form-input"
                                        aria-invalid={!!formErrors.forgotEmail}
                                        aria-describedby={formErrors.forgotEmail ? "forgot-email-error" : undefined}
                                    />
                                    <span className="input-icon">📧</span>
                                </div>
                                {formErrors.forgotEmail && <div id="forgot-email-error" className="field-error">{formErrors.forgotEmail}</div>}
                            </div>

                            <div className="forgot-actions">
                                <button 
                                    type="submit" 
                                    className="login-btn"
                                    disabled={forgotLoading || !forgotEmail}
                                >
                                    {forgotLoading ? (
                                        <>
                                            <span className="loading-spinner"></span>
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <span className="login-icon">📤</span>
                                            Send Reset Email
                                        </>
                                    )}
                                </button>
                            
                                <button 
                                    type="button" 
                                    className="back-to-login-btn"
                                    onClick={() => setView('login')}
                                    disabled={forgotLoading}
                                >
                                    ← Back to Login
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="forgot-success">
                            <div className="success-icon">✅</div>
                            <h3>Reset Email Sent</h3>
                            <p>We've sent password reset instructions to <strong>{forgotEmail}</strong></p>
                            <p className="help-text">Please check your email and follow the instructions to reset your password.</p>
                            
                            <div className="forgot-actions">
                                <button 
                                    type="button" 
                                    className="login-btn"
                                    onClick={() => setView('login')}
                                >
                                    Back to Login
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {view === '2fa' && (
                <div className="two-factor-view">
                    <div className="login-header">
                        <div className="security-indicator">
                            <span className="shield-icon">🔐</span>
                            <span className="security-text">Two-Factor Authentication</span>
                        </div>
                        <h2>Security Verification</h2>
                        <p className="login-subtitle">Enter the 6-digit code from your authenticator app</p>
                    </div>

                    {sessionInfo && (
                        <div className="session-info">
                            <h4>🛡️ Login Attempt Details</h4>
                            <div className="session-details">
                                <div className="session-item">
                                    <span className="label">IP Address:</span>
                                    <span className="value">{sessionInfo.ip}</span>
                                </div>
                                <div className="session-item">
                                    <span className="label">Device:</span>
                                    <span className="value">{sessionInfo.device}</span>
                                </div>
                                <div className="session-item">
                                    <span className="label">Location:</span>
                                    <span className="value">{sessionInfo.location}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="two-factor-form">
                        {formErrors.general && (
                            <div className="login-error" role="alert">
                                <span className="error-icon">⚠️</span>
                                <div>{formErrors.general}</div>
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="totp-code" className="form-label">
                                Authentication Code
                                <span className="required" aria-hidden="true">*</span>
                            </label>
                            <div className="totp-input-wrapper">
                                <input
                                    id="totp-code"
                                    type="text"
                                    value={twoFactorCode}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/[^0-9]/g, '').substring(0, 6);
                                        setTwoFactorCode(value);
                                        setFormErrors({});
                                    }}
                                    placeholder="000000"
                                    maxLength={6}
                                    required
                                    disabled={loading}
                                    autoComplete="one-time-code"
                                    className="totp-input"
                                    pattern="[0-9]{6}"
                                    inputMode="numeric"
                                />
                                <span className="totp-icon">📱</span>
                            </div>
                            <div className="totp-help">
                                Enter the 6-digit code from your authenticator app (Google Authenticator, Authy, etc.)
                            </div>
                        </div>

                        <div className="two-factor-actions">
                            <button 
                                type="submit" 
                                className="login-btn"
                                disabled={loading || twoFactorCode.length !== 6}
                            >
                                {loading ? (
                                    <>
                                        <span className="loading-spinner"></span>
                                        Verifying...
                                    </>
                                ) : (
                                    <>
                                        <span className="login-icon">🔓</span>
                                        Verify & Continue
                                    </>
                                )}
                            </button>
                        
                            <button 
                                type="button" 
                                className="back-to-login-btn"
                                onClick={() => {
                                    setView('login');
                                    setTwoFactorCode('');
                                    setRequire2FA(false);
                                    setSessionInfo(null);
                                }}
                                disabled={loading}
                            >
                                ← Back to Login
                            </button>
                        </div>

                        <div className="two-factor-help">
                            <div className="help-section">
                                <h4>🔒 Security Tips:</h4>
                                <ul>
                                    <li>Never share your authenticator codes</li>
                                    <li>Codes expire after 30 seconds</li>
                                    <li>Use backup codes if you lose access</li>
                                </ul>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {view === 'setup2fa' && (
                <div className="setup-two-factor-view">
                    <div className="login-header">
                        <div className="security-indicator">
                            <span className="shield-icon">🛡️</span>
                            <span className="security-text">Enhanced Security Setup</span>
                        </div>
                        <h2>Enable Two-Factor Authentication</h2>
                        <p className="login-subtitle">Secure your admin account with an additional layer of protection</p>
                    </div>

                    {!qrCodeData ? (
                        <div className="setup-intro">
                            <div className="setup-benefits">
                                <h3>🔐 Why Enable 2FA?</h3>
                                <ul>
                                    <li>✅ Protect against unauthorized access</li>
                                    <li>✅ Secure even if password is compromised</li>
                                    <li>✅ Industry-standard security practice</li>
                                    <li>✅ Required for admin privileges</li>
                                </ul>
                            </div>
                            
                            <button 
                                type="button" 
                                className="login-btn"
                                onClick={handleSetup2FA}
                            >
                                <span className="login-icon">🚀</span>
                                Setup 2FA Now
                            </button>
                        </div>
                    ) : (
                        <div className="qr-setup">
                            <div className="setup-steps">
                                <h3>📱 Setup Steps:</h3>
                                <div className="steps-list">
                                    <div className="step">
                                        <span className="step-number">1</span>
                                        <span>Install an authenticator app (Google Authenticator, Authy, etc.)</span>
                                    </div>
                                    <div className="step">
                                        <span className="step-number">2</span>
                                        <span>Scan the QR code below with your app</span>
                                    </div>
                                    <div className="step">
                                        <span className="step-number">3</span>
                                        <span>Enter the 6-digit code to verify setup</span>
                                    </div>
                                </div>
                            </div>

                            <div className="qr-code-section">
                                <div className="qr-code-container">
                                    <LazyImage
                                        src={qrCodeData.qrCode}
                                        alt="2FA QR Code"
                                        className="qr-code"
                                        placeholder="skeleton"
                                    />
                                </div>
                                <div className="backup-secret">
                                    <h4>🔑 Backup Secret Key:</h4>
                                    <code className="secret-key">{qrCodeData.secret}</code>
                                    <p className="secret-help">Store this safely as a backup way to setup your authenticator</p>
                                </div>
                            </div>

                            <form onSubmit={(e) => { e.preventDefault(); handleVerify2FASetup(); }} className="verify-form">
                                {formErrors.general && (
                                    <div className="login-error" role="alert">
                                        <span className="error-icon">⚠️</span>
                                        <div>{formErrors.general}</div>
                                    </div>
                                )}

                                <div className="form-group">
                                    <label htmlFor="setup-code" className="form-label">
                                        Verification Code
                                        <span className="required" aria-hidden="true">*</span>
                                    </label>
                                    <div className="totp-input-wrapper">
                                        <input
                                            id="setup-code"
                                            type="text"
                                            value={twoFactorCode}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/[^0-9]/g, '').substring(0, 6);
                                                setTwoFactorCode(value);
                                                setFormErrors({});
                                            }}
                                            placeholder="000000"
                                            maxLength={6}
                                            required
                                            autoComplete="one-time-code"
                                            className="totp-input"
                                            pattern="[0-9]{6}"
                                            inputMode="numeric"
                                        />
                                        <span className="totp-icon">📱</span>
                                    </div>
                                </div>

                                <div className="setup-actions">
                                    <button 
                                        type="submit" 
                                        className="login-btn"
                                        disabled={twoFactorCode.length !== 6}
                                    >
                                        <span className="login-icon">✅</span>
                                        Complete Setup
                                    </button>
                                
                                    <button 
                                        type="button" 
                                        className="back-to-login-btn"
                                        onClick={() => {
                                            setView('login');
                                            setTwoFactorCode('');
                                            setQrCodeData(null);
                                        }}
                                    >
                                        ← Cancel Setup
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            )}
            </div>
        </div>
    );
}
