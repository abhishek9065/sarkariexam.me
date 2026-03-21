import type { ReactNode } from 'react';

type WorkspaceHeaderProps = {
    eyebrow?: string;
    title: string;
    description?: string;
    meta?: ReactNode;
    actions?: ReactNode;
};

export function WorkspaceHeader({
    eyebrow,
    title,
    description,
    meta,
    actions,
}: WorkspaceHeaderProps) {
    return (
        <header className="workspace-header">
            <div className="workspace-header-copy">
                {eyebrow ? <span className="workspace-header-eyebrow">{eyebrow}</span> : null}
                <h1 className="workspace-header-title">{title}</h1>
                {description ? <p className="workspace-header-description">{description}</p> : null}
                {meta ? <div className="workspace-header-meta">{meta}</div> : null}
            </div>
            {actions ? <div className="workspace-header-actions">{actions}</div> : null}
        </header>
    );
}
