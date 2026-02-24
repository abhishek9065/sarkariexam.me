import { Link } from 'react-router-dom';
import type { AnnouncementCard as CardType, ContentType } from '../types';
import { buildAnnouncementDetailPath, type SourceTag } from '../utils/trackingLinks';
import { trackEvent } from '../utils/analytics';

const TYPE_LABELS: Record<ContentType, string> = {
    job: 'Job',
    result: 'Result',
    'admit-card': 'Admit Card',
    'answer-key': 'Answer Key',
    admission: 'Admission',
    syllabus: 'Syllabus',
};

const TYPE_ICONS: Record<ContentType, string> = {
    job: '💼',
    result: '📊',
    'admit-card': '🎫',
    'answer-key': '🔑',
    admission: '🎓',
    syllabus: '📚',
};

function formatDate(dateStr?: string | null): string {
    if (!dateStr) return '';
    try {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    } catch {
        return '';
    }
}

function getDeadlineStatus(deadline?: string | null): { label: string; className: string } | null {
    if (!deadline) return null;
    const now = new Date();
    const dl = new Date(deadline);
    const diffDays = Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: 'Expired', className: 'deadline-expired' };
    if (diffDays <= 3) return { label: `${diffDays}d left`, className: 'deadline-urgent' };
    if (diffDays <= 7) return { label: `${diffDays}d left`, className: 'deadline-soon' };
    return { label: formatDate(deadline), className: 'deadline-normal' };
}

interface Props {
    card: CardType;
    /** Show type badge. Defaults to true */
    showType?: boolean;
    /** Optional source tagging for analytics attribution */
    sourceTag?: SourceTag;
}

export function AnnouncementCard({ card, showType = true, sourceTag }: Props) {
    const deadlineInfo = getDeadlineStatus(card.deadline);
    const detailPath = buildAnnouncementDetailPath(card.type, card.slug, sourceTag);

    const handleClick = () => {
        trackEvent('card_click', { type: card.type, slug: card.slug, source: sourceTag || 'unknown' });
    };

    return (
        <Link to={detailPath} className="announcement-card card card-clickable" data-source={sourceTag} onClick={handleClick}>
            <div className="announcement-card-header">
                {showType && (
                    <span className={`badge badge-${card.type}`}>
                        {TYPE_ICONS[card.type]} {TYPE_LABELS[card.type]}
                    </span>
                )}
                <div className="announcement-card-badges">
                    <span className="announcement-verified" title="From official source">✓ Official</span>
                    {deadlineInfo && (
                        <span className={`announcement-deadline ${deadlineInfo.className}`}>
                            {deadlineInfo.label}
                        </span>
                    )}
                </div>
            </div>

            <h3 className="announcement-card-title">{card.title}</h3>

            <div className="announcement-card-meta">
                {card.organization && (
                    <span className="announcement-card-org">
                        🏛️ {card.organization}
                    </span>
                )}
                {card.location && (
                    <span className="announcement-card-location">
                        📍 {card.location}
                    </span>
                )}
            </div>

            <div className="announcement-card-footer">
                <div className="announcement-card-stats">
                    {card.totalPosts != null && card.totalPosts > 0 && (
                        <span className="announcement-card-posts">
                            👥 {card.totalPosts.toLocaleString()} posts
                        </span>
                    )}
                    {card.viewCount != null && card.viewCount > 0 && (
                        <span className="announcement-card-views">
                            👁 {card.viewCount.toLocaleString()}
                        </span>
                    )}
                </div>
                <span className="announcement-card-date" title="Last updated">
                    {formatDate(card.postedAt)}
                </span>
            </div>
        </Link>
    );
}

/** Skeleton version */
export function AnnouncementCardSkeleton() {
    return (
        <div className="announcement-card card">
            <div className="announcement-card-header">
                <div className="skeleton" style={{ width: 100, height: 24, borderRadius: 12 }} />
                <div className="skeleton" style={{ width: 60, height: 20, borderRadius: 10 }} />
            </div>
            <div className="skeleton" style={{ width: '90%', height: 22, marginTop: 16, borderRadius: 6 }} />
            <div className="skeleton" style={{ width: '70%', height: 18, marginTop: 12, borderRadius: 6 }} />
            <div className="announcement-card-footer" style={{ marginTop: 20, paddingTop: 12, borderTop: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                    <div className="skeleton" style={{ width: 60, height: 14, borderRadius: 4 }} />
                    <div className="skeleton" style={{ width: 50, height: 14, borderRadius: 4 }} />
                </div>
                <div className="skeleton" style={{ width: 80, height: 14, borderRadius: 4 }} />
            </div>
        </div>
    );
}
