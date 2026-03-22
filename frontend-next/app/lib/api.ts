import type {
    Announcement,
    AnnouncementCard,
    AuthResponse,
    ContentType,
    HomepageFeedData,
    PaginatedResponse,
    SearchSuggestion,
    Tag,
    User,
} from './types';
import { API_PATHS } from './apiPaths';
import { getApiBaseCandidates } from './apiBase';

/* ─── Base URL ─── */
const API_BASE_CANDIDATES = getApiBaseCandidates(null);
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

let csrfTokenCache: string | null = null;

function readCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
    if (!match) return null;
    try { return decodeURIComponent(match[1]); } catch { return match[1]; }
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
    try { return await res.json(); } catch { return null; }
}

function isRetryableNetworkError(error: unknown): boolean {
    return error instanceof TypeError;
}

async function fetchWithBaseFallback(path: string, init: RequestInit): Promise<Response> {
    let lastError: unknown = null;
    for (const base of API_BASE_CANDIDATES) {
        try {
            return await fetch(`${base}${path}`, init);
        } catch (error) {
            lastError = error;
            if (!isRetryableNetworkError(error)) throw error;
        }
    }
    throw lastError instanceof Error ? lastError : new TypeError('Failed to fetch');
}

async function ensureCsrfToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh) {
        const cookieToken = readCookie(CSRF_COOKIE_NAME);
        if (cookieToken) { csrfTokenCache = cookieToken; return cookieToken; }
        if (csrfTokenCache) return csrfTokenCache;
    }
    const res = await fetchWithBaseFallback(API_PATHS.authCsrf, { method: 'GET', credentials: 'include' });
    if (!res.ok) { const body = await parseResponseBody(res); throw new ApiRequestError(res.status, body); }
    const body = await parseResponseBody(res) as { data?: { csrfToken?: string } } | null;
    const csrfToken = body?.data?.csrfToken || readCookie(CSRF_COOKIE_NAME);
    if (!csrfToken) throw new Error('Unable to initialize CSRF token');
    csrfTokenCache = csrfToken;
    return csrfToken;
}

function isCsrfInvalid(error: unknown): boolean {
    if (!(error instanceof ApiRequestError) || error.status !== 403) return false;
    return (error.body as Record<string, unknown> | null)?.error === 'csrf_invalid';
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = { ...(options.headers as Record<string, string> || {}) };
    if (options.body) headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    const res = await fetchWithBaseFallback(path, { ...options, headers, credentials: 'include' });
    if (!res.ok) { const body = await parseResponseBody(res); throw new ApiRequestError(res.status, body); }
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
        const res = await fetchWithBaseFallback(path, { ...options, headers, credentials: 'include' });
        if (!res.ok) { const body = await parseResponseBody(res); throw new ApiRequestError(res.status, body); }
        if (res.status === 204) return undefined as T;
        return parseResponseBody(res) as Promise<T>;
    };
    try { return await requestWithCsrf(false); }
    catch (error) { if (isCsrfInvalid(error)) return requestWithCsrf(true); throw error; }
}

/* ─── Query string helper ─── */
function toQueryString(params: Record<string, string | number | undefined>): string {
    const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
    if (entries.length === 0) return '';
    return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
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
    return apiFetch<{ data: HomepageFeedData }>(API_PATHS.announcementsHomepage);
}

export function getAnnouncementCards(filters: AnnouncementFilters = {}) {
    const qs = toQueryString(filters as Record<string, string | number | undefined>);
    return apiFetch<PaginatedResponse<AnnouncementCard>>(`${API_PATHS.announcementCardsV3}${qs}`);
}

export function getAnnouncementBySlug(_type: ContentType, slug: string) {
    return apiFetch<{ data: Announcement }>(`/announcements/${slug}`);
}

export function getCategories() {
    return apiFetch<{ data: string[] }>(API_PATHS.announcementMetaCategories);
}

export function getOrganizations() {
    return apiFetch<{ data: string[] }>(API_PATHS.announcementMetaOrganizations);
}

export function getTags() {
    return apiFetch<{ data: Tag[] }>(API_PATHS.announcementMetaTags);
}

export function getSearchSuggestions(q: string, type?: ContentType) {
    const qs = toQueryString({ q, type, limit: 8 });
    return apiFetch<{ data: SearchSuggestion[] }>(`/announcements/search/suggest${qs}`);
}

export function getTrendingSearches(days = 30, limit = 8) {
    const qs = toQueryString({ days, limit });
    return apiFetch<{ data: Array<{ query: string; count: number }> }>(`/announcements/search/trending${qs}`);
}

/* ─── Auth ─── */
export function login(email: string, password?: string, twoFactorCode?: string, challengeToken?: string) {
    return apiFetchWithCsrf<{ data: AuthResponse }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, ...(password ? { password } : {}), ...(challengeToken ? { challengeToken } : {}), ...(twoFactorCode ? { twoFactorCode } : {}) }),
    });
}

export function register(email: string, name: string, password: string) {
    return apiFetchWithCsrf<{ data: AuthResponse }>('/auth/register', {
        method: 'POST', body: JSON.stringify({ email, name, password }),
    });
}

export function getMe() {
    return apiFetch<{ data: { user: User } }>('/auth/me');
}

export function logout() {
    return apiFetchWithCsrf<{ message: string }>('/auth/logout', { method: 'POST' });
}

/* ─── Bookmarks ─── */
export function getBookmarks() {
    return apiFetch<{ data: Announcement[] }>('/bookmarks');
}

export function getBookmarkIds() {
    return apiFetch<{ data: string[] }>('/bookmarks/ids');
}

export function addBookmark(announcementId: string) {
    return apiFetchWithCsrf<{ message: string }>('/bookmarks', {
        method: 'POST', body: JSON.stringify({ announcementId }),
    });
}

export function removeBookmark(announcementId: string) {
    return apiFetchWithCsrf<void>(`/bookmarks/${announcementId}`, { method: 'DELETE' });
}

/* ─── Token helpers ─── */
export function setAuthToken(token: string | null) {
    void token;
    // Cookie-based auth — no-op in Next.js
}

/* ─── Profile ─── */
export interface ProfileWidgetData {
    trackedCounts: Record<string, number>;
    upcomingDeadlines: Array<{
        id: string; slug: string; title: string; type: ContentType;
        deadline: string; status: string; daysRemaining: number;
    }>;
    recommendationCount: number;
    savedSearchMatches: number;
    generatedAt: string;
    windowDays: number;
}

export interface SavedSearchItem {
    id: string; name: string; query: string;
    frequency: 'instant' | 'daily' | 'weekly';
    notificationsEnabled: boolean; updatedAt: string;
}

export interface UserNotificationItem {
    id: string; title: string; type: ContentType;
    slug?: string; source: string; createdAt: string; readAt?: string | null;
}

export interface TrackedApplicationItem {
    id: string; slug: string; title: string; type: ContentType;
    status: string; deadline?: string | null; updatedAt?: string | null;
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

/* ─── Subscriptions ─── */
export function verifySubscriptionToken(token: string) {
    const qs = toQueryString({ token });
    return apiFetch<{ message: string }>(`${API_PATHS.subscriptionsVerify}${qs}`);
}

export function unsubscribeSubscriptionToken(token: string) {
    const qs = toQueryString({ token });
    return apiFetch<{ message: string }>(`${API_PATHS.subscriptionsUnsubscribe}${qs}`);
}

export type { User };

