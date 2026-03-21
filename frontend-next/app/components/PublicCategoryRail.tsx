import Link from 'next/link';
import type { ContentType } from '@/app/lib/types';
import '@/app/components/HomePage.css';
import '@/app/components/PublicSurface.css';

const CATEGORY_LINKS: Array<{ type: ContentType; label: string; icon: string; href: string }> = [
    { type: 'job', label: 'Latest Jobs', icon: '💼', href: '/jobs' },
    { type: 'result', label: 'Results', icon: '📊', href: '/results' },
    { type: 'admit-card', label: 'Admit Cards', icon: '🎫', href: '/admit-card' },
    { type: 'answer-key', label: 'Answer Keys', icon: '🔑', href: '/answer-key' },
    { type: 'syllabus', label: 'Syllabus', icon: '📚', href: '/syllabus' },
    { type: 'admission', label: 'Admissions', icon: '🎓', href: '/admission' },
];

export function PublicCategoryRail({ activeType }: { activeType?: ContentType }) {
    return (
        <nav className="hp-cats public-category-rail" aria-label="Browse categories">
            {CATEGORY_LINKS.map((category) => (
                <Link
                    key={category.type}
                    href={category.href}
                    className={`hp-cat-card public-cat-card${activeType === category.type ? ' is-active' : ''}`}
                >
                    <span className="hp-cat-icon">{category.icon}</span>
                    <span className="hp-cat-label">{category.label}</span>
                </Link>
            ))}
        </nav>
    );
}
