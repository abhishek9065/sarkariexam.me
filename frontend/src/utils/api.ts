import { API_BASE } from './constants';
import type { Announcement, AnnouncementCard, ContentType } from '../types';
import type { paths } from '../types/api';

type AnnouncementCardsResponse =
    paths['/api/announcements/v3/cards']['get']['responses'][200]['content']['application/json'];

interface AnnouncementCardQuery {
    type?: ContentType;
    category?: string;
    search?: string;
    organization?: string;
    location?: string;
    qualification?: string;
    sort?: 'newest' | 'oldest' | 'deadline';
    limit?: number;
    cursor?: string | null;
}

// Fetch a single page of announcement cards (cursor-based)
export async function fetchAnnouncementCardsPage(
    query: AnnouncementCardQuery = {}
): Promise<AnnouncementCardsResponse> {
    const params = new URLSearchParams();
    if (query.type) params.set('type', query.type);
    if (query.category) params.set('category', query.category);
    if (query.search) params.set('search', query.search);
    if (query.organization) params.set('organization', query.organization);
    if (query.location) params.set('location', query.location);
    if (query.qualification) params.set('qualification', query.qualification);
    if (query.sort) params.set('sort', query.sort);
    if (query.limit) params.set('limit', String(query.limit));
    if (query.cursor) params.set('cursor', query.cursor);

    const response = await fetch(`${API_BASE}/api/announcements/v3/cards?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch announcement cards');
    return response.json() as Promise<AnnouncementCardsResponse>;
}

async function fetchCardPages(query: AnnouncementCardQuery, maxItems: number): Promise<AnnouncementCard[]> {
    const items: AnnouncementCard[] = [];
    let cursor: string | null = null;
    const pageSize = Math.min(50, maxItems);

    while (items.length < maxItems) {
        const page = await fetchAnnouncementCardsPage({
            ...query,
            limit: Math.min(pageSize, maxItems - items.length),
            cursor,
        });

        items.push(...page.data);

        if (!page.hasMore || !page.nextCursor) {
            break;
        }

        cursor = page.nextCursor;
    }

    return items;
}

// Fetch announcement cards across types for listing views
export async function fetchAnnouncements(maxItems = 150): Promise<Announcement[]> {
    return fetchCardPages({}, maxItems) as Promise<Announcement[]>;
}

// Fetch announcement cards by type
export async function fetchAnnouncementsByType(type: ContentType, maxItems = 100): Promise<Announcement[]> {
    return fetchCardPages({ type }, maxItems) as Promise<Announcement[]>;
}

// Fetch single announcement by slug
export async function fetchAnnouncementBySlug(slug: string, query?: string | URLSearchParams): Promise<Announcement | null> {
    const queryString = typeof query === 'string'
        ? query
        : query
            ? `?${query.toString()}`
            : '';
    const normalizedQuery = queryString && !queryString.startsWith('?')
        ? `?${queryString}`
        : queryString;
    const response = await fetch(`${API_BASE}/api/announcements/${slug}${normalizedQuery}`);
    if (!response.ok) return null;
    const body = await response.json() as { data: Announcement };
    return body.data;
}

// Fetch user bookmarks
export async function fetchBookmarks(token: string): Promise<Announcement[]> {
    const response = await fetch(`${API_BASE}/api/bookmarks`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) return [];
    const body = await response.json() as { data: Announcement[]; count: number };
    return body.data;
}

// Add bookmark
export async function addBookmark(announcementId: string, token: string): Promise<boolean> {
    const response = await fetch(`${API_BASE}/api/bookmarks`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ announcementId })
    });
    return response.ok;
}

// Remove bookmark
export async function removeBookmark(announcementId: string, token: string): Promise<boolean> {
    const response = await fetch(`${API_BASE}/api/bookmarks/${announcementId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.ok;
}

// Subscribe to push notifications
export async function subscribeToPush(subscription: PushSubscription): Promise<boolean> {
    const response = await fetch(`${API_BASE}/api/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON())
    });
    return response.ok;
}
