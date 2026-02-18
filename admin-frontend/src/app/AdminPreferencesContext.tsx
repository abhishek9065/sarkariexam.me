import { useMemo } from 'react';

import { useLocalStorageState } from '../lib/useLocalStorageState';
import { AdminPreferencesContext, type AdminTimeZoneMode } from './adminPreferencesCore';

const TIME_ZONE_STORAGE_KEY = 'admin-vnext-timezone-mode';

export function AdminPreferencesProvider({ children }: { children: React.ReactNode }) {
    const [timeZoneMode, setTimeZoneMode] = useLocalStorageState<AdminTimeZoneMode>(TIME_ZONE_STORAGE_KEY, 'local', (raw) => {
        if (raw === '"ist"' || raw === 'ist') return 'ist';
        if (raw === '"utc"' || raw === 'utc') return 'utc';
        return 'local';
    });

    const timeZoneLabel = timeZoneMode === 'ist'
        ? 'IST'
        : timeZoneMode === 'utc'
            ? 'UTC'
            : 'Local';

    const value = useMemo(() => {
        const formatDateTime = (input?: string | null) => {
            if (!input) return '-';
            const date = new Date(input);
            if (Number.isNaN(date.getTime())) return String(input);

            const options: Intl.DateTimeFormatOptions = {
                dateStyle: 'medium',
                timeStyle: 'short',
                hour12: true,
            };

            if (timeZoneMode === 'ist') {
                options.timeZone = 'Asia/Kolkata';
            } else if (timeZoneMode === 'utc') {
                options.timeZone = 'UTC';
            }

            return new Intl.DateTimeFormat('en-IN', options).format(date);
        };

        return {
            timeZoneMode,
            setTimeZoneMode,
            formatDateTime,
            timeZoneLabel,
        };
    }, [setTimeZoneMode, timeZoneLabel, timeZoneMode]);

    return <AdminPreferencesContext.Provider value={value}>{children}</AdminPreferencesContext.Provider>;
}
