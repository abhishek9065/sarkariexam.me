import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '../context/useAuth';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: 'login' | 'register';
}

export function AuthModal({ isOpen, onClose, initialTab = 'login' }: Props) {
    const { login, register, error, clearError, twoFactorChallenge, clearTwoFactorChallenge } = useAuth();
    const [tab, setTab] = useState<'login' | 'register'>(initialTab);
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    /* When the 2FA challenge is set, auto-transition to 2FA view */
    const is2FAStep = !!twoFactorChallenge;

    useEffect(() => {
        if (isOpen) {
            setEmail('');
            setName('');
            setPassword('');
            setConfirm('');
            setTwoFactorCode('');
            setLocalError(null);
            clearError();
            clearTwoFactorChallenge();
            setTab(initialTab);
        }
    }, [isOpen, initialTab, clearError, clearTwoFactorChallenge]);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleLoginSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLocalError(null);
        setSubmitting(true);
        try {
            const result = await login(email, password);
            if (result === 'success') {
                onClose();
            }
            /* If 'two_factor_required', component will re-render to show 2FA step */
        } catch {
            /* error is stored in context */
        } finally {
            setSubmitting(false);
        }
    };

    const handle2FASubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLocalError(null);

        if (!twoFactorCode.trim()) {
            setLocalError('Please enter your authentication code');
            return;
        }

        setSubmitting(true);
        try {
            await login(twoFactorChallenge!.email, twoFactorChallenge!.password, twoFactorCode.trim());
            onClose();
        } catch {
            /* error is stored in context */
        } finally {
            setSubmitting(false);
        }
    };

    const handleRegisterSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLocalError(null);

        if (password !== confirm) {
            setLocalError('Passwords do not match');
            return;
        }
        if (password.length < 8) {
            setLocalError('Password must be at least 8 characters');
            return;
        }

        setSubmitting(true);
        try {
            await register(email, name, password);
            onClose();
        } catch {
            /* error is stored in context */
        } finally {
            setSubmitting(false);
        }
    };

    const displayError = localError || error;

    return (
        <div className="auth-overlay" role="dialog" aria-modal="true" aria-label="Authentication" onClick={onClose}>
            <div className="auth-modal card" onClick={(e) => e.stopPropagation()}>
                <button className="auth-close" onClick={onClose} aria-label="Close">✕</button>

                {/* ── 2FA Step ── */}
                {is2FAStep ? (
                    <>
                        <div className="auth-2fa-header">
                            <span className="auth-2fa-icon">🔐</span>
                            <h3>Two-Factor Authentication</h3>
                            <p className="text-muted" style={{ fontSize: 'var(--font-sm)', marginTop: 4 }}>
                                Enter the 6-digit code from your authenticator app, or a backup code.
                            </p>
                        </div>

                        <form className="auth-form" onSubmit={handle2FASubmit}>
                            {displayError && (
                                <div id="auth-error-2fa" className="auth-error" aria-live="assertive">{displayError}</div>
                            )}

                            <label className="auth-label">
                                Authentication Code
                                <input
                                    type="text"
                                    className="input auth-2fa-input"
                                    required
                                    autoFocus
                                    maxLength={20}
                                    placeholder="123456"
                                    value={twoFactorCode}
                                    onChange={(e) => setTwoFactorCode(e.target.value)}
                                    autoComplete="one-time-code"
                                    inputMode="numeric"
                                    pattern="[0-9a-zA-Z\-]*"
                                    aria-describedby={displayError ? "auth-error-2fa" : undefined}
                                />
                            </label>

                            <button
                                type="submit"
                                className="btn btn-accent btn-lg auth-submit"
                                disabled={submitting}
                            >
                                {submitting ? 'Verifying…' : 'Verify'}
                            </button>

                            <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                style={{ alignSelf: 'center' }}
                                onClick={() => { clearTwoFactorChallenge(); clearError(); }}
                            >
                                ← Back to Sign In
                            </button>
                        </form>
                    </>
                ) : (
                    <>
                        {/* ── Normal Login/Register Tabs ── */}
                        <div className="auth-tabs">
                            <button
                                className={`auth-tab${tab === 'login' ? ' active' : ''}`}
                                onClick={() => { setTab('login'); setLocalError(null); clearError(); }}
                            >
                                Sign In
                            </button>
                            <button
                                className={`auth-tab${tab === 'register' ? ' active' : ''}`}
                                onClick={() => { setTab('register'); setLocalError(null); clearError(); }}
                            >
                                Register
                            </button>
                        </div>

                        {tab === 'login' ? (
                            <form className="auth-form" onSubmit={handleLoginSubmit}>
                                {displayError && (
                                    <div id="auth-error-login" className="auth-error" aria-live="assertive">{displayError}</div>
                                )}

                                <label className="auth-label">
                                    Email
                                    <input
                                        type="email"
                                        className="input"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        autoComplete="email"
                                        placeholder="you@example.com"
                                        aria-describedby={displayError ? "auth-error-login" : undefined}
                                    />
                                </label>

                                <label className="auth-label">
                                    Password
                                    <input
                                        type="password"
                                        className="input"
                                        required
                                        minLength={8}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoComplete="current-password"
                                        placeholder="••••••••"
                                    />
                                </label>

                                <button
                                    type="submit"
                                    className="btn btn-accent btn-lg auth-submit"
                                    disabled={submitting}
                                >
                                    {submitting ? 'Signing in…' : 'Sign In'}
                                </button>
                            </form>
                        ) : (
                            <form className="auth-form" onSubmit={handleRegisterSubmit}>
                                {displayError && (
                                    <div id="auth-error-register" className="auth-error" aria-live="assertive">{displayError}</div>
                                )}

                                <label className="auth-label">
                                    Email
                                    <input
                                        type="email"
                                        className="input"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        autoComplete="email"
                                        placeholder="you@example.com"
                                        aria-describedby={displayError ? "auth-error-register" : undefined}
                                    />
                                </label>

                                <label className="auth-label">
                                    Full Name
                                    <input
                                        type="text"
                                        className="input"
                                        required
                                        minLength={2}
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        autoComplete="name"
                                        placeholder="John Doe"
                                    />
                                </label>

                                <label className="auth-label">
                                    Password
                                    <input
                                        type="password"
                                        className="input"
                                        required
                                        minLength={8}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoComplete="new-password"
                                        placeholder="••••••••"
                                    />
                                </label>

                                <label className="auth-label">
                                    Confirm Password
                                    <input
                                        type="password"
                                        className="input"
                                        required
                                        minLength={8}
                                        value={confirm}
                                        onChange={(e) => setConfirm(e.target.value)}
                                        autoComplete="new-password"
                                        placeholder="••••••••"
                                    />
                                </label>

                                <button
                                    type="submit"
                                    className="btn btn-accent btn-lg auth-submit"
                                    disabled={submitting}
                                >
                                    {submitting ? 'Creating account…' : 'Create Account'}
                                </button>
                            </form>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
