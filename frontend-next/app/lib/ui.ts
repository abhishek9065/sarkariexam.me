'use client';

import type { Announcement, AnnouncementCard, ContentType, SearchSuggestion } from '@/app/lib/types';
import { buildCategoryPath } from '@/app/lib/urls';

export type DeadlineTone = 'neutral' | 'warning' | 'danger' | 'success' | 'expired';
export type DeadlineStatus = 'all' | 'open' | 'closing' | 'expired';

export type NavItem = {
    key: string;
    labelEn: string;
    labelHi: string;
    href: string;
    icon: string;
    matchPrefixes: string[];
};

export type CategoryMeta = {
    type: ContentType;
    labelEn: string;
    labelHi: string;
    shortEn: string;
    shortHi: string;
    icon: string;
    href: string;
    accent: string;
};

export type SearchGroup = {
    type: ContentType;
    title: string;
    items: SearchSuggestion[];
};

export type HomepageUrgencyRail = {
    key: string;
    title: string;
    description: string;
    type?: ContentType;
    items: AnnouncementCard[];
};

export type CategoryFilterState = {
    search: string;
    organization: string;
    location: string;
    qualification: string;
    deadlineStatus: DeadlineStatus;
    sort: 'newest' | 'oldest' | 'deadline' | 'views';
    view: 'list' | 'cards';
};

export type DetailTrustMetadata = {
    hasOfficialLink: boolean;
    isStale: boolean;
    deadlineLabel?: string;
    sourceLabel: string;
};

export type DashboardModule = {
    key: string;
    title: string;
    description: string;
    count?: number;
};

export type RecentView = {
    id: string;
    title: string;
    slug: string;
    type: ContentType;
    organization: string;
    postedAt: string;
};

export const CATEGORY_META: Record<ContentType, CategoryMeta> = {
    job: {
        type: 'job',
        labelEn: 'Latest Jobs',
        labelHi: 'लेटेस्ट जॉब्स',
        shortEn: 'Jobs',
        shortHi: 'जॉब्स',
        icon: 'Briefcase',
        href: buildCategoryPath('job'),
        accent: 'var(--accent-job)',
    },
    result: {
        type: 'result',
        labelEn: 'Results',
        labelHi: 'रिजल्ट',
        shortEn: 'Results',
        shortHi: 'रिजल्ट',
        icon: 'BarChart3',
        href: buildCategoryPath('result'),
        accent: 'var(--accent-result)',
    },
    'admit-card': {
        type: 'admit-card',
        labelEn: 'Admit Cards',
        labelHi: 'एडमिट कार्ड',
        shortEn: 'Admit Cards',
        shortHi: 'एडमिट कार्ड',
        icon: 'Ticket',
        href: buildCategoryPath('admit-card'),
        accent: 'var(--accent-admit)',
    },
    'answer-key': {
        type: 'answer-key',
        labelEn: 'Answer Keys',
        labelHi: 'आंसर की',
        shortEn: 'Answer Keys',
        shortHi: 'आंसर की',
        icon: 'KeyRound',
        href: buildCategoryPath('answer-key'),
        accent: 'var(--accent-answer)',
    },
    syllabus: {
        type: 'syllabus',
        labelEn: 'Syllabus',
        labelHi: 'सिलेबस',
        shortEn: 'Syllabus',
        shortHi: 'सिलेबस',
        icon: 'BookOpenText',
        href: buildCategoryPath('syllabus'),
        accent: 'var(--accent-syllabus)',
    },
    admission: {
        type: 'admission',
        labelEn: 'Admissions',
        labelHi: 'एडमिशन',
        shortEn: 'Admissions',
        shortHi: 'एडमिशन',
        icon: 'GraduationCap',
        href: buildCategoryPath('admission'),
        accent: 'var(--accent-admission)',
    },
};

export const PRIMARY_NAV: NavItem[] = [
    { key: 'home', labelEn: 'Home', labelHi: 'होम', href: '/', icon: 'House', matchPrefixes: ['/'] },
    { key: 'job', labelEn: 'Jobs', labelHi: 'जॉब्स', href: buildCategoryPath('job'), icon: 'Briefcase', matchPrefixes: ['/jobs', '/job'] },
    { key: 'result', labelEn: 'Results', labelHi: 'रिजल्ट', href: buildCategoryPath('result'), icon: 'BarChart3', matchPrefixes: ['/results', '/result'] },
    { key: 'admit-card', labelEn: 'Admit Cards', labelHi: 'एडमिट कार्ड', href: buildCategoryPath('admit-card'), icon: 'Ticket', matchPrefixes: ['/admit-cards', '/admit-card'] },
    { key: 'answer-key', labelEn: 'Answer Keys', labelHi: 'आंसर की', href: buildCategoryPath('answer-key'), icon: 'KeyRound', matchPrefixes: ['/answer-keys', '/answer-key'] },
];

export const SECONDARY_LINKS = [
    { href: buildCategoryPath('admission'), labelEn: 'Admissions', labelHi: 'एडमिशन' },
    { href: buildCategoryPath('syllabus'), labelEn: 'Syllabus', labelHi: 'सिलेबस' },
    { href: '/explore', labelEn: 'Explore', labelHi: 'एक्सप्लोर' },
    { href: '/about', labelEn: 'About', labelHi: 'अबाउट' },
    { href: '/contact', labelEn: 'Contact', labelHi: 'संपर्क' },
    { href: '/privacy', labelEn: 'Privacy', labelHi: 'प्राइवेसी' },
    { href: '/disclaimer', labelEn: 'Disclaimer', labelHi: 'डिस्क्लेमर' },
];

export const EXAM_FAMILY_SHORTCUTS = [
    { label: 'UPSC', href: '/jobs?q=UPSC' },
    { label: 'SSC', href: '/jobs?q=SSC' },
    { label: 'Railway', href: '/jobs?q=Railway' },
    { label: 'Banking', href: '/jobs?q=Bank' },
    { label: 'Defence', href: '/jobs?q=Defence' },
    { label: 'Police', href: '/jobs?q=Police' },
    { label: 'Teaching', href: '/jobs?q=Teaching' },
    { label: 'State PSC', href: '/jobs?q=PSC' },
];

export const STATE_SHORTCUTS = [
    'Uttar Pradesh',
    'Bihar',
    'Rajasthan',
    'Madhya Pradesh',
    'Maharashtra',
    'Delhi',
    'West Bengal',
    'Jharkhand',
    'Punjab',
    'Haryana',
    'Karnataka',
    'Tamil Nadu',
];

export const TRUST_PILLARS = [
    { titleEn: 'Official-source first', titleHi: 'ऑफिशियल सोर्स पहले', copyEn: 'Every action CTA points users back to the official notice or authority page.', copyHi: 'हर एक्शन CTA यूजर को ऑफिशियल नोटिस या अथॉरिटी पेज पर वापस ले जाता है।' },
    { titleEn: 'Deadline visibility', titleHi: 'डेडलाइन विजिबिलिटी', copyEn: 'Closing soon and expired states are surfaced early for faster decisions.', copyHi: 'क्लोजिंग सून और एक्सपायर्ड स्टेट जल्दी दिखती हैं ताकि फैसला जल्दी हो।' },
    { titleEn: 'Fast mobile scanning', titleHi: 'फास्ट मोबाइल स्कैनिंग', copyEn: 'Dense information is structured for low-friction scanning on Android screens.', copyHi: 'डेंस जानकारी को एंड्रॉइड स्क्रीन पर लो-फ्रिक्शन स्कैनिंग के लिए स्ट्रक्चर किया गया है।' },
];

export function copyFor(language: 'en' | 'hi', en: string, hi: string): string {
    return language === 'hi' ? hi : en;
}

export function formatDate(value?: string | null, options?: Intl.DateTimeFormatOptions): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-IN', options ?? { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value?: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function formatCompactNumber(value?: number | null): string {
    if (value == null || Number.isNaN(value)) return '0';
    return new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export function formatRelativeTime(value?: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    const diff = date.getTime() - Date.now();
    const abs = Math.abs(diff);
    const days = Math.round(abs / 86_400_000);
    if (days === 0) return diff >= 0 ? 'today' : 'today';
    if (days === 1) return diff >= 0 ? 'in 1 day' : '1 day ago';
    if (days < 7) return diff >= 0 ? `in ${days} days` : `${days} days ago`;
    return formatDate(value);
}

export function getDaysUntil(value?: string | null): number | null {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}

export function isFresh(value?: string | null, days = 3): boolean {
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    return Date.now() - date.getTime() <= days * 86_400_000;
}

export function getDeadlineInfo(deadline?: string | null): { label: string; tone: DeadlineTone; daysLeft: number | null; expired: boolean } | null {
    const daysLeft = getDaysUntil(deadline);
    if (daysLeft == null) return null;
    if (daysLeft < 0) return { label: 'Expired', tone: 'expired', daysLeft, expired: true };
    if (daysLeft === 0) return { label: 'Last date today', tone: 'danger', daysLeft, expired: false };
    if (daysLeft <= 3) return { label: `${daysLeft} days left`, tone: 'danger', daysLeft, expired: false };
    if (daysLeft <= 7) return { label: `${daysLeft} days left`, tone: 'warning', daysLeft, expired: false };
    return { label: `Open · ${daysLeft} days left`, tone: 'success', daysLeft, expired: false };
}

export function filterByDeadlineStatus<T extends { deadline?: string | null }>(items: T[], status: DeadlineStatus): T[] {
    if (status === 'all') return items;
    return items.filter((item) => {
        const daysLeft = getDaysUntil(item.deadline);
        if (status === 'expired') return daysLeft != null && daysLeft < 0;
        if (status === 'closing') return daysLeft != null && daysLeft >= 0 && daysLeft <= 7;
        return daysLeft == null || daysLeft >= 0;
    });
}

export function buildRecentView(card: Announcement | AnnouncementCard): RecentView {
    return {
        id: card.id,
        title: card.title,
        slug: card.slug,
        type: card.type,
        organization: card.organization,
        postedAt: card.postedAt,
    };
}

export function groupSuggestionsByType(items: SearchSuggestion[]): SearchGroup[] {
    const map = new Map<ContentType, SearchSuggestion[]>();
    items.forEach((item) => {
        const list = map.get(item.type) ?? [];
        list.push(item);
        map.set(item.type, list);
    });
    return Object.keys(CATEGORY_META).map((key) => key as ContentType).flatMap((type) => {
        const list = map.get(type);
        if (!list || list.length === 0) return [];
        return [{
            type,
            title: CATEGORY_META[type].labelEn,
            items: list,
        }];
    });
}
