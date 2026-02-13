import { useMemo } from 'react';
import type { Announcement, ContentType } from '../../types';
import { formatDate, formatNumber, getDaysRemaining } from '../../utils/formatters';

interface HomeDenseBlocksProps {
    data: Announcement[];
    onItemClick: (item: Announcement) => void;
    onOpenCategory: (type: ContentType) => void;
    onAddCompare?: (item: Announcement) => void;
    compareEnabled?: boolean;
}

const QUICK_STATES = [
    'All India',
    'Uttar Pradesh',
    'Bihar',
    'Delhi',
    'Rajasthan',
    'Maharashtra',
    'Madhya Pradesh',
    'West Bengal',
];

const byType = (items: Announcement[], type: ContentType) => items.filter((item) => item.type === type);

export function HomeDenseBlocks({
    data,
    onItemClick,
    onOpenCategory,
    onAddCompare,
    compareEnabled = false,
}: HomeDenseBlocksProps) {
    const urgent = useMemo(
        () => data
            .filter((item) => {
                const days = getDaysRemaining(item.deadline ?? undefined);
                return days !== null && days >= 0 && days <= 10;
            })
            .sort((a, b) => {
                const aDays = getDaysRemaining(a.deadline ?? undefined) ?? 999;
                const bDays = getDaysRemaining(b.deadline ?? undefined) ?? 999;
                return aDays - bDays;
            })
            .slice(0, 20),
        [data]
    );

    const latestJobs = useMemo(() => byType(data, 'job').slice(0, 14), [data]);
    const latestResults = useMemo(() => byType(data, 'result').slice(0, 12), [data]);
    const latestAdmitCards = useMemo(() => byType(data, 'admit-card').slice(0, 12), [data]);
    const featured = useMemo(() => byType(data, 'job')
        .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
        .slice(0, 12), [data]);

    return (
        <section className="sr-home-dense" aria-label="High density discovery blocks">
            {urgent.length > 0 && (
                <div className="sr-home-urgent">
                    <div className="sr-home-urgent-head">
                        <strong>Urgent Deadlines</strong>
                        <span>{urgent.length} closing soon</span>
                    </div>
                    <div className="sr-home-urgent-list">
                        {urgent.map((item) => {
                            const days = getDaysRemaining(item.deadline ?? undefined);
                            return (
                                <button
                                    key={`urgent-${item.id}`}
                                    type="button"
                                    className="sr-home-urgent-item"
                                    onClick={() => onItemClick(item)}
                                >
                                    <span>{item.title}</span>
                                    <small>{days === 0 ? 'Last day' : `${days} days left`}</small>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="sr-home-featured-grid">
                {featured.map((item, index) => (
                    <article key={`feat-${item.id}`} className={`sr-home-featured-card tone-${(index % 4) + 1}`}>
                        <h3>{item.title}</h3>
                        <p>{item.organization}</p>
                        <div className="sr-home-featured-meta">
                            {item.totalPosts ? <span>{formatNumber(item.totalPosts ?? undefined)} posts</span> : <span>Official update</span>}
                            <span>{item.deadline ? formatDate(item.deadline) : 'Open now'}</span>
                        </div>
                        <div className="sr-home-featured-actions">
                            <button type="button" onClick={() => onItemClick(item)}>Open</button>
                            {compareEnabled && onAddCompare && (
                                <button type="button" onClick={() => onAddCompare(item)}>Compare</button>
                            )}
                        </div>
                    </article>
                ))}
            </div>

            <div className="sr-home-state-links">
                <strong>State Wise Jobs</strong>
                <div className="sr-home-state-link-list">
                    {QUICK_STATES.map((state) => (
                        <a key={state} href={`/jobs?location=${encodeURIComponent(state)}`}>
                            {state}
                        </a>
                    ))}
                </div>
            </div>

            <div className="sr-home-dense-columns">
                <div className="sr-home-dense-column">
                    <div className="sr-home-dense-column-head">
                        <h3>Latest Jobs</h3>
                        <button type="button" onClick={() => onOpenCategory('job')}>View all</button>
                    </div>
                    <ul>
                        {latestJobs.map((item) => (
                            <li key={`job-${item.id}`}>
                                <button type="button" onClick={() => onItemClick(item)}>{item.title}</button>
                                {compareEnabled && onAddCompare && (
                                    <button type="button" className="sr-mini-compare" onClick={() => onAddCompare(item)}>+</button>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="sr-home-dense-column">
                    <div className="sr-home-dense-column-head">
                        <h3>Latest Results</h3>
                        <button type="button" onClick={() => onOpenCategory('result')}>View all</button>
                    </div>
                    <ul>
                        {latestResults.map((item) => (
                            <li key={`result-${item.id}`}>
                                <button type="button" onClick={() => onItemClick(item)}>{item.title}</button>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="sr-home-dense-column">
                    <div className="sr-home-dense-column-head">
                        <h3>Admit Cards</h3>
                        <button type="button" onClick={() => onOpenCategory('admit-card')}>View all</button>
                    </div>
                    <ul>
                        {latestAdmitCards.map((item) => (
                            <li key={`admit-${item.id}`}>
                                <button type="button" onClick={() => onItemClick(item)}>{item.title}</button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    );
}

export default HomeDenseBlocks;
