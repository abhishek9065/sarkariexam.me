import type { ContentType } from '../types';

export type DetailSource =
    | 'home'
    | 'category'
    | 'search_overlay'
    | 'bookmarks'
    | 'profile'
    | 'admin'
    | 'section_table'
    | 'related'
    | 'recommendations'
    | 'tracker';

type QueryValue = string | number | boolean | null | undefined;

export function buildTrackedDetailPath(
    type: ContentType,
    slug: string,
    source: DetailSource,
    query?: Record<string, QueryValue>
): string {
    const params = new URLSearchParams();
    params.set('source', source);

    if (query) {
        for (const [key, value] of Object.entries(query)) {
            if (value === undefined || value === null || value === '') continue;
            params.set(key, String(value));
        }
    }

    return `/${type}/${slug}?${params.toString()}`;
}

