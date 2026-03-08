import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import { useAdminAuth } from '../app/useAdminAuth';
import { OpsBadge } from '../components/ops';
import {
    adminForgotPassword,
    adminResetPassword,
    setupAdminTwoFactor,
    verifyAdminTwoFactor,
} from '../lib/api/client';

type AuthMode = 'login' | 'forgot-password' | 'reset-password';

export function AdminLoginPage() {
    const { user, login } = useAdminAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const mode = (searchParams.get('mode') as AuthMode) || 'login';
    const token = searchParams.get('token') || '';
    const [email, setEmail] = useState(searchParams.get('email') || '');
    const [password, setPassword] = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [setupToken, setSetupToken] = useState<string | null>(null);
    const [setupQrCode, setSetupQrCode] = useState<string | null>(null);
    const [setupSecret, setSetupSecret] = useState<string | null>(null);
    const [setupVerificationCode, setSetupVerificationCode] = useState('');
    const [setupVerified, setSetupVerified] = useState(false);
    const [setupBusy, setSetupBusy] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    if (user) return <Navigate to="/dashboard" replace />;

    const resetTwoFactorSetup = () => {
        setSetupToken(null);
        setSetupQrCode(null);
        setSetupSecret(null);
        setSetupVerificationCode('');
        setSetupVerified(false);
        setSetupBusy(false);
    };

    const switchMode = (nextMode: AuthMode) => {
        const next = new URLSearchParams(searchParams);
        if (nextMode === 'login') {
            next.delete('mode');
            next.delete('token');
        } else {
            next.set('mode', nextMode);
        }
        setSearchParams(next);
        setError(null);
        setNotice(null);
        setPassword('');
        setTwoFactorCode('');
        resetTwoFactorSetup();
    };

    const beginTwoFactorSetup = async (challengeToken?: string, challengeMessage?: string) => {
        if (!challengeToken) {
            setError('Two-factor setup token missing from login challenge.');
            return;
        }

        setSetupBusy(true);
        setError(null);
        try {
            const setup = await setupAdminTwoFactor(challengeToken);
            setSetupToken(challengeToken);
            setSetupQrCode(setup.qrCode);
            setSetupSecret(setup.secret);
            setSetupVerified(false);
            setNotice(challengeMessage ?? 'Two-factor setup required. Scan the QR code and verify once to continue.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to initialize two-factor setup');
        } finally {
            setSetupBusy(false);
        }
    };

    const completeTwoFactorSetup = async () => {
        if (!setupToken) {
            setError('Two-factor setup token missing. Retry sign-in.');
            return;
        }
        setSetupBusy(true);
        setError(null);
        setNotice(null);
        try {
            await verifyAdminTwoFactor(setupVerificationCode, setupToken);
            setSetupVerified(true);
            setPassword('');
            setTwoFactorCode('');
            setNotice('Two-factor enabled. Sign in again with your authenticator code, then generate backup codes from Configuration.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Two-factor verification failed');
        } finally {
            setSetupBusy(false);
        }
    };

    return (
        <div className="admin-login-wrap">
            <div className="admin-login-card">
                <div className="admin-login-logo">SE</div>
                <h1 className="admin-login-title">SarkariExams Admin vNext</h1>
                <p className="admin-login-subtitle">Secure operations console with dedicated auth boundaries.</p>
                <div className="ops-row wrap admin-login-badges">
                    <OpsBadge tone="info">Admin Auth Boundary</OpsBadge>
                    <OpsBadge tone={setupToken ? 'warning' : 'success'}>
                        {setupToken ? '2FA Setup In Progress' : '2FA Ready'}
                    </OpsBadge>
                </div>

                <form
                    className="admin-login-form"
                    onSubmit={async (event) => {
                        event.preventDefault();
                        setError(null);
                        setNotice(null);
                        setSubmitting(true);
                        try {
                            if (mode === 'forgot-password') {
                                await adminForgotPassword(email);
                                const next = new URLSearchParams(searchParams);
                                next.delete('mode');
                                next.delete('token');
                                setSearchParams(next);
                                setNotice('If an admin account exists for this email, reset instructions have been sent.');
                                setPassword('');
                                setTwoFactorCode('');
                                return;
                            }
                            if (mode === 'reset-password') {
                                await adminResetPassword(email, token, password);
                                const next = new URLSearchParams(searchParams);
                                next.delete('mode');
                                next.delete('token');
                                setSearchParams(next);
                                setNotice('Password reset successful. Sign in with your new password.');
                                setPassword('');
                                setTwoFactorCode('');
                                return;
                            }

                            const result = await login(email, password, twoFactorCode || undefined);
                            if (result.status === 'authenticated') {
                                navigate('/dashboard', { replace: true });
                                return;
                            }
                            if (result.status === 'two-factor-required') {
                                setError(result.message ?? 'Two-factor authentication required. Enter your authenticator code or backup code.');
                                return;
                            }

                            await beginTwoFactorSetup(result.setupToken, result.message);
                        } catch (err) {
                            const message = err instanceof Error ? err.message : 'Admin authentication failed';
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

                    {mode !== 'forgot-password' ? (
                        <div className="admin-login-field">
                            <label className="admin-login-label" htmlFor="admin-password">
                                {mode === 'reset-password' ? 'New Password' : 'Password'}
                            </label>
                            <input
                                id="admin-password"
                                type="password"
                                placeholder={mode === 'reset-password' ? 'Set a strong new password' : 'Enter your password'}
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                autoComplete={mode === 'reset-password' ? 'new-password' : 'current-password'}
                                required
                            />
                        </div>
                    ) : null}

                    {mode === 'login' ? (
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
                    ) : null}

                    {notice ? <div className="admin-alert success">{notice}</div> : null}
                    {error ? <div className="admin-alert error">{error}</div> : null}

                    <button className="admin-btn primary admin-login-submit" type="submit" disabled={submitting}>
                        {submitting
                            ? 'Submitting...'
                            : mode === 'forgot-password'
                                ? 'Send Reset Link'
                                : mode === 'reset-password'
                                    ? 'Reset Password'
                                    : 'Sign in'}
                    </button>
                </form>

                {setupToken ? (
                    <div className="admin-login-setup-panel">
                        <div className="ops-row wrap admin-login-badges">
                            <OpsBadge tone="warning">Two-factor setup required</OpsBadge>
                            <OpsBadge tone={setupVerified ? 'success' : 'info'}>
                                {setupVerified ? 'Verified' : 'Pending verification'}
                            </OpsBadge>
                        </div>
                        <p className="admin-login-setup-copy">
                            Scan the QR code with your authenticator app, or enter the manual secret. Then verify once before signing in again.
                        </p>
                        {setupBusy && !setupQrCode ? <div className="admin-alert info">Preparing your authenticator setup...</div> : null}
                        {setupQrCode ? (
                            <div className="admin-login-setup-qr">
                                <img src={setupQrCode} alt="Admin two-factor QR code" className="admin-login-setup-image" />
                            </div>
                        ) : null}
                        {setupSecret ? (
                            <div className="admin-login-setup-secret">
                                <span>Manual secret</span>
                                <code>{setupSecret}</code>
                            </div>
                        ) : null}
                        <div className="admin-login-field">
                            <label className="admin-login-label" htmlFor="admin-setup-verify">Verify setup code</label>
                            <input
                                id="admin-setup-verify"
                                type="text"
                                placeholder="Enter the 6-digit authenticator code"
                                value={setupVerificationCode}
                                onChange={(event) => setSetupVerificationCode(event.target.value)}
                                autoComplete="one-time-code"
                            />
                        </div>
                        <div className="ops-actions">
                            <button
                                type="button"
                                className="admin-btn primary"
                                disabled={setupBusy || setupVerificationCode.trim().length === 0}
                                onClick={() => void completeTwoFactorSetup()}
                            >
                                {setupBusy ? 'Verifying...' : 'Verify 2FA Setup'}
                            </button>
                            <button type="button" className="admin-btn subtle" onClick={resetTwoFactorSetup}>
                                Dismiss
                            </button>
                        </div>
                    </div>
                ) : null}

                <div className="ops-actions">
                    {mode !== 'login' ? (
                        <button type="button" className="admin-btn small subtle" onClick={() => switchMode('login')}>
                            Back to Sign In
                        </button>
                    ) : null}
                    {mode === 'login' ? (
                        <button type="button" className="admin-btn small subtle" onClick={() => switchMode('forgot-password')}>
                            Forgot Password
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
