import type { Announcement } from '../../types';

interface TrendingRailProps {
    title?: string;
    items: Announcement[];
    onItemClick: (item: Announcement) => void;
}

export function TrendingRail({ title = 'Trending Exams', items, onItemClick }: TrendingRailProps) {
    if (items.length === 0) return null;

    return (
        <section className="sr-trending-rail" aria-label={title}>
            <div className="sr-trending-rail-head">
                <h3>{title}</h3>
            </div>
            <div className="sr-trending-rail-list">
                {items.slice(0, 14).map((item) => (
                    <button
                        key={`trend-${item.id}`}
                        type="button"
                        className="sr-trending-pill"
                        onClick={() => onItemClick(item)}
                    >
                        <strong>{item.title}</strong>
                        <span>{item.organization}</span>
                    </button>
                ))}
            </div>
        </section>
    );
}

export default TrendingRail;
