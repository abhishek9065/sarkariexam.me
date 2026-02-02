import React, { useState, useCallback, ReactNode } from 'react';
import type { Announcement, AnnouncementStatus, ContentType } from '../types';
import { AdminContext, type AdminContextState, type AdminTab, type SortOption } from './AdminContextStore';

export function AdminProvider({ children }: { children: ReactNode }) {
    const [activeTab, setActiveTab] = useState<AdminTab>('analytics');

    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [listAnnouncements, setListAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<ContentType | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<AnnouncementStatus | 'all'>('all');
    const [sortOption, setSortOption] = useState<SortOption>('newest');

    // Pagination
    const [page, setPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const pageSize = 15;

    const refreshData = useCallback(async () => {
        // This will be overridden or implemented by the consumer hook if complex logic is needed,
        // or we can implement the fetch logic here if we move it from AdminPage.
        // For now, allow it to be set, or use a placeholder.
        // In a true refactor, the data fetching logic should live here.
        setLoading(true);
        try {
            // Implementation pending migration
            setLoading(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to refresh');
            setLoading(false);
        }
    }, []);

    const value: AdminContextState = {
        activeTab,
        setActiveTab,
        announcements,
        setAnnouncements,
        listAnnouncements,
        setListAnnouncements,
        loading,
        setLoading,
        error,
        setError,
        lastUpdated,
        setLastUpdated,
        searchQuery,
        setSearchQuery,
        typeFilter,
        setTypeFilter,
        statusFilter,
        setStatusFilter,
        sortOption,
        setSortOption,
        page,
        setPage,
        totalItems,
        setTotalItems,
        pageSize,
        refreshData
    };

    return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
