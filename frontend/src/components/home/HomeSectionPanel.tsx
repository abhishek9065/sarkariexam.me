import { Link } from 'react-router-dom';
import type { AnnouncementCard } from '../../types';
import { buildAnnouncementDetailPath, type SourceTag } from '../../utils/trackingLinks';

interface HomeSectionPanelProps {
    title: string;
    icon?: string;
    viewMoreTo: string;
    items: AnnouncementCard[];
    sourceTag: SourceTag;
    testId: string;
    cardClass?: string;
    maxItems?: number;
    loading?: boolean;
}

/** Check if posted within last 3 days */
function isRecent(postedAt?: string | null): boolean {
    if (!postedAt) return false;
    const d = new Date(postedAt).getTime();
    return !Number.isNaN(d) && Date.now() - d < 3 * 24 * 60 * 60 * 1000;
}

/** Relative time display (e.g. "2h ago", "1d ago") */
function timeAgo(postedAt?: string | null): string | null {
    if (!postedAt) return null;
    const d = new Date(postedAt).getTime();
    if (Number.isNaN(d)) return null;
    const diff = Date.now() - d;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return null; // older than a week, don't show
}

export function HomeSectionPanel({
    title,
    icon,
    viewMoreTo,
    items,
    sourceTag,
    testId,
    cardClass,
    maxItems = 8,
    loading = false,
}: HomeSectionPanelProps) {
    const visibleItems = items.slice(0, maxItems);

    return (
        <section
            className={`section-card${cardClass ? ` ${cardClass}` : ''}`}
            data-testid={testId}
        >
            {/* Header */}
            <header className="section-card-header home-dense-box-header">
                <div className="section-card-title-group">
                    {icon && <span className="section-card-icon">{icon}</span>}
                    <h2 className="section-card-title">{title}</h2>
                </div>
                <span className="section-card-count">{items.length}</span>
            </header>

            {/* List */}
            {loading ? (
                <ul className="section-card-list section-card-skeleton" aria-hidden="true">
                    {Array.from({ length: Math.min(5, maxItems) }).map((_, i) => (
                        <li key={i}>
                            <span className="section-card-skeleton-bar skeleton-title" />
                            <span className="section-card-skeleton-bar skeleton-sub" />
                        </li>
                    ))}
                </ul>
            ) : visibleItems.length === 0 ? (
                <div style={{ padding: '16px 22px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No updates yet.
                </div>
            ) : (
                <ul className="section-card-list">
                    {visibleItems.map((item) => {
                        const ago = timeAgo(item.postedAt);
                        return (
                            <li key={item.id}>
                                <Link
                                    className="home-dense-box-link"
                                    to={buildAnnouncementDetailPath(item.type, item.slug, sourceTag)}
                                >
                                    {isRecent(item.postedAt) && <span className="section-link-new" />}
                                    {item.title}
                                    {ago && <span className="section-link-time">{ago}</span>}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}

            {/* Footer */}
            <div className="section-card-footer">
                <Link to={viewMoreTo}>
                    View More →
                </Link>
            </div>
        </section>
    );
}
