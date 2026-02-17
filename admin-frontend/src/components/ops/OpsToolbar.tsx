import type { ReactNode } from 'react';

type OpsToolbarProps = {
    controls: ReactNode;
    actions?: ReactNode;
    compact?: boolean;
};

export function OpsToolbar({ controls, actions, compact = false }: OpsToolbarProps) {
    return (
        <div className="ops-toolbar">
            <div className={`ops-toolbar-grid${compact ? ' two' : ''}`}>{controls}</div>
            {actions ? <div className="ops-toolbar-actions">{actions}</div> : null}
        </div>
    );
}
