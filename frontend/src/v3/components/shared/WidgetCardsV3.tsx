import { Link } from 'react-router-dom';
import type { Announcement, DashboardWidgetPayload } from '../../../types';

interface WidgetCardsV3Props {
    widgets: DashboardWidgetPayload | null;
    signedIn: boolean;
    trending: Announcement[];
    onOpenTracker?: () => void;
    onOpenCompare?: () => void;
}

export function WidgetCardsV3({
    widgets,
    signedIn,
    trending,
    onOpenTracker,
    onOpenCompare,
}: WidgetCardsV3Props) {
    const fallbackTrending = trending.slice(0, 4);

    return (
        <section className="sr3-section sr3-widget-grid">
            <article className="sr3-surface sr3-widget-card">
                <h3 className="sr3-section-title">Tracker Pulse</h3>
                {!signedIn && <p className="sr3-section-subtitle">Sign in to track applied forms and exam stages.</p>}
                {signedIn && widgets && (
                    <>
                        <p className="sr3-widget-stat">{widgets.trackedCounts.total}</p>
                        <p className="sr3-section-subtitle">Active tracked applications</p>
                        <button type="button" className="sr3-btn secondary" onClick={onOpenTracker}>Open tracker</button>
                    </>
                )}
                {signedIn && !widgets && <p className="sr3-section-subtitle">Widget data not available right now.</p>}
            </article>

            <article className="sr3-surface sr3-widget-card">
                <h3 className="sr3-section-title">Upcoming Deadlines</h3>
                {signedIn && widgets && widgets.upcomingDeadlines.length > 0 && (
                    <ul className="sr3-widget-list">
                        {widgets.upcomingDeadlines.slice(0, 4).map((item) => (
                            <li key={item.id}>
                                <Link to={`/${item.type}/${item.slug}`} className="sr3-inline-link">{item.title}</Link>
                                <span>{item.daysRemaining} days left</span>
                            </li>
                        ))}
                    </ul>
                )}
                {(!signedIn || !widgets || widgets.upcomingDeadlines.length === 0) && (
                    <ul className="sr3-widget-list">
                        {fallbackTrending.map((item) => (
                            <li key={item.id || item.slug}>
                                <Link to={`/${item.type}/${item.slug}`} className="sr3-inline-link">{item.title}</Link>
                                <span>{item.organization || item.type}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </article>

            <article className="sr3-surface sr3-widget-card">
                <h3 className="sr3-section-title">Recommendations</h3>
                {signedIn && widgets && (
                    <>
                        <p className="sr3-widget-stat">{widgets.recommendationCount}</p>
                        <p className="sr3-section-subtitle">Matched opportunities for your profile</p>
                    </>
                )}
                {!signedIn && <p className="sr3-section-subtitle">Trending picks available for all users.</p>}
                <div className="sr3-meta-row">
                    <Link to="/profile?section=recommendations" className="sr3-inline-link">Open recommendations</Link>
                    {onOpenCompare && (
                        <button type="button" className="sr3-btn secondary" onClick={onOpenCompare}>Compare jobs</button>
                    )}
                </div>
            </article>
        </section>
    );
}

export default WidgetCardsV3;
