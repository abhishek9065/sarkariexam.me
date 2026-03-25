import type { ContentType, HomepageFeedData, SearchSuggestion } from '../types';

type ApiResponse<T> = { data: T };

function getApiBaseCandidates(): string[] {
    if (typeof window === 'undefined') {
        return ['http://localhost:8080/api'];
    }

    const envBase = (window as Window & { __API_BASE_URL__?: string }).__API_BASE_URL__;
    const origin = window.location.origin;
    const defaults = [`${origin}/api`, 'http://localhost:8080/api'];
    return [envBase, ...defaults].filter((base): base is string => Boolean(base));
}

async function fetchWithBaseFallback(path: string, init?: RequestInit): Promise<Response> {
    let lastError: unknown;
    for (const base of getApiBaseCandidates()) {
        try {
            return await fetch(`${base}${path}`, { credentials: 'include', ...init });
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError instanceof Error ? lastError : new Error('Request failed');
}

async function apiFetch<T>(path: string): Promise<ApiResponse<T>> {
    const response = await fetchWithBaseFallback(path);
    if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
    }
    return response.json() as Promise<ApiResponse<T>>;
}

function toQuery(params: Record<string, string | number | undefined>) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === '') return;
        search.set(key, String(value));
    });
    const serialized = search.toString();
    return serialized ? `?${serialized}` : '';
}

export function getHomepageFeed() {
    return apiFetch<HomepageFeedData>('/announcements/homepage');
}

export function getBookmarkIds() {
    return apiFetch<string[]>('/bookmarks/ids');
}

export function getSearchSuggestions(q: string, type?: ContentType) {
    const query = toQuery({ q, type, limit: 8 });
    return apiFetch<SearchSuggestion[]>(`/announcements/search/suggest${query}`);
}
