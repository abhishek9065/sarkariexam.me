'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, type ReactNode, useMemo, useState } from 'react';
import { CATEGORY_PATHS } from '@/app/lib/urls';

type FooterColumn = {
    title: string;
    links: Array<{ label: string; to: string }>;
};

const HOME_NAV_LINKS = [
    { label: 'Home', to: '/' },
    { label: 'Latest Jobs', to: CATEGORY_PATHS.job },
    { label: 'Results', to: CATEGORY_PATHS.result },
    { label: 'Admit Cards', to: CATEGORY_PATHS['admit-card'] },
    { label: 'Answer Keys', to: CATEGORY_PATHS['answer-key'] },
    { label: 'Syllabus', to: CATEGORY_PATHS.syllabus },
    { label: 'Explore', to: '/explore' },
    { label: 'Admissions', to: CATEGORY_PATHS.admission },
];

const FOOTER_COLUMNS: FooterColumn[] = [
    {
        title: 'Quick Links',
        links: [
            { label: 'Latest Jobs', to: CATEGORY_PATHS.job },
            { label: 'Results', to: CATEGORY_PATHS.result },
            { label: 'Admit Cards', to: CATEGORY_PATHS['admit-card'] },
            { label: 'Answer Keys', to: CATEGORY_PATHS['answer-key'] },
            { label: 'Syllabus', to: CATEGORY_PATHS.syllabus },
        ],
    },
    {
        title: 'Exam Categories',
        links: [
            { label: 'UPSC Exams', to: `${CATEGORY_PATHS.job}?q=UPSC` },
            { label: 'SSC Exams', to: `${CATEGORY_PATHS.job}?q=SSC` },
            { label: 'Railway (RRB)', to: `${CATEGORY_PATHS.job}?q=Railway` },
            { label: 'Banking (IBPS/SBI)', to: `${CATEGORY_PATHS.job}?q=IBPS` },
            { label: 'Defence Jobs', to: `${CATEGORY_PATHS.job}?q=Defence` },
        ],
    },
    {
        title: 'Help & Support',
        links: [
            { label: 'About Us', to: '/about' },
            { label: 'Contact Us', to: '/contact' },
            { label: 'Privacy Policy', to: '/privacy' },
            { label: 'Explore', to: '/explore' },
            { label: 'Admissions', to: CATEGORY_PATHS.admission },
        ],
    },
];

function formatHeaderDate(value: Date) {
    return new Intl.DateTimeFormat('en-IN', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(value);
}

export function ExactHomeShell({ children }: { children: ReactNode }) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const todayText = useMemo(() => formatHeaderDate(new Date()), []);

    const handleSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const query = searchQuery.trim();
        if (!query) return;
        router.push(`${CATEGORY_PATHS.job}?q=${encodeURIComponent(query)}&source=public-shell`);
    };

    return (
        <div className="exact-home">
            <header className="exact-home-top-header">
                <div className="exact-home-shell exact-home-top-header-inner">
                    <div className="exact-home-brand">
                        <div className="exact-home-brand-mark">SE</div>
                        <div className="exact-home-brand-copy">
                            <div className="exact-home-brand-name">SarkariExams.me</div>
                            <div className="exact-home-brand-subtitle">India&apos;s Trusted Government Job Portal</div>
                        </div>
                    </div>

                    <form className="exact-home-search" onSubmit={handleSearch} role="search">
                        <input
                            type="text"
                            placeholder="Search Jobs, Results, Admit Cards..."
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            aria-label="Search Jobs, Results, Admit Cards"
                        />
                        <button type="submit">Search</button>
                    </form>

                    <div className="exact-home-date-status">
                        <div>{todayText}</div>
                        <div className="exact-home-date-live">Updated Today</div>
                    </div>
                </div>
            </header>

            <nav className="exact-home-nav">
                <div className="exact-home-shell exact-home-nav-inner">
                    {HOME_NAV_LINKS.map((link) => (
                        <Link key={link.label} href={link.to} className="exact-home-nav-link">
                            {link.label}
                        </Link>
                    ))}
                </div>
            </nav>

            <div className="exact-home-shell exact-home-main">
                {children}
            </div>

            <footer className="exact-home-footer">
                <div className="exact-home-shell exact-home-footer-inner">
                    <div className="exact-home-footer-brand">
                        <div className="exact-home-footer-logo">SE</div>
                        <div>
                            <div className="exact-home-footer-title">SarkariExams.me</div>
                            <p>India&apos;s trusted portal for government jobs, results, admit cards and exam notifications.</p>
                        </div>
                    </div>

                    <div className="exact-home-footer-columns">
                        {FOOTER_COLUMNS.map((column) => (
                            <div key={column.title} className="exact-home-footer-column">
                                <div className="exact-home-footer-column-title">{column.title}</div>
                                {column.links.map((link) => (
                                    <Link key={link.label} href={link.to}>
                                        » {link.label}
                                    </Link>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="exact-home-footer-bottom">© 2026 SarkariExams.me — All Rights Reserved | Designed for Job Seekers across India</div>
            </footer>
        </div>
    );
}
