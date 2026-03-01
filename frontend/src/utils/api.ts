import type {
    AdminPermissionsSnapshot,
    Announcement,
    AnnouncementCard,
    AuthResponse,
    ContentType,
    PaginatedResponse,
    SearchSuggestion,
    Tag,
} from '../types';
import { reportClientError } from './reportClientError';

/* ─── Base URL ─── */
const normalizeBase = (value: string) => value.trim().replace(/\/+$/, '');
const configuredApiBase = import.meta.env.VITE_API_BASE
    ? `${normalizeBase(String(import.meta.env.VITE_API_BASE))}/api`
    : null;

const resolveSiblingApiBase = (): string | null => {
    if (typeof window === 'undefined') return null;
    const host = window.location.hostname.toLowerCase();
    if (host === 'www.sarkariexams.me') return 'https://sarkariexams.me/api';
    if (host === 'sarkariexams.me') return 'https://www.sarkariexams.me/api';
    return null;
};

const API_BASE_CANDIDATES = (() => {
    const siblingApiBase = resolveSiblingApiBase();
    const candidates = [
        ...(configuredApiBase ? [configuredApiBase] : []),
        '/api',
        ...(siblingApiBase ? [siblingApiBase] : []),
    ];

    const seen = new Set<string>();
    const unique: string[] = [];
    for (const candidate of candidates) {
        const normalized = normalizeBase(candidate);
        if (seen.has(normalized)) continue;
        seen.add(normalized);
        unique.push(normalized);
    }
    return unique;
})();
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

/* ─── Token helpers ─── */
let authToken: string | null = localStorage.getItem('token');
let csrfTokenCache: string | null = null;

export function setAuthToken(token: string | null) {
    authToken = token;
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
}

export function getAuthToken() {
    return authToken;
}

function readCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
    if (!match) return null;
    try {
        return decodeURIComponent(match[1]);
    } catch {
        return match[1];
    }
}

/* ─── Generic fetch wrapper ─── */
export class ApiRequestError extends Error {
    status: number;
    body: unknown;
    constructor(status: number, body: unknown) {
        super(typeof body === 'object' && body && 'error' in (body as Record<string, unknown>)
            ? String((body as Record<string, unknown>).error)
            : `Request failed (${status})`);
        this.status = status;
        this.body = body;
    }
}

async function parseResponseBody(res: Response): Promise<unknown> {
    try {
        return await res.json();
    } catch {
        return null;
    }
}

function isRetryableNetworkError(error: unknown): boolean {
    return error instanceof TypeError;
}

function reportApiClientError(path: string, message: string, note: string, dedupeKey: string) {
    void reportClientError({
        errorId: 'frontend_api_failure',
        message,
        note: `${note} (${path})`,
        dedupeKey,
    });
}

async function fetchWithBaseFallback(path: string, init: RequestInit): Promise<Response> {
    let lastError: unknown = null;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'unknown_origin';
    const candidateSummary = API_BASE_CANDIDATES.join(', ');

    for (const base of API_BASE_CANDIDATES) {
        try {
            return await fetch(`${base}${path}`, init);
        } catch (error) {
            lastError = error;
            if (!isRetryableNetworkError(error)) {
                throw error;
            }
        }
    }

    if (lastError instanceof Error) {
        reportApiClientError(
            path,
            lastError.message || 'Network request failed',
            `All API base candidates failed to respond. origin=${origin}, candidates=${candidateSummary}`,
            `api_network:${path}`,
        );
        throw lastError;
    }

    reportApiClientError(
        path,
        'Failed to fetch',
        `All API base candidates failed without a concrete error object. origin=${origin}, candidates=${candidateSummary}`,
        `api_network:${path}`,
    );
    throw new TypeError('Failed to fetch');
}

async function ensureCsrfToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh) {
        const cookieToken = readCookie(CSRF_COOKIE_NAME);
        if (cookieToken) {
            csrfTokenCache = cookieToken;
            return cookieToken;
        }
        if (csrfTokenCache) return csrfTokenCache;
    }

    const res = await fetchWithBaseFallback('/auth/csrf', {
        method: 'GET',
        credentials: 'include',
    });

    if (!res.ok) {
        const body = await parseResponseBody(res);
        throw new ApiRequestError(res.status, body);
    }

    const body = await parseResponseBody(res) as { data?: { csrfToken?: string } } | null;
    const csrfToken = body?.data?.csrfToken || readCookie(CSRF_COOKIE_NAME);
    if (!csrfToken) {
        throw new Error('Unable to initialize CSRF token');
    }
    csrfTokenCache = csrfToken;
    return csrfToken;
}

function isCsrfInvalid(error: unknown): boolean {
    if (!(error instanceof ApiRequestError) || error.status !== 403) return false;
    const body = error.body as Record<string, unknown> | null;
    return body?.error === 'csrf_invalid';
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string> || {}),
    };

    if (options.body) {
        headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    const res = await fetchWithBaseFallback(path, { ...options, headers, credentials: 'include' });

    if (!res.ok) {
        const body = await parseResponseBody(res);
        if (res.status >= 500) {
            reportApiClientError(
                path,
                `API responded with ${res.status}`,
                'Server-side API error response',
                `api_http_${res.status}:${path}`,
            );
        }
        throw new ApiRequestError(res.status, body);
    }

    if (res.status === 204) return undefined as T;
    return parseResponseBody(res) as Promise<T>;
}

async function apiFetchWithCsrf<T>(path: string, options: RequestInit = {}): Promise<T> {
    const requestWithCsrf = async (forceRefreshToken = false): Promise<T> => {
        const csrfToken = await ensureCsrfToken(forceRefreshToken);
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string> || {}),
            [CSRF_HEADER_NAME]: csrfToken,
        };

        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const res = await fetchWithBaseFallback(path, { ...options, headers, credentials: 'include' });
        if (!res.ok) {
            const body = await parseResponseBody(res);
            if (res.status >= 500) {
                reportApiClientError(
                    path,
                    `API responded with ${res.status}`,
                    'Server-side API error response (CSRF flow)',
                    `api_http_csrf_${res.status}:${path}`,
                );
            }
            throw new ApiRequestError(res.status, body);
        }

        if (res.status === 204) return undefined as T;
        return parseResponseBody(res) as Promise<T>;
    };

    try {
        return await requestWithCsrf(false);
    } catch (error) {
        if (isCsrfInvalid(error)) {
            return requestWithCsrf(true);
        }
        throw error;
    }
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

function toQueryString(params: Record<string, string | number | undefined>): string {
    const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
    if (entries.length === 0) return '';
    return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
}

/** Fetch announcements — offset-based (v1) */
export function getAnnouncements(filters: AnnouncementFilters = {}) {
    const qs = toQueryString(filters as Record<string, string | number | undefined>);
    return apiFetch<{ data: Announcement[]; total: number }>(`/announcements${qs}`);
}

/** Fetch listing cards — cursor-based (v3, lightweight) */
export function getAnnouncementCards(filters: AnnouncementFilters = {}) {
    const qs = toQueryString(filters as Record<string, string | number | undefined>);
    return apiFetch<PaginatedResponse<AnnouncementCard>>(`/announcements/v3/cards${qs}`);
}

/** Fetch single announcement by slug */
export function getAnnouncementBySlug(_type: ContentType, slug: string) {
    return apiFetch<{ data: Announcement }>(`/announcements/${slug}`);
}

/** Get categories */
export function getCategories() {
    return apiFetch<{ data: string[] }>('/announcements/meta/categories');
}

/** Get organizations */
export function getOrganizations() {
    return apiFetch<{ data: string[] }>('/announcements/meta/organizations');
}

/** Get tags */
export function getTags() {
    return apiFetch<{ data: Tag[] }>('/announcements/meta/tags');
}

/** Search suggestions */
export function getSearchSuggestions(q: string, type?: ContentType) {
    const qs = toQueryString({ q, type, limit: 8 });
    return apiFetch<{ data: SearchSuggestion[] }>(`/announcements/search/suggest${qs}`);
}

/** Trending searches */
export function getTrendingSearches(days = 30, limit = 8) {
    const qs = toQueryString({ days, limit });
    return apiFetch<{ data: Array<{ query: string; count: number }> }>(`/announcements/search/trending${qs}`);
}

/* ─── Auth ─── */
export function login(email: string, password: string, twoFactorCode?: string) {
    return apiFetchWithCsrf<{ data: AuthResponse }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, ...(twoFactorCode ? { twoFactorCode } : {}) }),
    });
}

export function register(email: string, name: string, password: string) {
    return apiFetchWithCsrf<{ data: AuthResponse }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, name, password }),
    });
}

export function getMe() {
    return apiFetch<{ data: { user: User } }>('/auth/me');
}

export function getAdminPermissions() {
    return apiFetch<{ data: AdminPermissionsSnapshot }>('/auth/admin/permissions');
}

export function logout() {
    return apiFetchWithCsrf<{ message: string }>('/auth/logout', {
        method: 'POST',
    });
}

/* ─── Bookmarks ─── */
export function getBookmarks() {
    return apiFetch<{ data: Announcement[] }>('/bookmarks');
}

export function addBookmark(announcementId: string) {
    return apiFetchWithCsrf<{ message: string }>('/bookmarks', {
        method: 'POST',
        body: JSON.stringify({ announcementId }),
    });
}

export function removeBookmark(announcementId: string) {
    return apiFetchWithCsrf<void>(`/bookmarks/${announcementId}`, { method: 'DELETE' });
}

/* ─── Profile utility ─── */
export interface ProfileWidgetData {
    trackedCounts: Record<string, number>;
    upcomingDeadlines: Array<{
        id: string;
        slug: string;
        title: string;
        type: ContentType;
        deadline: string;
        status: string;
        daysRemaining: number;
    }>;
    recommendationCount: number;
    savedSearchMatches: number;
    generatedAt: string;
    windowDays: number;
}

export interface SavedSearchItem {
    id: string;
    name: string;
    query: string;
    frequency: 'instant' | 'daily' | 'weekly';
    notificationsEnabled: boolean;
    updatedAt: string;
}

export interface UserNotificationItem {
    id: string;
    title: string;
    type: ContentType;
    slug?: string;
    source: string;
    createdAt: string;
    readAt?: string | null;
}

export interface TrackedApplicationItem {
    id: string;
    slug: string;
    title: string;
    type: ContentType;
    status: string;
    deadline?: string | null;
    updatedAt?: string | null;
}

export function getProfileWidgets(windowDays = 7) {
    const qs = toQueryString({ windowDays });
    return apiFetch<{ data: ProfileWidgetData }>(`/profile/widgets${qs}`);
}

export function getProfileSavedSearches() {
    return apiFetch<{ data: SavedSearchItem[] }>('/profile/saved-searches');
}

export function getProfileNotifications(limit = 12) {
    const qs = toQueryString({ limit });
    return apiFetch<{ data: UserNotificationItem[]; unreadCount: number }>(`/profile/notifications${qs}`);
}

export function getTrackedApplications() {
    return apiFetch<{ data: TrackedApplicationItem[] }>('/profile/tracked-applications');
}

/* ─── Re-export types for convenience ─── */
import type { User } from '../types';
export type { User };

