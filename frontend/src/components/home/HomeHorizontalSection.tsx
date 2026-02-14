import { Link } from 'react-router-dom';
import type { AnnouncementCard } from '../../types';
import { buildAnnouncementDetailPath, type SourceTag } from '../../utils/trackingLinks';

interface Props {
    title: string;
    viewMoreTo: string;
    items: AnnouncementCard[];
    sourceTag: SourceTag;
}

export function HomeHorizontalSection({ title, viewMoreTo, items, sourceTag }: Props) {
    return (
        <section className="home-horizontal card">
            <header className="home-horizontal-header">
                <h3>{title}</h3>
                <Link to={viewMoreTo}>View More</Link>
            </header>
            {items.length === 0 ? (
                <p className="home-horizontal-empty">No updates available.</p>
            ) : (
                <ul className="home-horizontal-list">
                    {items.map((item) => (
                        <li key={item.id}>
                            <Link
                                to={buildAnnouncementDetailPath(item.type, item.slug, sourceTag)}
                                className="home-horizontal-link"
                            >
                                {item.title}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
