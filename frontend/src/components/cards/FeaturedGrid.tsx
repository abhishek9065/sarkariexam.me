import type { ContentType } from '../../types';
import { FEATURED_ITEMS } from '../../utils/constants';

interface FeaturedGridProps {
    onItemClick: (type: ContentType) => void;
}

export function FeaturedGrid({ onItemClick }: FeaturedGridProps) {
    return (
        <section className="featured-section">
            <div className="featured-grid">
                {FEATURED_ITEMS.map((item, idx) => (
                    <div
                        key={idx}
                        className={`featured-card ${item.color}`}
                        onClick={() => onItemClick(item.type)}
                        style={{ cursor: 'pointer' }}
                    >
                        <span className="featured-title">{item.title}</span>
                        <span className="featured-subtitle">{item.subtitle}</span>
                    </div>
                ))}
            </div>
        </section>
    );
}
