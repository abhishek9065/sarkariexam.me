import type { ReactNode } from 'react';

type OpsToolbarProps = {
    controls: ReactNode;
    actions?: ReactNode;
    compact?: boolean;
};

export function OpsToolbar({ controls, actions, compact = false }: OpsToolbarProps) {
    return (
        <div className={`ops-toolbar workspace-filter-rail${compact ? ' compact' : ''}`}>
            <div className={`ops-toolbar-grid workspace-filter-controls${compact ? ' two compact' : ''}`}>{controls}</div>
            {actions ? <div className="ops-toolbar-actions workspace-filter-actions">{actions}</div> : null}
        </div>
    );
}
