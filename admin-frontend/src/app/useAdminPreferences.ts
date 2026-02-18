import { useContext } from 'react';

import { AdminPreferencesContext } from './adminPreferencesCore';

export function useAdminPreferences() {
    const context = useContext(AdminPreferencesContext);
    if (!context) {
        throw new Error('useAdminPreferences must be used inside AdminPreferencesProvider');
    }
    return context;
}
