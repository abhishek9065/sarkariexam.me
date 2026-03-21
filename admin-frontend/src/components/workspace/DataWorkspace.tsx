import type { ReactNode } from 'react';

type DataWorkspaceProps = {
    children: ReactNode;
    aside?: ReactNode;
    className?: string;
};

export function DataWorkspace({ children, aside, className = '' }: DataWorkspaceProps) {
    return (
        <div className={`workspace-data-grid${className ? ` ${className}` : ''}${aside ? ' has-aside' : ''}`}>
            <div className="workspace-data-main">{children}</div>
            {aside ? <aside className="workspace-data-aside">{aside}</aside> : null}
        </div>
    );
}
