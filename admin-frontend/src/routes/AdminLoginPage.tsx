import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { useAdminAuth } from '../app/useAdminAuth';

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
                <h1>Admin Sign In</h1>
                <p className="admin-muted">Dedicated admin auth service with role-gated access.</p>
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
                    <input
                        type="email"
                        placeholder="admin@sarkariexams.me"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                    />
                    <input
                        type="text"
                        placeholder="2FA / backup code (optional)"
                        value={twoFactorCode}
                        onChange={(event) => setTwoFactorCode(event.target.value)}
                    />
                    {error ? <div style={{ color: '#b91c1c' }}>{error}</div> : null}
                    <button className="admin-btn primary" type="submit" disabled={submitting}>
                        {submitting ? 'Signing in...' : 'Sign in'}
                    </button>
                </form>
            </div>
        </div>
    );
}
