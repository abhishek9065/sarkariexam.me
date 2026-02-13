import { API_BASE } from './constants';
import { filterMockAnnouncements, findMockBySlug } from './mockData';
import { fetchJson } from './http';
import type {
    Announcement,
    AnnouncementCard,
    ContentType,
    DashboardWidgetPayload,
    SearchSuggestion,
    TrackedApplication,
    TrackerStatus,
} from '../types';
import type { paths } from '../types/api';

type AnnouncementCardsResponse =
    paths['/api/announcements/v3/cards']['get']['responses'][200]['content']['application/json'];

const allowMockFallback = Boolean(import.meta.env.DEV);

const createBackendUnavailableError = (operation: string, error: unknown) => {
    const reason = error instanceof Error ? error.message : 'unknown error';
    return new Error(`[API] ${operation} failed: ${reason}`);
};

interface AnnouncementCardQuery {
    type?: ContentType;
    category?: string | string[];
    search?: string;
    organization?: string | string[];
    location?: string;
    qualification?: string;
    salaryMin?: number;
    salaryMax?: number;
    ageMin?: number;
    ageMax?: number;
    sort?: 'newest' | 'oldest' | 'deadline' | 'views';
    limit?: number;
    cursor?: string | null;
    prefetch?: boolean;
    source?: string;
}

function cardToAnnouncement(card: AnnouncementCard): Announcement {
    return {
        ...card,
        location: card.location ?? undefined,
        minQualification: card.minQualification ?? undefined,
        ageLimit: card.ageLimit ?? undefined,
        salaryMin: card.salaryMin ?? undefined,
        salaryMax: card.salaryMax ?? undefined,
        difficulty: card.difficulty ?? undefined,
        cutoffMarks: card.cutoffMarks ?? undefined,
        deadline: card.deadline ?? undefined,
        totalPosts: card.totalPosts ?? undefined,
    };
}

// Fetch a single page of announcement cards (cursor-based)
export async function fetchAnnouncementCardsPage(
    query: AnnouncementCardQuery = {}
): Promise<AnnouncementCardsResponse> {
    try {
        const params = new URLSearchParams();
        if (query.type) params.set('type', query.type);
        if (query.category) {
            const value = Array.isArray(query.category) ? query.category.join(',') : query.category;
            params.set('category', value);
        }
        if (query.search) params.set('search', query.search);
        if (query.organization) {
            const value = Array.isArray(query.organization) ? query.organization.join(',') : query.organization;
            params.set('organization', value);
        }
        if (query.location) params.set('location', query.location);
        if (query.qualification) params.set('qualification', query.qualification);
        if (query.salaryMin !== undefined) params.set('salaryMin', String(query.salaryMin));
        if (query.salaryMax !== undefined) params.set('salaryMax', String(query.salaryMax));
        if (query.ageMin !== undefined) params.set('ageMin', String(query.ageMin));
        if (query.ageMax !== undefined) params.set('ageMax', String(query.ageMax));
        if (query.sort) params.set('sort', query.sort);
        if (query.limit) params.set('limit', String(query.limit));
        if (query.cursor) params.set('cursor', query.cursor);
        if (query.prefetch) params.set('prefetch', '1');
        if (query.source) params.set('source', query.source);

        const body = await fetchJson<AnnouncementCardsResponse>(
            `${API_BASE}/api/announcements/v3/cards?${params.toString()}`,
            {},
            { timeoutMs: 6000, retries: 2 }
        );
        if (!Array.isArray(body.data)) {
            throw new Error('Invalid cards response');
        }
        return body;
    } catch (error) {
        if (!allowMockFallback) {
            throw createBackendUnavailableError('fetchAnnouncementCardsPage', error);
        }

        console.warn('Backend unavailable, using mock data (dev only):', error);
        // Fallback to mock data
        const mockData = filterMockAnnouncements({
            type: query.type,
            search: query.search,
            category: Array.isArray(query.category) ? undefined : query.category,
            organization: Array.isArray(query.organization) ? undefined : query.organization,
            limit: query.limit || 50
        });
        const filtered = mockData.filter((item) => {
            const categoryMatch = Array.isArray(query.category)
                ? query.category.includes(item.category)
                : true;
            const orgMatch = Array.isArray(query.organization)
                ? query.organization.includes(item.organization)
                : true;
            return categoryMatch && orgMatch;
        });
        return {
            data: filtered as AnnouncementCard[],
            hasMore: false,
            nextCursor: null
        };
    }
}

async function fetchCardPages(query: AnnouncementCardQuery, maxItems: number): Promise<Announcement[]> {
    const items: Announcement[] = [];
    let cursor: string | null = null;
    const pageSize = Math.min(50, maxItems);

    while (items.length < maxItems) {
        const page = await fetchAnnouncementCardsPage({
            ...query,
            limit: Math.min(pageSize, maxItems - items.length),
            cursor,
        });

        items.push(...page.data.map(cardToAnnouncement));

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
        if (!allowMockFallback) {
            throw createBackendUnavailableError('fetchAnnouncements', error);
        }
        console.warn('Using mock data for fetchAnnouncements (dev only):', error);
        return filterMockAnnouncements({ limit: maxItems });
    }
}

// Fetch announcement cards by type
export async function fetchAnnouncementsByType(type: ContentType, maxItems = 100): Promise<Announcement[]> {
    try {
        return await fetchCardPages({ type }, maxItems);
    } catch (error) {
        if (!allowMockFallback) {
            throw createBackendUnavailableError('fetchAnnouncementsByType', error);
        }
        console.warn('Using mock data for fetchAnnouncementsByType (dev only):', error);
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
        const body = await fetchJson<{ data: Announcement }>(
            `${API_BASE}/api/announcements/${slug}${normalizedQuery}`,
            {},
            { timeoutMs: 7000, retries: 2 }
        );
        return body.data;
    } catch (error) {
        if (!allowMockFallback) {
            throw createBackendUnavailableError('fetchAnnouncementBySlug', error);
        }
        console.warn('Backend unavailable for slug fetch, using mock data (dev only):', error);
        // Fallback to mock data
        return findMockBySlug(slug);
    }
}

// Fetch categories for filters
export async function fetchAnnouncementCategories(): Promise<string[]> {
    try {
        const body = await fetchJson<{ data: string[] }>(
            `${API_BASE}/api/announcements/meta/categories`,
            {},
            { timeoutMs: 6000, retries: 1 }
        );
        return body.data || [];
    } catch (error) {
        console.warn('Failed to fetch categories:', error);
        return [];
    }
}

// Fetch organizations for filters
export async function fetchAnnouncementOrganizations(): Promise<string[]> {
    try {
        const body = await fetchJson<{ data: string[] }>(
            `${API_BASE}/api/announcements/meta/organizations`,
            {},
            { timeoutMs: 6000, retries: 1 }
        );
        return body.data || [];
    } catch (error) {
        console.warn('Failed to fetch organizations:', error);
        return [];
    }
}

export async function fetchSearchSuggestions(query: string, options?: {
    type?: ContentType;
    limit?: number;
    source?: string;
}): Promise<SearchSuggestion[]> {
    const params = new URLSearchParams();
    params.set('q', query);
    if (options?.type) params.set('type', options.type);
    if (options?.limit !== undefined) params.set('limit', String(options.limit));
    if (options?.source) params.set('source', options.source);

    try {
        const body = await fetchJson<{ data: SearchSuggestion[] }>(
            `${API_BASE}/api/announcements/search/suggest?${params.toString()}`,
            {},
            { timeoutMs: 4000, retries: 1 }
        );
        return Array.isArray(body.data) ? body.data : [];
    } catch {
        return [];
    }
}

export async function fetchTrendingSearchTerms(options?: {
    days?: number;
    limit?: number;
}): Promise<Array<{ query: string; count: number }>> {
    const params = new URLSearchParams();
    if (options?.days !== undefined) params.set('days', String(options.days));
    if (options?.limit !== undefined) params.set('limit', String(options.limit));

    const queryString = params.toString();
    const path = queryString
        ? `${API_BASE}/api/announcements/search/trending?${queryString}`
        : `${API_BASE}/api/announcements/search/trending`;

    try {
        const body = await fetchJson<{ data: Array<{ query: string; count: number }> }>(
            path,
            {},
            { timeoutMs: 4000, retries: 1 }
        );
        return Array.isArray(body.data) ? body.data : [];
    } catch {
        return [];
    }
}

export async function fetchTrackedApplications(token: string): Promise<TrackedApplication[]> {
    const body = await fetchJson<{ data: TrackedApplication[] }>(
        `${API_BASE}/api/profile/tracked-applications`,
        {
            headers: { Authorization: `Bearer ${token}` },
        },
        { timeoutMs: 6000, retries: 1 }
    );
    return Array.isArray(body.data) ? body.data : [];
}

export async function createTrackedApplication(
    token: string,
    payload: {
        announcementId?: string;
        slug: string;
        type: ContentType;
        title: string;
        organization?: string;
        deadline?: string | null;
        status: TrackerStatus;
        notes?: string;
        reminderAt?: string | null;
    }
): Promise<TrackedApplication> {
    const body = await fetchJson<{ data: TrackedApplication }>(
        `${API_BASE}/api/profile/tracked-applications`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        },
        { timeoutMs: 7000, retries: 1 }
    );
    return body.data;
}

export async function updateTrackedApplication(
    token: string,
    id: string,
    payload: {
        status?: TrackerStatus;
        notes?: string;
        reminderAt?: string | null;
    }
): Promise<TrackedApplication> {
    const body = await fetchJson<{ data: TrackedApplication }>(
        `${API_BASE}/api/profile/tracked-applications/${id}`,
        {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        },
        { timeoutMs: 7000, retries: 1 }
    );
    return body.data;
}

export async function deleteTrackedApplication(token: string, id: string): Promise<void> {
    await fetchJson<{ message: string }>(
        `${API_BASE}/api/profile/tracked-applications/${id}`,
        {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        },
        { timeoutMs: 6000, retries: 1 }
    );
}

export async function importTrackedApplications(
    token: string,
    items: Array<{
        announcementId?: string;
        slug: string;
        type: ContentType;
        title: string;
        organization?: string;
        deadline?: string | null;
        status: TrackerStatus;
        notes?: string;
        reminderAt?: string | null;
        trackedAt?: string;
        updatedAt?: string;
    }>
): Promise<{ imported: number; skipped: number }> {
    return fetchJson<{ imported: number; skipped: number }>(
        `${API_BASE}/api/profile/tracked-applications/import`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ items }),
        },
        { timeoutMs: 8000, retries: 1 }
    );
}

export async function fetchDashboardWidgets(token: string, windowDays = 7): Promise<DashboardWidgetPayload> {
    const params = new URLSearchParams({ windowDays: String(windowDays) });
    const body = await fetchJson<{ data: DashboardWidgetPayload }>(
        `${API_BASE}/api/profile/widgets?${params.toString()}`,
        {
            headers: { Authorization: `Bearer ${token}` },
        },
        { timeoutMs: 6000, retries: 1 }
    );
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
