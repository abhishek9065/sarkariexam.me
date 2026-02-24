type OpsEmptyStateProps = {
    message?: string;
    title?: string;
    description?: string;
};

export function OpsEmptyState({ message, title, description }: OpsEmptyStateProps) {
    return (
        <div className="ops-empty" role="status">
            {title && <h3 className="ops-empty-title">{title}</h3>}
            {description && <p className="ops-empty-desc">{description}</p>}
            {message && <p>{message}</p>}
        </div>
    );
}
