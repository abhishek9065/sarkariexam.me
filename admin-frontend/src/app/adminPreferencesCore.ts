import { createContext } from 'react';

export type AdminTimeZoneMode = 'local' | 'ist' | 'utc';

export interface AdminPreferencesContextValue {
    timeZoneMode: AdminTimeZoneMode;
    setTimeZoneMode: (mode: AdminTimeZoneMode) => void;
    formatDateTime: (value?: string | null) => string;
    timeZoneLabel: string;
}

export const AdminPreferencesContext = createContext<AdminPreferencesContextValue | null>(null);
