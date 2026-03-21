import type { ReactNode } from 'react';

import { DataWorkspace } from './DataWorkspace';
import { FilterRail } from './FilterRail';
import { MetricStrip, type MetricStripItem } from './MetricStrip';
import { WorkspaceHeader } from './WorkspaceHeader';

type ModuleScaffoldProps = {
    eyebrow?: string;
    title: string;
    description?: string;
    meta?: ReactNode;
    headerActions?: ReactNode;
    metrics?: MetricStripItem[];
    filters?: {
        controls: ReactNode;
        actions?: ReactNode;
        compact?: boolean;
    };
    inspector?: ReactNode;
    children: ReactNode;
    className?: string;
};

export function ModuleScaffold({
    eyebrow,
    title,
    description,
    meta,
    headerActions,
    metrics,
    filters,
    inspector,
    children,
    className = '',
}: ModuleScaffoldProps) {
    return (
        <section className={`module-scaffold${className ? ` ${className}` : ''}`}>
            <WorkspaceHeader
                eyebrow={eyebrow}
                title={title}
                description={description}
                meta={meta}
                actions={headerActions}
            />
            {metrics?.length ? <MetricStrip items={metrics} /> : null}
            {filters ? (
                <FilterRail
                    controls={filters.controls}
                    actions={filters.actions}
                    compact={filters.compact}
                />
            ) : null}
            <DataWorkspace aside={inspector}>{children}</DataWorkspace>
        </section>
    );
}
