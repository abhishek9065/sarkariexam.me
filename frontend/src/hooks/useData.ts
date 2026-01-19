import { useState, useEffect, useCallback } from 'react';
import { fetchAnnouncements, fetchBookmarks, addBookmark, removeBookmark } from '../utils/api';
import type { Announcement } from '../types';
import { useAuth } from '../context/AuthContext';

// Hook for fetching and managing announcements
export function useAnnouncements() {
    const [data, setData] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const announcements = await fetchAnnouncements();
            setData(announcements);
        } catch (err) {
            setError('Failed to fetch announcements');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    // Filter by type
    const getByType = (type: string) => data.filter(item => item.type === type);

    return { data, loading, error, refresh, getByType };
}

// Hook for bookmarks management
export function useBookmarks() {
    const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
    const [bookmarks, setBookmarks] = useState<Announcement[]>([]);
    const { token, isAuthenticated } = useAuth();

    // Fetch bookmarks on mount
    useEffect(() => {
        if (isAuthenticated && token) {
            fetchBookmarks(token).then(data => {
                setBookmarks(data);
                setBookmarkedIds(new Set(data.map(b => b.id)));
            });
        }
    }, [isAuthenticated, token]);

    const toggleBookmark = async (announcementId: string) => {
        if (!token) return;

        const isBookmarked = bookmarkedIds.has(announcementId);

        if (isBookmarked) {
            const success = await removeBookmark(announcementId, token);
            if (success) {
                setBookmarkedIds(prev => {
                    const next = new Set(prev);
                    next.delete(announcementId);
                    return next;
                });
                setBookmarks(prev => prev.filter(b => b.id !== announcementId));
            }
        } else {
            const success = await addBookmark(announcementId, token);
            if (success) {
                setBookmarkedIds(prev => new Set(prev).add(announcementId));
            }
        }
    };

    const isBookmarked = (id: string) => bookmarkedIds.has(id);

    return { bookmarks, bookmarkedIds, toggleBookmark, isBookmarked };
}
