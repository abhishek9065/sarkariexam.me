import { Link } from 'react-router-dom';
import type { Announcement } from '../../../types';

interface FeaturedActionGridV3Props {
    items: Announcement[];
    onCompareAdd?: (item: Announcement) => void;
}

const chipClass = (index: number) => {
    const palette = ['green', 'blue', 'orange', 'red'];
    return palette[index % palette.length];
};

export function FeaturedActionGridV3({ items, onCompareAdd }: FeaturedActionGridV3Props) {
    if (items.length === 0) {
        return (
            <section className="sr3-section sr3-surface">
                <p className="sr3-empty">No featured opportunities available yet.</p>
            </section>
        );
    }

    return (
        <section className="sr3-section sr3-surface">
            <header className="sr3-card-head">
                <div>
                    <h2 className="sr3-section-title">Featured Opportunities</h2>
                    <p className="sr3-section-subtitle">High-intent forms and major recruitments</p>
                </div>
            </header>
            <div className="sr3-featured-grid">
                {items.map((item, index) => (
                    <article key={item.id || item.slug} className="sr3-featured-card">
                        <span className={`sr3-badge ${chipClass(index)}`}>{item.type.toUpperCase()}</span>
                        <Link to={`/${item.type}/${item.slug}`} className="sr3-featured-title">
                            {item.title}
                        </Link>
                        <p className="sr3-featured-meta">{item.organization || 'Government Recruitment'}</p>
                        <div className="sr3-featured-foot">
                            <Link to={`/${item.type}/${item.slug}`} className="sr3-inline-link">Open</Link>
                            {onCompareAdd && item.type === 'job' && (
                                <button type="button" className="sr3-btn secondary" onClick={() => onCompareAdd(item)}>
                                    Compare
                                </button>
                            )}
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}

export default FeaturedActionGridV3;
