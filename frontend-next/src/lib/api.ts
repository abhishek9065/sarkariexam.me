import type {
    Announcement,
    AnnouncementCard,
    ContentType,
    HomepageFeedData,
    PaginatedResponse,
    SearchSuggestion,
    Tag,
    AuthResponse,
    User,
} from './types';

/* ─── Base URL ─── */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000/api';

/* ─── Query string helper ─── */
function toQueryString(params: Record<string, string | number | undefined>): string {
    const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
    if (entries.length === 0) return '';
    return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
}

/* ─── Server-side fetch (for SSR - no CSRF needed) ─── */
async function serverFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE}${path}`;
    const res = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
        next: { revalidate: 60 }, // cache for 60 seconds
    });

    if (!res.ok) {
        throw new Error(`API error: ${res.status} ${res.statusText}`);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
}

/* ─── Announcements ─── */
export interface AnnouncementFilters {
    type?: ContentType;
    search?: string;
    category?: string;
    organization?: string;
    location?: string;
    qualification?: string;
    sort?: 'newest' | 'oldest' | 'deadline' | 'views';
    limit?: number;
    offset?: number;
    cursor?: string;
}

export function getHomepageFeed() {
    return serverFetch<{ data: HomepageFeedData }>('/announcements/homepage');
}

export function getAnnouncementCards(filters: AnnouncementFilters = {}) {
    const qs = toQueryString(filters as Record<string, string | number | undefined>);
    return serverFetch<PaginatedResponse<AnnouncementCard>>(`/announcements/v3/cards${qs}`);
}

export function getAnnouncementBySlug(type: ContentType, slug: string) {
    return serverFetch<{ data: Announcement }>(`/announcements/${slug}`);
}

export function getCategories() {
    return serverFetch<{ data: string[] }>('/announcements/meta/categories');
}

export function getOrganizations() {
    return serverFetch<{ data: string[] }>('/announcements/meta/organizations');
}

export function getTags() {
    return serverFetch<{ data: Tag[] }>('/announcements/meta/tags');
}

export function getSearchSuggestions(q: string, type?: ContentType) {
    const qs = toQueryString({ q, type, limit: 8 });
    return serverFetch<{ data: SearchSuggestion[] }>(`/announcements/search/suggest${qs}`);
}

export function getTrendingSearches(days = 30, limit = 8) {
    const qs = toQueryString({ days, limit });
    return serverFetch<{ data: Array<{ query: string; count: number }> }>(`/announcements/search/trending${qs}`);
}

/* ─── Client-side fetch (with CSRF for mutations) ─── */
let csrfTokenCache: string | null = null;
const CSRF_HEADER_NAME = 'X-CSRF-Token';

async function ensureCsrfToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh && csrfTokenCache) return csrfTokenCache;

    const res = await fetch(`${API_BASE}/auth/csrf`, { method: 'GET', credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch CSRF token');
    
    const body = await res.json();
    const csrfToken = body?.data?.csrfToken;
    if (!csrfToken) throw new Error('Unable to initialize CSRF token');
    
    csrfTokenCache = csrfToken;
    return csrfToken;
}

async function clientFetchAuth<T>(path: string, options: RequestInit = {}): Promise<T> {
    const requestWithCsrf = async (forceRefreshToken = false): Promise<T> => {
        const csrfToken = await ensureCsrfToken(forceRefreshToken);
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string> || {}),
            [CSRF_HEADER_NAME]: csrfToken,
        };

        const res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' });
        
        if (!res.ok) {
            const body = await res.json().catch(() => null);
            if (res.status === 403 && body?.error === 'csrf_invalid') {
                throw new Error('csrf_invalid');
            }
            throw new Error(`API error: ${res.status} ${body?.error || res.statusText}`);
        }

        if (res.status === 204) return undefined as T;
        return res.json() as Promise<T>;
    };

    try {
        return await requestWithCsrf(false);
    } catch (error: any) {
        if (error.message === 'csrf_invalid') {
            return requestWithCsrf(true); // Retry with fresh token
        }
        throw error;
    }
}

/* ─── Auth ─── */
export function login(email: string, password?: string, twoFactorCode?: string, challengeToken?: string) {
    return clientFetchAuth<{ data: AuthResponse }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, challengeToken, twoFactorCode }),
    });
}

export function register(email: string, name: string, password: string) {
    return clientFetchAuth<{ data: AuthResponse }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, name, password }),
    });
}

export function getMe() {
    return fetch(`${API_BASE}/auth/me`, { credentials: 'include' })
        .then(res => res.ok ? res.json() : null) as Promise<{ data: { user: User } } | null>;
}

export function logout() {
    return clientFetchAuth<{ message: string }>('/auth/logout', { method: 'POST' });
}

/* ─── Profile ─── */
export function getBookmarks() {
    return fetch(`${API_BASE}/bookmarks`, { credentials: 'include' })
        .then(res => res.ok ? res.json() : null) as Promise<{ data: Announcement[] } | null>;
}

