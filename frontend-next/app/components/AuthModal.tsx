'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '@/app/lib/useAuth';
import { useLanguage } from '@/app/lib/useLanguage';
import { copyFor } from '@/app/lib/ui';
import { Icon } from '@/app/components/Icon';
import styles from './AuthModal.module.css';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: 'login' | 'register';
}

export function AuthModal({ isOpen, onClose, initialTab = 'login' }: Props) {
    const { language } = useLanguage();
    const { login, register, error, clearError, twoFactorChallenge, clearTwoFactorChallenge } = useAuth();
    const [tab, setTab] = useState<'login' | 'register'>(initialTab);
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const is2FA = Boolean(twoFactorChallenge);
    const displayError = localError || error;

    useEffect(() => {
        if (!isOpen) return;
        setTab(initialTab);
        setEmail('');
        setName('');
        setPassword('');
        setConfirm('');
        setTwoFactorCode('');
        setLocalError(null);
        clearError();
        clearTwoFactorChallenge();
    }, [clearError, clearTwoFactorChallenge, initialTab, isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const onKeydown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKeydown);
        return () => document.removeEventListener('keydown', onKeydown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleLogin = async (event: FormEvent) => {
        event.preventDefault();
        setLocalError(null);
        setSubmitting(true);
        try {
            const result = await login(email, password);
            if (result === 'success') onClose();
            if (result === 'two_factor_required') {
                setPassword('');
                setTwoFactorCode('');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleRegister = async (event: FormEvent) => {
        event.preventDefault();
        setLocalError(null);
        if (password !== confirm) {
            setLocalError(copyFor(language, 'Passwords do not match.', 'पासवर्ड मैच नहीं कर रहे हैं।'));
            return;
        }
        if (password.length < 8) {
            setLocalError(copyFor(language, 'Password must be at least 8 characters.', 'पासवर्ड कम से कम 8 अक्षर का होना चाहिए।'));
            return;
        }
        setSubmitting(true);
        try {
            await register(email, name, password);
            onClose();
        } finally {
            setSubmitting(false);
        }
    };

    const handle2FA = async (event: FormEvent) => {
        event.preventDefault();
        setLocalError(null);
        if (!twoFactorCode.trim() || !twoFactorChallenge) {
            setLocalError(copyFor(language, 'Enter your authentication code.', 'अपना ऑथेंटिकेशन कोड दर्ज करें।'));
            return;
        }
        setSubmitting(true);
        try {
            await login(twoFactorChallenge.email, undefined, twoFactorCode.trim(), twoFactorChallenge.challengeToken);
            onClose();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label="Authentication" onClick={onClose}>
            <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
                <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close auth modal">
                    <Icon name="Close" />
                </button>

                <div className={styles.header}>
                    <span className={styles.badge}>{copyFor(language, 'Secure account access', 'सिक्योर अकाउंट एक्सेस')}</span>
                    <h2>{copyFor(language, 'Track your exams with confidence', 'अपने एग्जाम्स को भरोसे के साथ ट्रैक करें')}</h2>
                    <p>{copyFor(language, 'Bookmarks, saved searches, notifications, and personal tracking all live here.', 'बुकमार्क्स, सेव्ड सर्च, नोटिफिकेशन और पर्सनल ट्रैकिंग यहीं से मिलती है।')}</p>
                </div>

                {is2FA ? (
                    <form className={styles.form} onSubmit={handle2FA}>
                        <label className={styles.field}>
                            <span>{copyFor(language, 'Authentication code', 'ऑथेंटिकेशन कोड')}</span>
                            <input
                                type="text"
                                value={twoFactorCode}
                                onChange={(event) => setTwoFactorCode(event.target.value)}
                                autoFocus
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                placeholder="123456"
                            />
                        </label>
                        {displayError && <div className={styles.error}>{displayError}</div>}
                        <button type="submit" className={styles.primaryButton} disabled={submitting}>
                            {submitting ? copyFor(language, 'Verifying…', 'वेरिफाई हो रहा है…') : copyFor(language, 'Verify code', 'कोड वेरिफाई करें')}
                        </button>
                        <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() => {
                                clearTwoFactorChallenge();
                                clearError();
                            }}
                        >
                            {copyFor(language, 'Back to sign in', 'साइन इन पर वापस जाएं')}
                        </button>
                    </form>
                ) : (
                    <>
                        <div className={styles.tabs} role="tablist" aria-label="Authentication tabs">
                            <button type="button" className={`${styles.tab}${tab === 'login' ? ` ${styles.tabActive}` : ''}`} onClick={() => { setTab('login'); setLocalError(null); clearError(); }}>
                                {copyFor(language, 'Sign in', 'साइन इन')}
                            </button>
                            <button type="button" className={`${styles.tab}${tab === 'register' ? ` ${styles.tabActive}` : ''}`} onClick={() => { setTab('register'); setLocalError(null); clearError(); }}>
                                {copyFor(language, 'Register', 'रजिस्टर')}
                            </button>
                        </div>

                        {tab === 'login' ? (
                            <form className={styles.form} onSubmit={handleLogin}>
                                <label className={styles.field}>
                                    <span>{copyFor(language, 'Email address', 'ईमेल एड्रेस')}</span>
                                    <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
                                </label>
                                <label className={styles.field}>
                                    <span>{copyFor(language, 'Password', 'पासवर्ड')}</span>
                                    <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" required minLength={8} />
                                </label>
                                {displayError && <div className={styles.error}>{displayError}</div>}
                                <button type="submit" className={styles.primaryButton} disabled={submitting}>
                                    {submitting ? copyFor(language, 'Signing in…', 'साइन इन हो रहा है…') : copyFor(language, 'Sign in', 'साइन इन')}
                                </button>
                            </form>
                        ) : (
                            <form className={styles.form} onSubmit={handleRegister}>
                                <label className={styles.field}>
                                    <span>{copyFor(language, 'Email address', 'ईमेल एड्रेस')}</span>
                                    <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
                                </label>
                                <label className={styles.field}>
                                    <span>{copyFor(language, 'Full name', 'पूरा नाम')}</span>
                                    <input type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder={copyFor(language, 'Aspirant name', 'अभ्यर्थी का नाम')} required minLength={2} />
                                </label>
                                <label className={styles.field}>
                                    <span>{copyFor(language, 'Password', 'पासवर्ड')}</span>
                                    <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" required minLength={8} />
                                </label>
                                <label className={styles.field}>
                                    <span>{copyFor(language, 'Confirm password', 'पासवर्ड कन्फर्म करें')}</span>
                                    <input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="••••••••" required minLength={8} />
                                </label>
                                {displayError && <div className={styles.error}>{displayError}</div>}
                                <button type="submit" className={styles.primaryButton} disabled={submitting}>
                                    {submitting ? copyFor(language, 'Creating account…', 'अकाउंट बन रहा है…') : copyFor(language, 'Create account', 'अकाउंट बनाएं')}
                                </button>
                            </form>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
