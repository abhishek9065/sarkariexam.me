import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: 'login' | 'register';
}

export function AuthModal({ isOpen, onClose, initialTab = 'login' }: Props) {
    const { login, register, error, clearError } = useAuth();
    const [tab, setTab] = useState<'login' | 'register'>(initialTab);
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setEmail('');
            setName('');
            setPassword('');
            setConfirm('');
            setLocalError(null);
            clearError();
            setTab(initialTab);
        }
    }, [isOpen, initialTab, clearError]);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLocalError(null);

        if (tab === 'register' && password !== confirm) {
            setLocalError('Passwords do not match');
            return;
        }
        if (tab === 'register' && password.length < 8) {
            setLocalError('Password must be at least 8 characters');
            return;
        }

        setSubmitting(true);
        try {
            if (tab === 'login') {
                await login(email, password);
            } else {
                await register(email, name, password);
            }
            onClose();
        } catch {
            /* error stored in context */
        } finally {
            setSubmitting(false);
        }
    };

    const displayError = localError || error;

    return (
        <div className="auth-overlay" onClick={onClose}>
            <div className="auth-modal card" onClick={(e) => e.stopPropagation()}>
                <button className="auth-close" onClick={onClose} aria-label="Close">✕</button>

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

                <form className="auth-form" onSubmit={handleSubmit}>
                    {displayError && (
                        <div className="auth-error">{displayError}</div>
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
                        />
                    </label>

                    {tab === 'register' && (
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
                    )}

                    <label className="auth-label">
                        Password
                        <input
                            type="password"
                            className="input"
                            required
                            minLength={8}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                            placeholder="••••••••"
                        />
                    </label>

                    {tab === 'register' && (
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
                    )}

                    <button
                        type="submit"
                        className="btn btn-accent btn-lg auth-submit"
                        disabled={submitting}
                    >
                        {submitting
                            ? (tab === 'login' ? 'Signing in…' : 'Creating account…')
                            : (tab === 'login' ? 'Sign In' : 'Create Account')
                        }
                    </button>
                </form>
            </div>
        </div>
    );
}
