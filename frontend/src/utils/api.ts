import { API_BASE } from './constants';
import { filterMockAnnouncements, findMockBySlug, mockAnnouncements } from './mockData';
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
    try {
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

        const response = await fetch(`${API_BASE}/api/announcements/v3/cards?${params.toString()}`, {
            signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<AnnouncementCardsResponse>;
    } catch (error) {
        console.warn('Backend unavailable, using mock data:', error);
        // Fallback to mock data
        const mockData = filterMockAnnouncements({
            type: query.type,
            search: query.search,
            category: query.category,
            organization: query.organization,
            limit: query.limit || 50
        });
        return {
            data: mockData as AnnouncementCard[],
            hasMore: false,
            nextCursor: null
        };
    }
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
    try {
        return await fetchCardPages({}, maxItems);
    } catch (error) {
        console.warn('Using mock data for fetchAnnouncements:', error);
        return filterMockAnnouncements({ limit: maxItems });
    }
}

// Fetch announcement cards by type
export async function fetchAnnouncementsByType(type: ContentType, maxItems = 100): Promise<Announcement[]> {
    try {
        return await fetchCardPages({ type }, maxItems);
    } catch (error) {
        console.warn('Using mock data for fetchAnnouncementsByType:', error);
        return filterMockAnnouncements({ type, limit: maxItems });
    }
}

// Fetch single announcement by slug
export async function fetchAnnouncementBySlug(slug: string, query?: string | URLSearchParams): Promise<Announcement | null> {
    try {
        const queryString = typeof query === 'string'
            ? query
            : query
                ? `?${query.toString()}`
                : '';
        const normalizedQuery = queryString && !queryString.startsWith('?')
            ? `?${queryString}`
            : queryString;
        const response = await fetch(`${API_BASE}/api/announcements/${slug}${normalizedQuery}`, {
            signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const body = await response.json() as { data: Announcement };
        return body.data;
    } catch (error) {
        console.warn('Backend unavailable for slug fetch, using mock data:', error);
        // Fallback to mock data
        return findMockBySlug(slug);
    }
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
