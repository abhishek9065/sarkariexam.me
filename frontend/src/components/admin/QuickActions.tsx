import { useMemo } from 'react';
import './QuickActions.css';

interface QuickAction {
    id: string;
    type: 'expiring' | 'pending' | 'stale' | 'low-views';
    title: string;
    subtitle: string;
    count: number;
    urgency: 'critical' | 'warning' | 'info';
    action: string;
    onClick?: () => void;
}

interface QuickActionsProps {
    expiringToday?: number;
    expiringThisWeek?: number;
    pendingReview?: number;
    staleDrafts?: number;
    lowViewsPosts?: number;
    onViewExpiring?: () => void;
    onViewPending?: () => void;
    onViewStale?: () => void;
    onViewLowViews?: () => void;
}

export function QuickActions({
    expiringToday = 0,
    expiringThisWeek = 0,
    pendingReview = 0,
    staleDrafts = 0,
    lowViewsPosts = 0,
    onViewExpiring,
    onViewPending,
    onViewStale,
    onViewLowViews,
}: QuickActionsProps) {
    const actions = useMemo(() => {
        const items: QuickAction[] = [];

        if (expiringToday > 0) {
            items.push({
                id: 'expiring-today',
                type: 'expiring',
                title: `${expiringToday} expiring today`,
                subtitle: 'Deadlines ending today',
                count: expiringToday,
                urgency: 'critical',
                action: 'View',
                onClick: onViewExpiring,
            });
        }

        if (expiringThisWeek > 0) {
            items.push({
                id: 'expiring-week',
                type: 'expiring',
                title: `${expiringThisWeek} expiring this week`,
                subtitle: 'Deadlines in next 7 days',
                count: expiringThisWeek,
                urgency: 'warning',
                action: 'View',
                onClick: onViewExpiring,
            });
        }

        if (pendingReview > 0) {
            items.push({
                id: 'pending-review',
                type: 'pending',
                title: `${pendingReview} pending review`,
                subtitle: 'Awaiting approval',
                count: pendingReview,
                urgency: pendingReview > 5 ? 'warning' : 'info',
                action: 'Review',
                onClick: onViewPending,
            });
        }

        if (staleDrafts > 0) {
            items.push({
                id: 'stale-drafts',
                type: 'stale',
                title: `${staleDrafts} stale drafts`,
                subtitle: 'Drafts older than 7 days',
                count: staleDrafts,
                urgency: 'info',
                action: 'View',
                onClick: onViewStale,
            });
        }

        if (lowViewsPosts > 0) {
            items.push({
                id: 'low-views',
                type: 'low-views',
                title: `${lowViewsPosts} low engagement`,
                subtitle: 'Posts with < 10 views',
                count: lowViewsPosts,
                urgency: 'info',
                action: 'Boost',
                onClick: onViewLowViews,
            });
        }

        return items;
    }, [expiringToday, expiringThisWeek, pendingReview, staleDrafts, lowViewsPosts, onViewExpiring, onViewPending, onViewStale, onViewLowViews]);

    if (actions.length === 0) {
        return (
            <div className="quick-actions-empty">
                <span className="quick-actions-icon">✅</span>
                <span>All clear! No urgent actions needed.</span>
            </div>
        );
    }

    return (
        <div className="quick-actions">
            <div className="quick-actions-header">
                <h3>⚡ Quick Actions</h3>
                <span className="quick-actions-count">{actions.length} items need attention</span>
            </div>
            <div className="quick-actions-grid">
                {actions.map((action) => (
                    <div
                        key={action.id}
                        className={`quick-action-card ${action.urgency}`}
                        onClick={action.onClick}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                action.onClick?.();
                            }
                        }}
                    >
                        <div className="quick-action-icon">
                            {action.type === 'expiring' && '⏰'}
                            {action.type === 'pending' && '📋'}
                            {action.type === 'stale' && '📝'}
                            {action.type === 'low-views' && '📉'}
                        </div>
                        <div className="quick-action-content">
                            <div className="quick-action-title">{action.title}</div>
                            <div className="quick-action-subtitle">{action.subtitle}</div>
                        </div>
                        <button className={`quick-action-btn ${action.urgency}`}>
                            {action.action}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default QuickActions;
