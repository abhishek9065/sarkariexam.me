import type { ContentType } from '../../types';
import { FEATURED_ITEMS } from '../../utils/constants';

interface FeaturedGridProps {
    onItemClick: (type: ContentType) => void;
}

export function FeaturedGrid({ onItemClick }: FeaturedGridProps) {
    return (
        <section className="featured-section" aria-labelledby="featured-heading">
            <h2 id="featured-heading" className="featured-heading">Quick Access Categories</h2>
            <div className="featured-grid" role="group" aria-label="Category quick access buttons">
                {FEATURED_ITEMS.map((item, idx) => (
                    <button
                        key={idx}
                        className={`featured-card ${item.color}`}
                        onClick={() => onItemClick(item.type)}
                        aria-label={`View ${item.title} - ${item.subtitle}`}
                    >
                        <span className="featured-title">{item.title}</span>
                        <span className="featured-subtitle">{item.subtitle}</span>
                        <span className="card-action" aria-hidden="true">→</span>
                    </button>
                ))}
            </div>
        </section>
    );
}
