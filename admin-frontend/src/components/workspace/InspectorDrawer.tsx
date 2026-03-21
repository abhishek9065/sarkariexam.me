import type { ReactNode } from 'react';

type InspectorDrawerProps = {
    title: string;
    description?: string;
    children: ReactNode;
};

export function InspectorDrawer({ title, description, children }: InspectorDrawerProps) {
    return (
        <section className="workspace-inspector">
            <header className="workspace-inspector-header">
                <h2>{title}</h2>
                {description ? <p>{description}</p> : null}
            </header>
            <div className="workspace-inspector-body">{children}</div>
        </section>
    );
}
