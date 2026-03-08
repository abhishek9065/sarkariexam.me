type OpsErrorStateProps = {
    message: string;
    title?: string;
    onRetry?: () => void;
    retryLabel?: string;
    allowReload?: boolean;
};

const deriveErrorTitle = (message: string): string => {
    const normalized = message.trim().toLowerCase();
    if (!normalized) return 'Request failed';
    if (normalized.includes('not found')) return 'Resource not found';
    if (
        normalized.includes('access denied')
        || normalized.includes('insufficient permissions')
        || normalized.includes('not authorized')
        || normalized.includes('unauthorized')
        || normalized.includes('forbidden')
        || normalized.includes('admin access required')
    ) {
        return 'Access denied';
    }
    if (normalized.includes('step-up')) return 'Step-up required';
    if (normalized.includes('failed to load') || normalized.includes('unable to load')) return 'Unable to load data';
    if (normalized.includes('network') || normalized.includes('fetch')) return 'Connection issue';
    return 'Request failed';
};

export function OpsErrorState({ message, title, onRetry, retryLabel, allowReload = true }: OpsErrorStateProps) {
    const actionLabel = retryLabel ?? (onRetry ? 'Retry' : 'Reload page');
    const handleRetry = () => {
        if (onRetry) {
            onRetry();
            return;
        }
        if (allowReload && typeof window !== 'undefined') {
            window.location.reload();
        }
    };

    return (
        <div className="ops-error-state" role="alert">
            <div className="ops-error-state-icon">&#x26A0;</div>
            <div className="ops-error-state-body">
                <div className="ops-error-state-title">{title || deriveErrorTitle(message)}</div>
                <div className="ops-error-state-message">{message}</div>
            </div>
            {(onRetry || allowReload) && (
                <button type="button" className="admin-btn subtle" onClick={handleRetry}>
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
