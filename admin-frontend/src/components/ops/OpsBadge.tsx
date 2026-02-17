type OpsBadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

type OpsBadgeProps = {
    tone?: OpsBadgeTone;
    children: React.ReactNode;
};

export function OpsBadge({ tone = 'neutral', children }: OpsBadgeProps) {
    return <span className={`ops-badge ${tone}`}>{children}</span>;
}
