import Link from 'next/link';
import { Icon } from '@/app/components/Icon';
import type { AnnouncementCard } from '@/app/lib/types';
import { buildAnnouncementDetailPath } from '@/app/lib/urls';
import { formatDate, getDeadlineInfo } from '@/app/lib/ui';
import styles from './CategoryListRow.module.css';

type Props = {
    card: AnnouncementCard;
    sourceTag: string;
    index?: number;
};

export function CategoryListRow({ card, sourceTag, index }: Props) {
    const deadlineInfo = getDeadlineInfo(card.deadline);

    return (
        <Link
            href={buildAnnouncementDetailPath(card.type, card.slug, sourceTag)}
            className={styles.row}
        >
            {index != null ? <span className={styles.index}>{index}</span> : null}

            <div className={styles.content}>
                <div className={styles.header}>
                    <h3 className={styles.title}>{card.title}</h3>
                    {deadlineInfo ? (
                        <span className={`${styles.deadlinePill} ${styles[`tone${deadlineInfo.tone[0].toUpperCase()}${deadlineInfo.tone.slice(1)}`]}`}>
                            {deadlineInfo.label}
                        </span>
                    ) : null}
                </div>

                <div className={styles.meta}>
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
                    {card.totalPosts ? (
                        <span className={styles.metaItem}>
                            <Icon name="User" size={15} />
                            <span>{card.totalPosts.toLocaleString('en-IN')} posts</span>
                        </span>
                    ) : null}
                </div>
            </div>

            <div className={styles.side}>
                <span>{formatDate(card.postedAt)}</span>
                <span className={styles.arrow}>
                    <Icon name="ArrowRight" size={18} />
                </span>
            </div>
        </Link>
    );
}
