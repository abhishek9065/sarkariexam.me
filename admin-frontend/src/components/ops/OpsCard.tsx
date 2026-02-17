import type { ReactNode } from 'react';

type OpsCardProps = {
    title?: string;
    description?: string;
    actions?: ReactNode;
    children?: ReactNode;
    className?: string;
    tone?: 'default' | 'muted' | 'danger';
};

export function OpsCard({
    title,
    description,
    actions,
    children,
    className = '',
    tone = 'default',
}: OpsCardProps) {
    const toneClass = tone === 'default' ? '' : ` ${tone}`;
    return (
        <section className={`ops-card${toneClass}${className ? ` ${className}` : ''}`}>
            {title || description || actions ? (
                <header className="ops-card-header">
                    <div>
                        {title ? <h2 className="ops-card-title">{title}</h2> : null}
                        {description ? <p className="ops-card-description">{description}</p> : null}
                    </div>
                    {actions ? <div className="ops-actions">{actions}</div> : null}
                </header>
            ) : null}
            {children}
        </section>
    );
}
