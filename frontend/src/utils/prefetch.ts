import type { TabType } from './constants';
import type { ContentType } from '../types';
import { fetchAnnouncementCardsPage } from './api';

const prefetchers: Partial<Record<TabType, () => Promise<unknown>>> = {
    job: () => import('../pages/CategoryPage'),
    result: () => import('../pages/CategoryPage'),
    'admit-card': () => import('../pages/CategoryPage'),
    'answer-key': () => import('../pages/CategoryPage'),
    admission: () => import('../pages/CategoryPage'),
    syllabus: () => import('../pages/CategoryPage'),
    bookmarks: () => import('../pages/BookmarksPage'),
    profile: () => import('../pages/ProfilePage'),
    community: () => import('../pages/CommunityPage'),
};

const prefetchOnce = new Set<string>();
const dataPrefetchOnce = new Set<string>();

function prefetchListingCards(type: ContentType) {
    const key = `cards:${type}`;
    if (dataPrefetchOnce.has(key)) return;
    dataPrefetchOnce.add(key);
    fetchAnnouncementCardsPage({ type, limit: 24 }).catch(() => {
        dataPrefetchOnce.delete(key);
    });
}

function isContentType(value: TabType): value is ContentType {
    return value === 'job'
        || value === 'result'
        || value === 'admit-card'
        || value === 'answer-key'
        || value === 'admission'
        || value === 'syllabus';
}

export function prefetchRoute(type: TabType) {
    if (!type || prefetchOnce.has(String(type))) return;
    const handler = prefetchers[type];
    if (!handler) return;
    prefetchOnce.add(String(type));
    handler().catch(() => {
        prefetchOnce.delete(String(type));
    });
    if (isContentType(type)) {
        prefetchListingCards(type);
    }
}
