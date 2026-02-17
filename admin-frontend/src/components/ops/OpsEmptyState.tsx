type OpsEmptyStateProps = {
    message: string;
};

export function OpsEmptyState({ message }: OpsEmptyStateProps) {
    return <div className="ops-empty" role="status">{message}</div>;
}
