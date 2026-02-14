import { Link } from 'react-router-dom';
import type { AnnouncementCard } from '../../types';
import { buildAnnouncementDetailPath, type SourceTag } from '../../utils/trackingLinks';

interface HomeDenseBoxProps {
    title: string;
    viewMoreTo: string;
    items: AnnouncementCard[];
    sourceTag: SourceTag;
    testId: string;
    emptyLabel?: string;
    className?: string;
}

export function HomeDenseBox({
    title,
    viewMoreTo,
    items,
    sourceTag,
    testId,
    emptyLabel = 'No updates yet.',
    className,
}: HomeDenseBoxProps) {
    return (
        <section className={`home-dense-box card${className ? ` ${className}` : ''}`} data-testid={testId}>
            <header className="home-dense-box-header">
                <h2>{title}</h2>
            </header>

            {items.length === 0 ? (
                <p className="home-dense-box-empty">{emptyLabel}</p>
            ) : (
                <ul className="home-dense-box-list">
                    {items.map((item) => (
                        <li key={item.id}>
                            <Link
                                to={buildAnnouncementDetailPath(item.type, item.slug, sourceTag)}
                                className="home-dense-box-link"
                            >
                                {item.title}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}

            <Link to={viewMoreTo} className="home-dense-box-view-more">
                View More
            </Link>
        </section>
    );
}
