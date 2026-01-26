import { useState, useEffect } from 'react';
import './AdminLogin.css';

interface AdminLoginProps {
    onLogin: (email: string, pass: string) => Promise<void>;
    loading?: boolean;
    error?: string;
}

interface FormErrors {
    email?: string;
    password?: string;
    general?: string;
}

export function AdminLogin({ onLogin, loading = false, error }: AdminLoginProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [formErrors, setFormErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState({ email: false, password: false });
    const [isFormValid, setIsFormValid] = useState(false);
    const [attemptCount, setAttemptCount] = useState(0);

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
        
        setFormErrors(errors);
        setIsFormValid(email.length > 0 && password.length >= 6 && Object.keys(errors).length === 0);
    }, [email, password, touched]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched({ email: true, password: true });
        
        if (!isFormValid) {
            return;
        }
        
        setAttemptCount(prev => prev + 1);
        await onLogin(email, password);
    };

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
        if (touched.email) {
            setTouched(prev => ({ ...prev, email: true }));
        }
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPassword(e.target.value);
        if (touched.password) {
            setTouched(prev => ({ ...prev, password: true }));
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <div className="admin-login-container">
            <div className="admin-login-card">
                <div className="login-header">
                    <div className="security-indicator">
                        <span className="shield-icon">🛡️</span>
                        <span className="security-text">Secure Admin Access</span>
                    </div>
                    <h2>Admin Portal</h2>
                    <p className="login-subtitle">Enter your credentials to access the admin dashboard</p>
                </div>
                
                <form onSubmit={handleSubmit} className="admin-login-form">
                    {(error || formErrors.general) && (
                        <div className="login-error">
                            <span className="error-icon">⚠️</span>
                            {error || formErrors.general}
                            {attemptCount >= 3 && (
                                <div className="security-warning">
                                    Multiple failed attempts detected. Please ensure you're using the correct credentials.
                                </div>
                            )}
                        </div>
                    )}
                    
                    <div className="form-group">
                        <label htmlFor="email" className="form-label">
                            Email Address
                            <span className="required">*</span>
                        </label>
                        <div className={`input-wrapper ${formErrors.email ? 'error' : ''} ${email ? 'filled' : ''}`}>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={handleEmailChange}
                                onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                                placeholder="admin@example.com"
                                required
                                disabled={loading}
                                autoComplete="email"
                                className="form-input"
                            />
                            <span className="input-icon">📧</span>
                        </div>
                        {formErrors.email && <div className="field-error">{formErrors.email}</div>}
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="password" className="form-label">
                            Password
                            <span className="required">*</span>
                        </label>
                        <div className={`input-wrapper password-wrapper ${formErrors.password ? 'error' : ''} ${password ? 'filled' : ''}`}>
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={handlePasswordChange}
                                onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
                                placeholder="Enter your password"
                                required
                                disabled={loading}
                                autoComplete="current-password"
                                className="form-input"
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
                        {formErrors.password && <div className="field-error">{formErrors.password}</div>}
                    </div>
                    
                    <button 
                        type="submit" 
                        className={`login-btn ${!isFormValid && touched.email && touched.password ? 'disabled' : ''}`}
                        disabled={loading || (!isFormValid && touched.email && touched.password)}
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
                                <span>Encrypted Connection</span>
                            </div>
                            <div className="security-feature">
                                <span>⏱️</span>
                                <span>Session Timeout: 2 hours</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="login-footer">
                        <a href="/" className="back-link">
                            <span className="back-icon">←</span>
                            Back to Home
                        </a>
                        <div className="help-text">
                            Need help? Contact your system administrator.
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
