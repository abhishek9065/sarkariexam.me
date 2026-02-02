import { createContext, useContext } from 'react';
import type { Announcement, AnnouncementStatus, ContentType } from '../types';

export type AdminTab = 'analytics' | 'list' | 'review' | 'add' | 'detailed' | 'bulk' | 'queue' | 'security' | 'users' | 'audit';
export type SortOption = 'newest' | 'updated' | 'deadline' | 'views';

export interface AdminContextState {
    activeTab: AdminTab;
    setActiveTab: (tab: AdminTab) => void;

    // Data
    announcements: Announcement[];
    setAnnouncements: React.Dispatch<React.SetStateAction<Announcement[]>>;
    listAnnouncements: Announcement[];
    setListAnnouncements: React.Dispatch<React.SetStateAction<Announcement[]>>;
    loading: boolean;
    setLoading: (loading: boolean) => void;
    error: string | null;
    setError: (error: string | null) => void;
    lastUpdated: string | null;
    setLastUpdated: (date: string | null) => void;

    // Filters
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    typeFilter: ContentType | 'all';
    setTypeFilter: (type: ContentType | 'all') => void;
    statusFilter: AnnouncementStatus | 'all';
    setStatusFilter: (status: AnnouncementStatus | 'all') => void;
    sortOption: SortOption;
    setSortOption: (sort: SortOption) => void;

    // Pagination
    page: number;
    setPage: (page: number) => void;
    totalItems: number;
    setTotalItems: (total: number) => void;
    pageSize: number;

    // Actions
    refreshData: () => Promise<void>;
}

export const AdminContext = createContext<AdminContextState | undefined>(undefined);

export function useAdmin() {
    const context = useContext(AdminContext);
    if (!context) {
        throw new Error('useAdmin must be used within an AdminProvider');
    }
    return context;
}
