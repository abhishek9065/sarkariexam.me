import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { useAdminAuth } from '../app/useAdminAuth';
import { OpsBadge } from '../components/ops';

export function AdminLoginPage() {
    const { user, login } = useAdminAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    if (user) return <Navigate to="/dashboard" replace />;

    return (
        <div className="admin-login-wrap">
            <div className="admin-login-card">
                <div className="admin-login-logo">SE</div>
                <h1 className="admin-login-title">SarkariExams Admin vNext</h1>
                <p className="admin-login-subtitle">Secure operations console with dedicated auth boundaries.</p>
                <div className="ops-row wrap admin-login-badges">
                    <OpsBadge tone="info">Admin Auth Boundary</OpsBadge>
                    <OpsBadge tone="warning">2FA Ready</OpsBadge>
                </div>

                <form
                    className="admin-login-form"
                    onSubmit={async (event) => {
                        event.preventDefault();
                        setError(null);
                        setSubmitting(true);
                        try {
                            await login(email, password, twoFactorCode || undefined);
                            navigate('/dashboard', { replace: true });
                        } catch (err) {
                            const message = err instanceof Error ? err.message : 'Admin login failed';
                            setError(message);
                        } finally {
                            setSubmitting(false);
                        }
                    }}
                >
                    <div className="admin-login-field">
                        <label className="admin-login-label" htmlFor="admin-email">Email address</label>
                        <input
                            id="admin-email"
                            type="email"
                            placeholder="admin@sarkariexams.me"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            autoComplete="email"
                            required
                        />
                    </div>
                    <div className="admin-login-field">
                        <label className="admin-login-label" htmlFor="admin-password">Password</label>
                        <input
                            id="admin-password"
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            autoComplete="current-password"
                            required
                        />
                    </div>
                    <div className="admin-login-field">
                        <label className="admin-login-label" htmlFor="admin-2fa">Two-factor code <span className="admin-login-optional">(optional)</span></label>
                        <input
                            id="admin-2fa"
                            type="text"
                            placeholder="6-digit code or backup key"
                            value={twoFactorCode}
                            onChange={(event) => setTwoFactorCode(event.target.value)}
                            autoComplete="one-time-code"
                        />
                    </div>

                    {error ? <div className="admin-alert error">{error}</div> : null}

                    <button className="admin-btn primary admin-login-submit" type="submit" disabled={submitting}>
                        {submitting ? 'Authenticating...' : 'Sign in'}
                    </button>
                </form>
            </div>
        </div>
    );
}
