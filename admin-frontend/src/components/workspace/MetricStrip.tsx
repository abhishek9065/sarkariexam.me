import type { ReactNode } from 'react';

export type MetricStripItem = {
    key: string;
    label: string;
    value: ReactNode;
    hint?: string;
    tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
};

type MetricStripProps = {
    items: MetricStripItem[];
};

export function MetricStrip({ items }: MetricStripProps) {
    return (
        <div className="workspace-metric-strip">
            {items.map((item) => (
                <div key={item.key} className={`workspace-metric-card${item.tone ? ` ${item.tone}` : ''}`}>
                    <span className="workspace-metric-label">{item.label}</span>
                    <strong className="workspace-metric-value">{item.value}</strong>
                    {item.hint ? <span className="workspace-metric-hint">{item.hint}</span> : null}
                </div>
            ))}
        </div>
    );
}
