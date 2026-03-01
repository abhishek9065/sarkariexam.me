import { useCallback, useEffect, useRef, useState } from 'react';

export type StepUpCredentials = {
    password: string;
    twoFactorCode: string;
};

type StepUpModalProps = {
    open: boolean;
    onSubmit: (credentials: StepUpCredentials) => void;
    onCancel: () => void;
};

/**
 * Secure step-up verification modal.
 * Replaces the old `window.prompt()` flow that exposed the admin password
 * as plaintext in the browser prompt dialog.
 *
 * Uses `<input type="password">` so the password is masked, and an
 * optional 2FA code input for TOTP / backup code entry.
 */
export function StepUpModal({ open, onSubmit, onCancel }: StepUpModalProps) {
    const [password, setPassword] = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const passwordRef = useRef<HTMLInputElement>(null);

    // Auto-focus password field when modal opens
    useEffect(() => {
        if (open) {
            setPassword('');
            setTwoFactorCode('');
            // Slight delay to ensure the modal is painted before focusing
            const timer = setTimeout(() => passwordRef.current?.focus(), 80);
            return () => clearTimeout(timer);
        }
    }, [open]);

    // Lock body scroll
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    const handleSubmit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            if (!password.trim()) return;
            onSubmit({ password: password.trim(), twoFactorCode: twoFactorCode.trim() });
        },
        [password, twoFactorCode, onSubmit],
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onCancel();
            }
        },
        [onCancel],
    );

    if (!open) return null;

    return (
        <div
            className="admin-modal-overlay"
            onClick={onCancel}
            onKeyDown={handleKeyDown}
            role="dialog"
            aria-modal="true"
            aria-labelledby="step-up-title"
            aria-describedby="step-up-desc"
        >
            <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
                <div className="admin-modal-header">
                    <div>
                        <h3 id="step-up-title">Step-up verification</h3>
                        <p id="step-up-desc" className="admin-subtitle">
                            This action requires re-authentication. Enter your admin password to continue.
                        </p>
                    </div>
                </div>
                <form onSubmit={handleSubmit} autoComplete="off">
                    <div className="admin-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div className="form-group">
                            <label htmlFor="step-up-password">
                                Password <span className="field-required">*</span>
                            </label>
                            <input
                                ref={passwordRef}
                                id="step-up-password"
                                type="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your admin password"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="step-up-2fa">2FA code (optional)</label>
                            <input
                                id="step-up-2fa"
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                value={twoFactorCode}
                                onChange={(e) => setTwoFactorCode(e.target.value)}
                                placeholder="6-digit code or backup code"
                            />
                        </div>
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 8,
                            padding: '12px 20px 16px',
                        }}
                    >
                        <button
                            type="button"
                            className="admin-btn secondary"
                            onClick={onCancel}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="admin-btn primary"
                            disabled={!password.trim()}
                        >
                            Verify
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
