import { Link } from 'react-router-dom';
import type { AnnouncementCard } from '../../types';
import { buildAnnouncementDetailPath } from '../../utils/trackingLinks';

interface HomeFeaturedBannerProps {
    items: AnnouncementCard[];
}

function getActionLabel(type: string): { label: string; className: string } {
    switch (type) {
        case 'job':
            return { label: 'Apply Online', className: 'badge-action-job' };
        case 'result':
            return { label: 'Result Out', className: 'badge-action-result' };
        case 'admit-card':
            return { label: 'Admit Card', className: 'badge-action-admit' };
        case 'answer-key':
            return { label: 'Answer Key', className: 'badge-action-answer' };
        case 'admission':
            return { label: 'Admission', className: 'badge-action-admission' };
        case 'syllabus':
            return { label: 'Syllabus', className: 'badge-action-syllabus' };
        default:
            return { label: 'View', className: 'badge-action-default' };
    }
}

export function HomeFeaturedBanner({ items }: HomeFeaturedBannerProps) {
    if (items.length === 0) return null;

    return (
        <section className="home-featured-banner" data-testid="home-featured-banner">
            <header className="home-featured-banner-header">
                <h2>🔥 Trending Updates</h2>
            </header>
            <div className="home-featured-banner-grid">
                {items.map((item) => {
                    const action = getActionLabel(item.type);
                    return (
                        <Link
                            key={item.id}
                            to={buildAnnouncementDetailPath(item.type, item.slug, 'home_banner')}
                            className="home-featured-banner-item"
                        >
                            <span className={`home-featured-badge ${action.className}`}>
                                {action.label}
                            </span>
                            <span className="home-featured-banner-title">{item.title}</span>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}
