import { Link } from 'react-router-dom';
import type { AnnouncementCard } from '../../types';
import { buildAnnouncementDetailPath } from '../../utils/trackingLinks';

interface HomeMarqueeProps {
    items: AnnouncementCard[];
}

export function HomeMarquee({ items }: HomeMarqueeProps) {
    if (items.length === 0) return null;

    // Duplicate items to ensure smooth infinite scroll
    const marqueeItems = [...items, ...items];

    return (
        <div className="home-marquee-container" data-testid="home-marquee">
            <div className="home-marquee-content">
                {marqueeItems.map((item, index) => (
                    <Link
                        key={`${item.id}-${index}`}
                        to={buildAnnouncementDetailPath(item.type, item.slug, 'home_marquee')}
                        className="home-marquee-item"
                    >
                        {item.title}
                        <span className="home-marquee-separator">||</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
