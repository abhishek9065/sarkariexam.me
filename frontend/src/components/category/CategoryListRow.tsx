import { Link } from 'react-router-dom';
import type { AnnouncementCard } from '../../types';
import { buildAnnouncementDetailPath, type SourceTag } from '../../utils/trackingLinks';

interface Props {
    card: AnnouncementCard;
    sourceTag: SourceTag;
    index?: number;
}

function formatDate(value?: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getDeadlineClass(deadline?: string | null): string {
    if (!deadline) return '';
    const diffDays = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'cat-row-expired';
    if (diffDays <= 3) return 'cat-row-urgent';
    if (diffDays <= 7) return 'cat-row-soon';
    return '';
}

export function CategoryListRow({ card, sourceTag, index }: Props) {
    const dlClass = getDeadlineClass(card.deadline);

    return (
        <Link
            to={buildAnnouncementDetailPath(card.type, card.slug, sourceTag)}
            className={`cat-list-row ${dlClass}`}
        >
            {index != null && <span className="cat-row-num">{index}</span>}
            <div className="cat-row-main">
                <h3 className="cat-row-title">{card.title}</h3>
                <div className="cat-row-subtitle">
                    <span className="cat-row-org">{card.organization || 'Government Recruitment'}</span>
                    {card.location && <span className="cat-row-loc">📍 {card.location}</span>}
                </div>
            </div>
            <div className="cat-row-meta">
                {card.deadline && <span className={`cat-row-deadline ${dlClass}`}>⏰ {formatDate(card.deadline)}</span>}
                <span className="cat-row-date">{formatDate(card.postedAt)}</span>
            </div>
            <span className="cat-row-arrow">→</span>
        </Link>
    );
}
