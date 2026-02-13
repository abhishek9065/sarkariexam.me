import type { Announcement, DashboardWidgetPayload } from '../../types';
import { formatDate, formatNumber } from '../../utils/formatters';

interface ProfileWidgetsProps {
    isAuthenticated: boolean;
    loading?: boolean;
    widgets: DashboardWidgetPayload | null;
    fallbackItems?: Announcement[];
    onOpenTracker: () => void;
    onOpenRecommendations: () => void;
    onOpenSaved: () => void;
    onOpenCompare: () => void;
    onOpenItem?: (slug: string, type: string) => void;
}

export function ProfileWidgets({
    isAuthenticated,
    loading = false,
    widgets,
    fallbackItems = [],
    onOpenTracker,
    onOpenRecommendations,
    onOpenSaved,
    onOpenCompare,
    onOpenItem,
}: ProfileWidgetsProps) {
    if (loading) {
        return (
            <section className="sr-widget-grid" aria-label="Dashboard widgets">
                <article className="sr-widget-card"><p>Loading widgets...</p></article>
            </section>
        );
    }

    if (!isAuthenticated || !widgets) {
        return (
            <section className="sr-widget-grid" aria-label="Discovery widgets">
                <article className="sr-widget-card">
                    <h3>Trending Right Now</h3>
                    <p>Sign in for personalized widgets and tracker insights.</p>
                    <ul className="sr-widget-list">
                        {fallbackItems.slice(0, 6).map((item) => (
                            <li key={`fallback-${item.id}`}>
                                <button type="button" onClick={() => onOpenItem?.(item.slug, item.type)}>
                                    {item.title}
                                </button>
                            </li>
                        ))}
                    </ul>
                </article>
                <article className="sr-widget-card">
                    <h3>Power Tools</h3>
                    <p>Use compare mode and search to find best-fit jobs faster.</p>
                    <div className="sr-widget-actions">
                        <button type="button" onClick={onOpenCompare}>Open Compare</button>
                    </div>
                </article>
            </section>
        );
    }

    return (
        <section className="sr-widget-grid" aria-label="Personalized widgets">
            <article className="sr-widget-card">
                <h3>My Tracker</h3>
                <p>{formatNumber(widgets.trackedCounts.total)} total tracked updates</p>
                <div className="sr-widget-stat-row">
                    <span>Saved: {formatNumber(widgets.trackedCounts.saved)}</span>
                    <span>Applied: {formatNumber(widgets.trackedCounts.applied)}</span>
                    <span>Exam: {formatNumber(widgets.trackedCounts.exam)}</span>
                </div>
                <div className="sr-widget-actions">
                    <button type="button" onClick={onOpenTracker}>Open Tracker</button>
                </div>
            </article>

            <article className="sr-widget-card">
                <h3>Upcoming Deadlines</h3>
                {widgets.upcomingDeadlines.length === 0 ? (
                    <p>No tracked deadlines in next {widgets.windowDays} days.</p>
                ) : (
                    <ul className="sr-widget-list">
                        {widgets.upcomingDeadlines.map((item) => (
                            <li key={`deadline-${item.id || item.slug}`}>
                                <button type="button" onClick={() => onOpenItem?.(item.slug, item.type)}>
                                    {item.title}
                                    <small>{formatDate(item.deadline)} ({item.daysRemaining} days)</small>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </article>

            <article className="sr-widget-card">
                <h3>Recommendation Pulse</h3>
                <p>{formatNumber(widgets.recommendationCount)} profile-based matches</p>
                <p>{formatNumber(widgets.savedSearchMatches)} saved-search hits this window</p>
                <div className="sr-widget-actions">
                    <button type="button" onClick={onOpenRecommendations}>Open Recommendations</button>
                    <button type="button" onClick={onOpenSaved}>Open Saved Searches</button>
                    <button type="button" onClick={onOpenCompare}>Compare Jobs</button>
                </div>
            </article>
        </section>
    );
}

export default ProfileWidgets;
