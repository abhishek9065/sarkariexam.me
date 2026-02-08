import { useEffect, useState } from 'react';

type StepUpMode = 'totp' | 'backup';

interface AdminStepUpDialogProps {
    open: boolean;
    reason: string;
    loading?: boolean;
    error?: string;
    onClose: () => void;
    onSubmit: (input: { password: string; twoFactorCode: string }) => Promise<void>;
}

const normalizeBackupCode = (value: string) => value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
const formatBackupCodeInput = (value: string) => {
    const normalized = normalizeBackupCode(value).slice(0, 8);
    if (normalized.length <= 4) return normalized;
    return `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
};

export function AdminStepUpDialog({
    open,
    reason,
    loading = false,
    error,
    onClose,
    onSubmit,
}: AdminStepUpDialogProps) {
    const [password, setPassword] = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [mode, setMode] = useState<StepUpMode>('totp');

    useEffect(() => {
        if (!open) return;
        setPassword('');
        setTwoFactorCode('');
        setMode('totp');
    }, [open]);

    if (!open) return null;

    const isCodeValid = mode === 'totp'
        ? /^\d{6}$/.test(twoFactorCode.trim())
        : normalizeBackupCode(twoFactorCode).length >= 8;
    const canSubmit = password.trim().length > 0 && isCodeValid && !loading;

    return (
        <div className="admin-modal-overlay" onClick={loading ? undefined : onClose}>
            <div
                className="admin-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="step-up-title"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="admin-modal-header">
                    <h3 id="step-up-title">Security verification required</h3>
                    <button className="admin-btn ghost small" onClick={onClose} disabled={loading}>Close</button>
                </div>
                <div className="admin-modal-body">
                    <p className="admin-subtitle">{reason}</p>
                    <div className="form-group">
                        <label htmlFor="stepup-password">Password</label>
                        <input
                            id="stepup-password"
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="Enter your password"
                            autoComplete="current-password"
                        />
                    </div>
                    <div className="form-group">
                        <div className="inline-toggle-group">
                            <button
                                type="button"
                                className={`inline-toggle-btn ${mode === 'totp' ? 'active' : ''}`}
                                onClick={() => setMode('totp')}
                                disabled={loading}
                            >
                                Authenticator
                            </button>
                            <button
                                type="button"
                                className={`inline-toggle-btn ${mode === 'backup' ? 'active' : ''}`}
                                onClick={() => setMode('backup')}
                                disabled={loading}
                            >
                                Backup code
                            </button>
                        </div>
                        <label htmlFor="stepup-code">{mode === 'totp' ? 'Authenticator code' : 'Backup code'}</label>
                        <input
                            id="stepup-code"
                            type="text"
                            value={twoFactorCode}
                            onChange={(event) => {
                                const nextValue = event.target.value;
                                setTwoFactorCode(mode === 'backup' ? formatBackupCodeInput(nextValue) : nextValue);
                            }}
                            placeholder={mode === 'totp' ? '000000' : 'XXXX-XXXX'}
                            inputMode={mode === 'totp' ? 'numeric' : 'text'}
                            maxLength={mode === 'totp' ? 6 : 9}
                        />
                    </div>
                    {error && <div className="admin-error">{error}</div>}
                    <div className="backup-codes-actions">
                        <button className="admin-btn secondary" onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <button
                            className="admin-btn primary"
                            disabled={!canSubmit}
                            onClick={() => onSubmit({ password, twoFactorCode })}
                        >
                            {loading ? 'Verifying…' : 'Verify and continue'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminStepUpDialog;
