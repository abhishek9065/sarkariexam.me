'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { Icon } from '@/app/components/Icon';
import { trackEvent } from '@/app/lib/analytics';
import type { AnnouncementCard as CardType } from '@/app/lib/types';
import { buildAnnouncementDetailPath } from '@/app/lib/urls';
import { CATEGORY_META, formatCompactNumber, formatDate, getDeadlineInfo, isFresh } from '@/app/lib/ui';
import styles from './AnnouncementCard.module.css';

type Props = {
    card: CardType;
    showType?: boolean;
    sourceTag?: string;
};

export function AnnouncementCard({ card, showType = true, sourceTag = 'card' }: Props) {
    const meta = CATEGORY_META[card.type];
    const deadlineInfo = getDeadlineInfo(card.deadline);
    const fresh = isFresh(card.postedAt, 3);

    return (
        <Link
            href={buildAnnouncementDetailPath(card.type, card.slug, sourceTag)}
            className={styles.card}
            style={{ '--accent': meta.accent } as CSSProperties}
            onClick={() => trackEvent('card_click', { slug: card.slug, type: card.type, source: sourceTag })}
        >
            <div className={styles.topRow}>
                {showType ? (
                    <span className={styles.typePill}>
                        <Icon name={meta.icon as Parameters<typeof Icon>[0]['name']} size={16} />
                        {meta.shortEn}
                    </span>
                ) : <span className={styles.typeSpacer} />}

                <div className={styles.badges}>
                    <span className={styles.officialPill}>Official linked</span>
                    {fresh ? <span className={styles.freshPill}>NEW</span> : null}
                </div>
            </div>

            <h3 className={styles.title}>{card.title}</h3>

            <div className={styles.metaLine}>
                <span className={styles.metaItem}>
                    <Icon name="Building2" size={15} />
                    <span>{card.organization}</span>
                </span>
                {card.location ? (
                    <span className={styles.metaItem}>
                        <Icon name="MapPinned" size={15} />
                        <span>{card.location}</span>
                    </span>
                ) : null}
            </div>

            <div className={styles.statsRow}>
                {card.totalPosts ? <span className={styles.statChip}>{card.totalPosts.toLocaleString('en-IN')} Posts</span> : null}
                {deadlineInfo ? (
                    <span className={`${styles.statChip} ${styles[`tone${deadlineInfo.tone[0].toUpperCase()}${deadlineInfo.tone.slice(1)}`]}`}>
                        {deadlineInfo.label}
                    </span>
                ) : null}
            </div>

            <div className={styles.footer}>
                <span className={styles.footerItem}>
                    <Icon name="CalendarClock" size={15} />
                    <span>{formatDate(card.deadline ?? card.postedAt)}</span>
                </span>
                <span className={styles.footerItem}>
                    <Icon name="Sparkles" size={15} />
                    <span>{formatCompactNumber(card.viewCount)} views</span>
                </span>
            </div>
        </Link>
    );
}

export function AnnouncementCardSkeleton() {
    return (
        <div className={styles.skeletonCard} aria-hidden="true">
            <div className={styles.skeletonTop}>
                <span className={styles.skeletonBadge} />
                <span className={styles.skeletonBadgeSmall} />
            </div>
            <span className={styles.skeletonTitle} />
            <span className={styles.skeletonMeta} />
            <div className={styles.skeletonStats}>
                <span className={styles.skeletonChip} />
                <span className={styles.skeletonChip} />
            </div>
            <span className={styles.skeletonFooter} />
        </div>
    );
}
