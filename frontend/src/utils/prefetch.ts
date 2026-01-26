import type { TabType } from './constants';

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

export function prefetchRoute(type: TabType) {
    if (!type || prefetchOnce.has(String(type))) return;
    const handler = prefetchers[type];
    if (!handler) return;
    prefetchOnce.add(String(type));
    handler().catch(() => {
        prefetchOnce.delete(String(type));
    });
}
