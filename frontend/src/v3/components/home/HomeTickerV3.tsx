import { Link } from 'react-router-dom';
import type { Announcement } from '../../../types';

interface HomeTickerV3Props {
    items: Announcement[];
}

export function HomeTickerV3({ items }: HomeTickerV3Props) {
    if (items.length === 0) return null;

    return (
        <section className="sr3-section sr3-ticker sr3-surface" aria-label="Urgent updates">
            <div className="sr3-ticker-label">Urgent</div>
            <div className="sr3-ticker-track">
                {items.map((item) => (
                    <Link key={item.id || item.slug} to={`/${item.type}/${item.slug}`} className="sr3-ticker-link">
                        {item.title}
                    </Link>
                ))}
            </div>
        </section>
    );
}

export default HomeTickerV3;
