import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { useAdminAuth } from '../app/useAdminAuth';
import { OpsBadge } from '../components/ops';
import {
    adminForgotPassword,
    adminResetPassword,
    setupAdminTwoFactor,
    verifyAdminTwoFactor,
} from '../lib/api/client';

type AuthMode = 'login' | 'forgot-password' | 'reset-password';
type SessionAuthStage = 'password' | '2fa_required' | '2fa_setup_required' | 'authenticated' | 'session_expired' | 'locked_out';
const RESET_TOKEN_STORAGE_KEY = 'admin_reset_token';

const readResetTokenFromHash = (hash: string): string => {
    const normalizedHash = hash.startsWith('#') ? hash.slice(1) : hash;
    if (!normalizedHash) return '';
    return new URLSearchParams(normalizedHash).get('token')?.trim() ?? '';
};

const readStoredResetToken = (): string => {
    if (typeof window === 'undefined') return '';
    try {
        return window.sessionStorage.getItem(RESET_TOKEN_STORAGE_KEY)?.trim() ?? '';
    } catch {
        return '';
    }
};

const persistResetToken = (token: string) => {
    if (typeof window === 'undefined') return;
    try {
        window.sessionStorage.setItem(RESET_TOKEN_STORAGE_KEY, token);
    } catch {
        // Ignore storage errors and keep the token in component state only.
    }
};

const clearStoredResetToken = () => {
    if (typeof window === 'undefined') return;
    try {
        window.sessionStorage.removeItem(RESET_TOKEN_STORAGE_KEY);
    } catch {
        // Ignore storage errors.
    }
};

export function AdminLoginPage() {
    const { user, login, sessionStatus } = useAdminAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const mode = (searchParams.get('mode') as AuthMode) || 'login';
    const [email, setEmail] = useState(searchParams.get('email') || '');
    const [password, setPassword] = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [resetToken, setResetToken] = useState(() => {
        const initialHashToken = typeof window === 'undefined' ? '' : readResetTokenFromHash(window.location.hash);
        const initialQueryToken = searchParams.get('token')?.trim() ?? '';
        return initialHashToken || initialQueryToken || readStoredResetToken();
    });
    const [loginChallengeToken, setLoginChallengeToken] = useState<string | null>(null);
    const [setupToken, setSetupToken] = useState<string | null>(null);
    const [setupQrCode, setSetupQrCode] = useState<string | null>(null);
    const [setupSecret, setSetupSecret] = useState<string | null>(null);
    const [setupVerificationCode, setSetupVerificationCode] = useState('');
    const [setupVerified, setSetupVerified] = useState(false);
    const [setupBusy, setSetupBusy] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [sessionStage, setSessionStage] = useState<SessionAuthStage>(() => (
        searchParams.get('reason') === 'session-expired' ? 'session_expired' : 'password'
    ));
    const [lockoutUntilMs, setLockoutUntilMs] = useState<number | null>(null);

    const sessionExpiredReason = searchParams.get('reason') === 'session-expired';

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const queryToken = queryParams.get('token')?.trim() ?? '';
        const hashToken = readResetTokenFromHash(location.hash);
        const urlToken = hashToken || queryToken;

        if (urlToken) {
            persistResetToken(urlToken);
            if (urlToken !== resetToken) {
                setResetToken(urlToken);
            }

            queryParams.delete('token');
            const nextSearch = queryParams.toString();
            navigate({
                pathname: location.pathname,
                search: nextSearch ? `?${nextSearch}` : '',
                hash: '',
            }, { replace: true });
            return;
        }

        if (mode === 'reset-password') {
            const storedToken = readStoredResetToken();
            if (storedToken && storedToken !== resetToken) {
                setResetToken(storedToken);
            }
            return;
        }

        if (resetToken) {
            setResetToken('');
            clearStoredResetToken();
        }
    }, [location.hash, location.pathname, location.search, mode, navigate, resetToken]);

    useEffect(() => {
        if (mode !== 'login') return;
        if ((sessionExpiredReason || sessionStatus === 'session_expired') && !loginChallengeToken && !setupToken) {
            setSessionStage('session_expired');
            setNotice((current) => current ?? 'Your admin session expired. Sign in again to continue.');
        }
    }, [loginChallengeToken, mode, sessionExpiredReason, sessionStatus, setupToken]);

    useEffect(() => {
        if (sessionStage !== 'locked_out' || !lockoutUntilMs) return undefined;
        const remaining = lockoutUntilMs - Date.now();
        if (remaining <= 0) {
            setLockoutUntilMs(null);
            setSessionStage('password');
            return undefined;
        }

        const timeout = window.setTimeout(() => {
            setLockoutUntilMs(null);
            setSessionStage('password');
        }, remaining);
        return () => window.clearTimeout(timeout);
    }, [lockoutUntilMs, sessionStage]);

    const resetTwoFactorSetup = () => {
        setLoginChallengeToken(null);
        setSetupToken(null);
        setSetupQrCode(null);
        setSetupSecret(null);
        setSetupVerificationCode('');
        setSetupVerified(false);
        setSetupBusy(false);
    };

    const switchMode = (nextMode: AuthMode) => {
        const next = new URLSearchParams(searchParams);
        next.delete('reason');
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
        setResetToken('');
        setLockoutUntilMs(null);
        setSessionStage(nextMode === 'login' && sessionStatus === 'session_expired' ? 'session_expired' : 'password');
        clearStoredResetToken();
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
            setSessionStage('2fa_setup_required');
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

    if (user) return <Navigate to="/dashboard" replace />;

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
            setSessionStage('password');
            setNotice('Two-factor enabled. Sign in again with your authenticator code, then generate backup codes from Configuration.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Two-factor verification failed');
        } finally {
            setSetupBusy(false);
        }
    };

    const loginSubtitle = sessionStage === '2fa_required'
        ? 'Password accepted. Finish session activation with your authenticator code or a backup code.'
        : sessionStage === '2fa_setup_required'
            ? 'This admin account must complete two-factor enrollment before the console session can be activated.'
            : sessionStage === 'session_expired'
                ? 'Your previous admin session expired. Sign in again to continue.'
                : sessionStage === 'locked_out'
                    ? 'Too many attempts were detected. Wait for the lockout window to clear, then retry sign-in.'
                    : 'Session sign-in activates the admin console. Sensitive actions use a separate step-up check later.';

    const stageBadge = sessionStage === '2fa_required'
        ? { tone: 'warning' as const, label: '2FA Challenge' }
        : sessionStage === '2fa_setup_required'
            ? { tone: 'warning' as const, label: '2FA Setup Required' }
            : sessionStage === 'session_expired'
                ? { tone: 'warning' as const, label: 'Session Expired' }
                : sessionStage === 'locked_out'
                    ? { tone: 'danger' as const, label: 'Rate Limited' }
                    : { tone: 'success' as const, label: 'Session Ready' };
    const modeBadge = mode === 'forgot-password'
        ? { tone: 'warning' as const, label: 'Recovery' }
        : mode === 'reset-password'
            ? { tone: 'info' as const, label: 'Reset Password' }
            : { tone: 'info' as const, label: 'Session Sign-In' };
    const railItems = [
        {
            title: 'Session auth',
            description: mode === 'login'
                ? 'Sign in with password and two-factor to enter the console.'
                : 'Recovery stays isolated from editorial work until the session is restored.',
        },
        {
            title: 'Step-up later',
            description: 'Publish, approval, delete, and account controls still require fresh verification inside the console.',
        },
        {
            title: 'Desktop workflow',
            description: 'The rebuilt admin is optimized for dense editorial, review, and governance work on large screens.',
        },
    ];
    const workspaceGroups = ['Today', 'Content Desk', 'Review Pipeline', 'Governance', 'Monitoring'];

    return (
        <div className="admin-login-wrap">
            <div className="admin-login-card admin-login-shell">
                <div className="admin-login-grid">
                    <div className="admin-login-main">
                        <div className="admin-login-header">
                            <div className="admin-login-logo">SE</div>
                            <p className="admin-login-kicker">Editorial Operations Console</p>
                            <h1 className="admin-login-title">SarkariExams Admin vNext</h1>
                            <p className="admin-login-subtitle">{loginSubtitle}</p>
                            <div className="ops-row wrap admin-login-badges">
                                <OpsBadge tone={modeBadge.tone}>{modeBadge.label}</OpsBadge>
                                <OpsBadge tone={stageBadge.tone}>{stageBadge.label}</OpsBadge>
                            </div>
                            <div className="admin-alert info">
                                Session sign-in gets you into the console. Step-up verification is requested later for publish, delete, approvals, and other sensitive actions.
                            </div>
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
                                next.delete('reason');
                                setSearchParams(next);
                                setNotice('If an admin account exists for this email, reset instructions have been sent.');
                                setPassword('');
                                setTwoFactorCode('');
                                setLoginChallengeToken(null);
                                return;
                            }
                            if (mode === 'reset-password') {
                                if (!resetToken) {
                                    setError('Password reset link is missing or expired. Request a new reset email.');
                                    return;
                                }
                                await adminResetPassword(email, resetToken, password);
                                const next = new URLSearchParams(searchParams);
                                next.delete('mode');
                                next.delete('token');
                                next.delete('reason');
                                setSearchParams(next);
                                setNotice('Password reset successful. Sign in with your new password.');
                                setPassword('');
                                setTwoFactorCode('');
                                setResetToken('');
                                clearStoredResetToken();
                                setLoginChallengeToken(null);
                                setSessionStage('password');
                                return;
                            }

                            const result = await login(
                                email,
                                loginChallengeToken ? undefined : password,
                                twoFactorCode || undefined,
                                loginChallengeToken || undefined
                            );
                            if (result.status === 'authenticated') {
                                setSessionStage('authenticated');
                                setLockoutUntilMs(null);
                                setLoginChallengeToken(null);
                                navigate('/dashboard', { replace: true });
                                return;
                            }
                            if (result.status === 'two-factor-required') {
                                const nextChallengeToken = result.challengeToken ?? loginChallengeToken;
                                if (!nextChallengeToken) {
                                    setError('Sign-in challenge expired. Please enter your password again.');
                                    setPassword('');
                                    return;
                                }
                                setSessionStage('2fa_required');
                                setLoginChallengeToken(nextChallengeToken);
                                setPassword('');
                                setError(null);
                                setNotice(result.message ?? 'Password verified. Enter your authenticator code or a backup code to finish session sign-in.');
                                return;
                            }
                            if (result.status === 'locked-out') {
                                const nextLockoutUntilMs = typeof result.retryAfter === 'number' && Number.isFinite(result.retryAfter)
                                    ? Date.now() + result.retryAfter * 1000
                                    : null;
                                setSessionStage(nextLockoutUntilMs ? 'locked_out' : 'password');
                                setLoginChallengeToken(null);
                                setPassword('');
                                setTwoFactorCode('');
                                setError(null);
                                setLockoutUntilMs(nextLockoutUntilMs);
                                setNotice(result.message ?? 'Too many sign-in attempts. Retry after the lockout window ends.');
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
                                placeholder={mode === 'reset-password' ? 'Set a strong new password' : loginChallengeToken ? 'First factor complete' : 'Enter your password'}
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                autoComplete={mode === 'reset-password' ? 'new-password' : 'current-password'}
                                required={!loginChallengeToken}
                                disabled={mode === 'login' && Boolean(loginChallengeToken)}
                            />
                        </div>
                    ) : null}

                    {mode === 'login' ? (
                        <div className="admin-login-field">
                            <label className="admin-login-label" htmlFor="admin-2fa">
                                Two-factor code
                                {sessionStage !== '2fa_required' ? <span className="admin-login-optional">(optional)</span> : null}
                            </label>
                            <input
                                id="admin-2fa"
                                type="text"
                                placeholder={sessionStage === '2fa_required' ? 'Authenticator or backup code required' : '6-digit code or backup key'}
                                value={twoFactorCode}
                                onChange={(event) => setTwoFactorCode(event.target.value)}
                                autoComplete="one-time-code"
                                required={sessionStage === '2fa_required'}
                            />
                        </div>
                    ) : null}

                    {notice ? <div className="admin-alert success">{notice}</div> : null}
                    {error ? <div className="admin-alert error">{error}</div> : null}

                    <button className="admin-btn primary admin-login-submit" type="submit" disabled={submitting || sessionStage === 'locked_out'}>
                        {submitting
                            ? 'Submitting...'
                            : mode === 'forgot-password'
                                ? 'Send Reset Link'
                                : mode === 'reset-password'
                                    ? 'Reset Password'
                                    : sessionStage === '2fa_required'
                                        ? 'Verify Session'
                                        : sessionStage === 'locked_out'
                                            ? 'Retry Later'
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
                            <button
                                type="button"
                                className="admin-btn subtle"
                                onClick={() => {
                                    resetTwoFactorSetup();
                                    setPassword('');
                                    setTwoFactorCode('');
                                }}
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                ) : null}

                        <div className="ops-actions admin-login-footer-actions">
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
                            <a className="admin-btn small subtle" href="/admin-legacy">
                                Open Legacy Rollback
                            </a>
                        </div>
                    </div>

                    <aside className="admin-login-rail" aria-label="Admin login workflow">
                        <section className="admin-login-rail-card">
                            <p className="admin-login-rail-kicker">Access Model</p>
                            <h2 className="admin-login-rail-title">Session first. Step-up later.</h2>
                            <p className="admin-login-rail-copy">
                                The new admin console separates entry authentication from high-risk operations. You only see
                                step-up prompts once a live session is already active inside the workspace.
                            </p>
                            <ul className="admin-login-checklist">
                                {railItems.map((item) => (
                                    <li key={item.title} className="admin-login-check-item">
                                        <strong>{item.title}</strong>
                                        <span>{item.description}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>

                        <section className="admin-login-rail-card">
                            <p className="admin-login-rail-kicker">Workspace Groups</p>
                            <h2 className="admin-login-rail-title">Built for editorial operations.</h2>
                            <p className="admin-login-rail-copy">
                                Navigation is grouped around the daily publishing workflow instead of isolated tools.
                            </p>
                            <div className="admin-login-flow-list">
                                {workspaceGroups.map((group) => (
                                    <span key={group} className="admin-login-flow-chip">{group}</span>
                                ))}
                            </div>
                        </section>

                        <section className="admin-login-rail-card admin-login-support">
                            <p className="admin-login-rail-kicker">Need a Different Entry Point?</p>
                            <h2 className="admin-login-rail-title">Keep operators moving.</h2>
                            <p className="admin-login-rail-copy">
                                Public browsing and rollback access stay available without leaving the current deployment path.
                            </p>
                            <div className="ops-actions">
                                <a className="admin-btn subtle" href="/">
                                    View Public Site
                                </a>
                                <a className="admin-btn subtle" href="/admin-legacy">
                                    Open Legacy Admin
                                </a>
                            </div>
                        </section>
                    </aside>
                </div>
            </div>
        </div>
    );
}
