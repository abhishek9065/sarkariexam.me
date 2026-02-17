import type { ReactNode } from 'react';

type OpsSectionProps = {
    kicker?: string;
    title: string;
    summary?: string;
    pills?: ReactNode;
    children: ReactNode;
};

export function OpsSection({ kicker, title, summary, pills, children }: OpsSectionProps) {
    return (
        <section className="ops-stack">
            <header className="admin-context">
                <div className="admin-context-main">
                    {kicker ? <span className="admin-context-kicker">{kicker}</span> : null}
                    <h1 className="admin-context-title">{title}</h1>
                    {summary ? <p className="admin-context-summary">{summary}</p> : null}
                </div>
                {pills ? <div className="admin-context-pills">{pills}</div> : null}
            </header>
            {children}
        </section>
    );
}
