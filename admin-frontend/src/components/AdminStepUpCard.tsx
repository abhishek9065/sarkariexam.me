import { useMemo, useState } from 'react';

import { useAdminAuth } from '../app/useAdminAuth';

type AdminStepUpCardProps = {
    title?: string;
    description?: string;
};

export function AdminStepUpCard({
    title = 'Step-up Verification',
    description = 'Required for high-risk actions like publish, delete, and bulk execution.',
}: AdminStepUpCardProps) {
    const { hasValidStepUp, stepUpExpiresAt, issueStepUp, clearStepUp } = useAdminAuth();
    const [password, setPassword] = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const expiryLabel = useMemo(() => {
        if (!stepUpExpiresAt || !hasValidStepUp) return null;
        const parsed = new Date(stepUpExpiresAt);
        if (Number.isNaN(parsed.getTime())) return null;
        return parsed.toLocaleString();
    }, [stepUpExpiresAt, hasValidStepUp]);

    return (
        <div className="admin-card" style={{ background: '#f8fbfd' }}>
            <h3 style={{ marginTop: 0, marginBottom: 6 }}>{title}</h3>
            <p className="admin-muted" style={{ marginTop: 0 }}>{description}</p>

            {hasValidStepUp ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="admin-muted">Verified until {expiryLabel ?? 'active window'}.</span>
                    <button type="button" className="admin-btn" onClick={clearStepUp}>Clear Token</button>
                </div>
            ) : (
                <form
                    style={{ display: 'grid', gap: 8, gridTemplateColumns: '2fr 1fr auto', alignItems: 'center' }}
                    onSubmit={async (event) => {
                        event.preventDefault();
                        setError(null);
                        setLoading(true);
                        try {
                            await issueStepUp(password, twoFactorCode || undefined);
                            setPassword('');
                            setTwoFactorCode('');
                        } catch (issueError) {
                            setError(issueError instanceof Error ? issueError.message : 'Step-up verification failed');
                        } finally {
                            setLoading(false);
                        }
                    }}
                >
                    <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Admin password"
                        required
                    />
                    <input
                        type="text"
                        value={twoFactorCode}
                        onChange={(event) => setTwoFactorCode(event.target.value)}
                        placeholder="2FA / backup code"
                    />
                    <button type="submit" className="admin-btn primary" disabled={loading}>
                        {loading ? 'Verifying...' : 'Verify'}
                    </button>
                    {error ? <div style={{ gridColumn: '1 / -1', color: '#b91c1c' }}>{error}</div> : null}
                </form>
            )}
        </div>
    );
}
