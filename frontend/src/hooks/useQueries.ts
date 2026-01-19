import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_BASE } from '../utils/constants';
import type { Announcement, ContentType } from '../types';

// Query keys for cache management
export const queryKeys = {
    announcements: ['announcements'] as const,
    announcementsByType: (type: ContentType) => ['announcements', type] as const,
    announcementBySlug: (slug: string) => ['announcement', slug] as const,
    bookmarks: ['bookmarks'] as const,
    analytics: ['analytics'] as const,
};

// Fetch all announcements
export function useAnnouncements() {
    return useQuery({
        queryKey: queryKeys.announcements,
        queryFn: async (): Promise<Announcement[]> => {
            const res = await fetch(`${API_BASE}/api/announcements`);
            if (!res.ok) throw new Error('Failed to fetch announcements');
            const body = await res.json();
            return body.data ?? [];
        },
    });
}

// Fetch announcements by type
export function useAnnouncementsByType(type: ContentType) {
    return useQuery({
        queryKey: queryKeys.announcementsByType(type),
        queryFn: async (): Promise<Announcement[]> => {
            const res = await fetch(`${API_BASE}/api/announcements?type=${type}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const body = await res.json();
            return body.data ?? [];
        },
    });
}

// Fetch single announcement by slug
export function useAnnouncementBySlug(slug: string | undefined) {
    return useQuery({
        queryKey: queryKeys.announcementBySlug(slug || ''),
        queryFn: async (): Promise<Announcement | null> => {
            if (!slug) return null;
            const res = await fetch(`${API_BASE}/api/announcements/${slug}`);
            if (!res.ok) return null;
            const body = await res.json();
            return body.data ?? null;
        },
        enabled: !!slug,
    });
}

// Fetch bookmarks (requires auth token)
export function useBookmarksQuery(token: string | null) {
    return useQuery({
        queryKey: queryKeys.bookmarks,
        queryFn: async (): Promise<Announcement[]> => {
            if (!token) return [];
            const res = await fetch(`${API_BASE}/api/bookmarks`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return [];
            const body = await res.json();
            return body.data ?? [];
        },
        enabled: !!token,
    });
}

// Add bookmark mutation
export function useAddBookmark() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ announcementId, token }: { announcementId: string; token: string }) => {
            const res = await fetch(`${API_BASE}/api/bookmarks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ announcementId }),
            });
            if (!res.ok) throw new Error('Failed to add bookmark');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.bookmarks });
        },
    });
}

// Remove bookmark mutation
export function useRemoveBookmark() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ announcementId, token }: { announcementId: string; token: string }) => {
            const res = await fetch(`${API_BASE}/api/bookmarks/${announcementId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to remove bookmark');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.bookmarks });
        },
    });
}

// Search announcements
export function useSearchAnnouncements(query: string) {
    return useQuery({
        queryKey: ['search', query],
        queryFn: async (): Promise<Announcement[]> => {
            if (!query || query.length < 2) return [];
            const res = await fetch(`${API_BASE}/api/announcements/search?q=${encodeURIComponent(query)}`);
            if (!res.ok) return [];
            const body = await res.json();
            return body.data ?? [];
        },
        enabled: query.length >= 2,
        staleTime: 2 * 60 * 1000, // 2 min for search
    });
}

// Prefetch helper for navigation
export function usePrefetchAnnouncement() {
    const queryClient = useQueryClient();

    return (slug: string) => {
        queryClient.prefetchQuery({
            queryKey: queryKeys.announcementBySlug(slug),
            queryFn: async () => {
                const res = await fetch(`${API_BASE}/api/announcements/${slug}`);
                const body = await res.json();
                return body.data ?? null;
            },
        });
    };
}
