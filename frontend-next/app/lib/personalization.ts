'use client';

import type { ContentType } from '@/app/lib/types';
import type { RecentView } from '@/app/lib/ui';

const RECENT_VIEWS_KEY = 'sr_recent_views_v2';
const SAVED_SEARCHES_KEY = 'sr_saved_searches_v2';
const INTERESTS_KEY = 'sr_interests_v2';

export type SavedSearchDraft = {
    id: string;
    name: string;
    query: string;
    type?: ContentType;
    createdAt: string;
};

function readJson<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) as T : fallback;
    } catch {
        return fallback;
    }
}

function writeJson<T>(key: string, value: T) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        /* noop */
    }
}

export function getRecentViews(): RecentView[] {
    return readJson<RecentView[]>(RECENT_VIEWS_KEY, []);
}

export function pushRecentView(view: RecentView) {
    const next = getRecentViews().filter((item) => item.id !== view.id);
    next.unshift(view);
    writeJson(RECENT_VIEWS_KEY, next.slice(0, 8));
}

export function getSavedSearchDrafts(): SavedSearchDraft[] {
    return readJson<SavedSearchDraft[]>(SAVED_SEARCHES_KEY, []);
}

export function pushSavedSearchDraft(entry: Omit<SavedSearchDraft, 'id' | 'createdAt'>) {
    const next = getSavedSearchDrafts().filter((item) => item.query.toLowerCase() !== entry.query.toLowerCase());
    next.unshift({
        ...entry,
        id: `${entry.query.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
        createdAt: new Date().toISOString(),
    });
    writeJson(SAVED_SEARCHES_KEY, next.slice(0, 10));
}

export function removeSavedSearchDraft(id: string) {
    const next = getSavedSearchDrafts().filter((item) => item.id !== id);
    writeJson(SAVED_SEARCHES_KEY, next);
}

export function getInterests(): ContentType[] {
    return readJson<ContentType[]>(INTERESTS_KEY, []);
}

export function setInterests(items: ContentType[]) {
    writeJson(INTERESTS_KEY, items);
}
