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

function formatDate(value?: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
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
                    <p>{subtitle}</p>
                </div>
                <span className="home-section-panel-count">{items.length}</span>
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
                            <div className="home-section-panel-meta">
                                <span>{item.organization || 'Govt update'}</span>
                                {item.deadline ? <span>Deadline: {formatDate(item.deadline)}</span> : null}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <Link to={viewMoreTo} className="home-dense-box-view-more home-section-panel-view-more">
                View More
            </Link>
        </section>
    );
}
