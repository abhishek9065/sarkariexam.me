import type { MetricCategory } from '../../types';

interface KpiCardProps {
    label: string;
    value: string;
    sub?: string;
    delta?: string;
    deltaTone?: 'up' | 'down' | 'flat';
    tone?: MetricCategory;
    title?: string;
}

export function KpiCard({
    label,
    value,
    sub,
    delta,
    deltaTone = 'flat',
    tone = 'traffic',
    title,
}: KpiCardProps) {
    return (
        <div className={`kpi-card metric-${tone}`} title={title}>
            <div className="kpi-label">{label}</div>
            <div className="kpi-value">{value}</div>
            {sub && <div className="kpi-sub">{sub}</div>}
            {delta && <div className={`kpi-delta ${deltaTone}`}>{delta}</div>}
        </div>
    );
}

