import type { ReactNode } from 'react';

type FilterRailProps = {
    controls: ReactNode;
    actions?: ReactNode;
    compact?: boolean;
};

export function FilterRail({ controls, actions, compact = false }: FilterRailProps) {
    return (
        <section className={`workspace-filter-rail${compact ? ' compact' : ''}`}>
            <div className={`workspace-filter-controls${compact ? ' compact' : ''}`}>{controls}</div>
            {actions ? <div className="workspace-filter-actions">{actions}</div> : null}
        </section>
    );
}
