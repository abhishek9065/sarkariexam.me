import { useMemo, useState } from 'react';

import { useAdminAuth } from '../app/useAdminAuth';
import { OpsBadge, OpsCard } from './ops';

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
        <OpsCard
            title={title}
            description={description}
            tone="muted"
            actions={hasValidStepUp ? <OpsBadge tone="success">Verified</OpsBadge> : <OpsBadge tone="warning">Required</OpsBadge>}
        >
            {hasValidStepUp ? (
                <div className="admin-stepup-state">
                    <span className="ops-inline-muted">Verified until {expiryLabel ?? 'active window'}.</span>
                    <button type="button" className="admin-btn" onClick={clearStepUp}>Clear Token</button>
                </div>
            ) : (
                <form
                    className="admin-stepup-grid"
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
                        placeholder="2FA or backup code"
                    />
                    <button type="submit" className="admin-btn primary" disabled={loading}>
                        {loading ? 'Verifying...' : 'Verify'}
                    </button>
                    {error ? <div className="ops-error ops-span-full">{error}</div> : null}
                </form>
            )}
        </OpsCard>
    );
}
