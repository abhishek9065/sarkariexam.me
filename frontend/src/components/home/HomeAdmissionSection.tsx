import { Link } from 'react-router-dom';
import type { AnnouncementCard } from '../../types';
import { buildAnnouncementDetailPath } from '../../utils/trackingLinks';

interface Props {
    items: AnnouncementCard[];
}

export function HomeAdmissionSection({ items }: Props) {
    return (
        <section className="home-admission-extended card" data-testid="home-admission-extended">
            <header className="home-admission-header">
                <h3>Admission</h3>
                <Link to="/admission">View More</Link>
            </header>
            {items.length === 0 ? (
                <p className="home-admission-empty">No admission updates available right now.</p>
            ) : (
                <ul className="home-admission-list">
                    {items.map((item) => (
                        <li key={item.id}>
                            <Link to={buildAnnouncementDetailPath(item.type, item.slug, 'home_admission_extended')}>
                                {item.title}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
