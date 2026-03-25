import Link from 'next/link';
import type { CSSProperties } from 'react';
import { Icon } from '@/app/components/Icon';
import type { ContentType } from '@/app/lib/types';
import { CATEGORY_META } from '@/app/lib/ui';
import styles from './PublicCategoryRail.module.css';

export function PublicCategoryRail({ activeType }: { activeType?: ContentType }) {
    return (
        <nav className={styles.rail} aria-label="Browse public categories">
            {(Object.keys(CATEGORY_META) as ContentType[]).map((type) => {
                const meta = CATEGORY_META[type];
                return (
                    <Link
                        key={type}
                        href={meta.href}
                        className={`${styles.card}${activeType === type ? ` ${styles.active}` : ''}`}
                        style={{ '--accent': meta.accent } as CSSProperties}
                    >
                        <span className={styles.iconWrap}>
                            <Icon name={meta.icon as Parameters<typeof Icon>[0]['name']} size={18} />
                        </span>
                        <span className={styles.label}>{meta.labelEn}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
