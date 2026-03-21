import type { ReactNode } from 'react';

type PermissionStateProps = {
    title: string;
    description: string;
    detail?: ReactNode;
};

export function PermissionState({ title, description, detail }: PermissionStateProps) {
    return (
        <section className="workspace-state-card danger">
            <span className="workspace-state-kicker">Access restricted</span>
            <h2>{title}</h2>
            <p>{description}</p>
            {detail ? <div className="workspace-state-detail">{detail}</div> : null}
        </section>
    );
}
