import type { ReactNode } from 'react';

type OpsEmptyStateProps = {
    message?: string;
    title?: string;
    description?: string;
    icon?: string;
    action?: ReactNode;
};

export function OpsEmptyState({ message, title, description, icon, action }: OpsEmptyStateProps) {
    return (
        <div className="ops-empty-state" role="status">
            {icon && <div className="ops-empty-state-icon">{icon}</div>}
            {title && <div className="ops-empty-state-title">{title}</div>}
            {description && <div className="ops-empty-state-description">{description}</div>}
            {message && !description && <p className="ops-empty-state-description">{message}</p>}
            {action && <div className="ops-empty-state-action">{action}</div>}
        </div>
    );
}
