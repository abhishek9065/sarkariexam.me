import { Link } from 'react-router-dom';

import type { AnnouncementCard } from '../../types';
import { buildAnnouncementDetailPath, type SourceTag } from '../../utils/trackingLinks';

interface HomeSectionPanelProps {
    title: string;
    subtitle: string;
    viewMoreTo: string;
    items: AnnouncementCard[];
    sourceTag: SourceTag;
    testId: string;
    className?: string;
    maxItems?: number;
    loading?: boolean;
}

/** Check if an item was posted within the last 3 days */
function isRecentItem(postedAt?: string | null): boolean {
    if (!postedAt) return false;
    const posted = new Date(postedAt).getTime();
    if (Number.isNaN(posted)) return false;
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    return Date.now() - posted < threeDaysMs;
}

export function HomeSectionPanel({
    title,
    subtitle,
    viewMoreTo,
    items,
    sourceTag,
    testId,
    className,
    maxItems = 8,
    loading = false,
}: HomeSectionPanelProps) {
    const visibleItems = items.slice(0, maxItems);

    return (
        <section
            className={`home-section-panel home-dense-box${className ? ` ${className}` : ''}`}
            data-testid={testId}
        >
            <header className="home-dense-box-header home-section-panel-header">
                <div>
                    <h2>{title}</h2>
                    {subtitle ? <p>{subtitle}</p> : null}
                </div>
                <Link to={viewMoreTo} className="home-section-panel-header-view-more">
                    View More
                </Link>
            </header>

            {loading ? (
                <ul className="home-dense-box-list home-section-panel-list home-section-panel-list-loading" aria-hidden="true">
                    {Array.from({ length: Math.min(6, maxItems) }).map((_, index) => (
                        <li key={index}>
                            <span className="home-section-panel-skeleton home-section-panel-skeleton-title" />
                            <span className="home-section-panel-skeleton home-section-panel-skeleton-meta" />
                        </li>
                    ))}
                </ul>
            ) : visibleItems.length === 0 ? (
                <p className="home-dense-box-empty home-section-panel-empty">No updates yet.</p>
            ) : (
                <ul className="home-dense-box-list home-section-panel-list">
                    {visibleItems.map((item) => (
                        <li key={item.id}>
                            <Link
                                to={buildAnnouncementDetailPath(item.type, item.slug, sourceTag)}
                                className="home-dense-box-link home-section-panel-link"
                            >
                                {item.title}
                            </Link>
                            {isRecentItem(item.postedAt) && (
                                <span className="home-section-panel-badge home-section-panel-badge-new">New</span>
                            )}
                            <div className="home-section-panel-meta">
                                <span>{item.organization || 'Govt update'}</span>
                                {item.deadline ? <span>Deadline: {formatDate(item.deadline)}</span> : null}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <Link to={viewMoreTo} className="home-dense-box-view-more home-section-panel-view-more">
                View More →
            </Link>
        </section>
    );
}

function formatDate(value?: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

