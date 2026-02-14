import { Link } from 'react-router-dom';
import type { AnnouncementCard } from '../../types';
import { buildAnnouncementDetailPath, type SourceTag } from '../../utils/trackingLinks';

interface Props {
    title: string;
    viewMoreTo: string;
    items: AnnouncementCard[];
    sourceTag: SourceTag;
    emptyLabel?: string;
}

export function HomeColumnSection({ title, viewMoreTo, items, sourceTag, emptyLabel = 'No updates yet.' }: Props) {
    return (
        <section className="home-column card">
            <header className="home-column-header">
                <h3>{title}</h3>
            </header>
            {items.length === 0 ? (
                <div className="home-column-empty">{emptyLabel}</div>
            ) : (
                <ul className="home-column-list">
                    {items.map((item) => (
                        <li key={item.id}>
                            <Link
                                to={buildAnnouncementDetailPath(item.type, item.slug, sourceTag)}
                                className="home-column-link"
                            >
                                {item.title}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
            <Link to={viewMoreTo} className="home-column-view-more">
                View More
            </Link>
        </section>
    );
}
