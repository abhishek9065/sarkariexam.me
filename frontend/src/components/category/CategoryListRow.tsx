import { Link } from 'react-router-dom';
import type { AnnouncementCard } from '../../types';
import { buildAnnouncementDetailPath, type SourceTag } from '../../utils/trackingLinks';

interface Props {
    card: AnnouncementCard;
    sourceTag: SourceTag;
}

function formatDate(value?: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function CategoryListRow({ card, sourceTag }: Props) {
    return (
        <Link
            to={buildAnnouncementDetailPath(card.type, card.slug, sourceTag)}
            className="category-list-row"
        >
            <div className="category-list-main">
                <h3>{card.title}</h3>
                <p>{card.organization || 'Government Recruitment'}</p>
            </div>
            <div className="category-list-meta">
                {card.location && <span>{card.location}</span>}
                {card.deadline && <span>Deadline: {formatDate(card.deadline)}</span>}
                <span>Posted: {formatDate(card.postedAt)}</span>
            </div>
        </Link>
    );
}
