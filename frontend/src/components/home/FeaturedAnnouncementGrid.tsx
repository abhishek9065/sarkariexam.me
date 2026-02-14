import { Link } from 'react-router-dom';

export interface FeaturedTile {
    id: string;
    title: string;
    subtitle: string;
    href: string;
    colorClass: string;
}

interface Props {
    tiles: FeaturedTile[];
}

export function FeaturedAnnouncementGrid({ tiles }: Props) {
    return (
        <section className="home-featured" aria-label="Featured announcements">
            <div className="section-header home-section-header-tight">
                <h2 className="section-title">Important Updates</h2>
            </div>
            <div className="home-featured-grid">
                {tiles.map((tile) => (
                    <Link key={tile.id} to={tile.href} className={`home-featured-card ${tile.colorClass}`}>
                        <span className="home-featured-title">{tile.title}</span>
                        <span className="home-featured-subtitle">{tile.subtitle}</span>
                    </Link>
                ))}
            </div>
        </section>
    );
}
