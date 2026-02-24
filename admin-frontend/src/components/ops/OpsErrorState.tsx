type OpsErrorStateProps = {
    message: string;
    onRetry?: () => void;
};

export function OpsErrorState({ message, onRetry }: OpsErrorStateProps) {
    return (
        <div className="ops-error-state" role="alert">
            <div className="ops-error-state-icon">\u26A0</div>
            <div className="ops-error-state-body">
                <div className="ops-error-state-title">Something went wrong</div>
                <div className="ops-error-state-message">{message}</div>
            </div>
            {onRetry && (
                <button type="button" className="admin-btn subtle" onClick={onRetry}>
                    Retry
                </button>
            )}
        </div>
    );
}
