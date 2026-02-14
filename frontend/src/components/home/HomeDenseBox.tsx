import { Link } from 'react-router-dom';
import type { AnnouncementCard } from '../../types';
import { buildAnnouncementDetailPath, type SourceTag } from '../../utils/trackingLinks';

interface HomeDenseBoxProps {
    title: string;
    viewMoreTo: string;
    items: AnnouncementCard[];
    sourceTag: SourceTag;
    testId: string;
    emptyLabel?: string;
    className?: string;
    showBadges?: boolean;
}

function getTypeBadge(type: string): { label: string; className: string } | null {
    switch (type) {
        case 'job':
            return { label: 'New', className: 'dense-badge-job' };
        case 'result':
            return { label: 'Result', className: 'dense-badge-result' };
        case 'admit-card':
            return { label: 'Admit Card', className: 'dense-badge-admit' };
        case 'answer-key':
            return { label: 'Ans Key', className: 'dense-badge-answer' };
        case 'admission':
            return { label: 'Admission', className: 'dense-badge-admission' };
        case 'syllabus':
            return { label: 'Syllabus', className: 'dense-badge-syllabus' };
        default:
            return null;
    }
}

export function HomeDenseBox({
    title,
    viewMoreTo,
    items,
    sourceTag,
    testId,
    emptyLabel = 'No updates yet.',
    className,
    showBadges = false,
}: HomeDenseBoxProps) {
    return (
        <section className={`home-dense-box${className ? ` ${className}` : ''}`} data-testid={testId}>
            <header className="home-dense-box-header">
                <h2>{title}</h2>
            </header>

            {items.length === 0 ? (
                <p className="home-dense-box-empty">{emptyLabel}</p>
            ) : (
                <ul className="home-dense-box-list">
                    {items.map((item) => {
                        const badge = showBadges ? getTypeBadge(item.type) : null;
                        return (
                            <li key={item.id}>
                                <Link
                                    to={buildAnnouncementDetailPath(item.type, item.slug, sourceTag)}
                                    className="home-dense-box-link"
                                >
                                    {item.title}
                                </Link>
                                {badge && (
                                    <span className={`dense-inline-badge ${badge.className}`}>
                                        {badge.label}
                                    </span>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}

            <Link to={viewMoreTo} className="home-dense-box-view-more">
                View More →
            </Link>
        </section>
    );
}
