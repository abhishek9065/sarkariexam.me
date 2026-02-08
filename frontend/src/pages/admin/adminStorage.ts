import type { AnnouncementStatus, ContentType } from '../../types';
import type { AdminPortalRole } from './adminAccess';

export const LIST_FILTER_STORAGE_KEY = 'adminListFilters';
export const ADMIN_USER_STORAGE_KEY = 'adminUserProfile';
export const ADMIN_TIMEZONE_KEY = 'adminTimezoneMode';
export const ADMIN_SIDEBAR_KEY = 'adminSidebarCollapsed';

export type TimeZoneMode = 'local' | 'ist' | 'utc';

export type ListFilterState = {
    query?: string;
    type?: ContentType | 'all';
    status?: AnnouncementStatus | 'all';
    sort?: 'newest' | 'updated' | 'deadline' | 'views';
};

export type AdminUserProfile = {
    name?: string;
    email?: string;
    role?: AdminPortalRole;
};

export const loadListFilters = (): ListFilterState | null => {
    try {
        const raw = localStorage.getItem(LIST_FILTER_STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as ListFilterState;
    } catch {
        return null;
    }
};

export const loadAdminUser = (): AdminUserProfile | null => {
    try {
        const raw = localStorage.getItem(ADMIN_USER_STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as AdminUserProfile;
    } catch {
        return null;
    }
};

export const loadTimeZoneMode = (): TimeZoneMode => {
    try {
        const raw = localStorage.getItem(ADMIN_TIMEZONE_KEY);
        if (raw === 'local' || raw === 'ist' || raw === 'utc') return raw;
    } catch {
        // ignore
    }
    return 'local';
};

export const loadSidebarCollapsed = (): boolean => {
    try {
        const raw = localStorage.getItem(ADMIN_SIDEBAR_KEY);
        return raw === '1';
    } catch {
        return false;
    }
};
