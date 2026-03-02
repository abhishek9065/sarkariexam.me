import { useCallback, useMemo } from 'react';

import type { Announcement } from '../adminTypes';

interface UseAdminCommandPaletteInput {
    announcements: Announcement[];
    listAnnouncements: Announcement[];
    listQuery: string;
    handleNavSelect: (tab: string) => void;
    handleShellSearch: (query: string) => void;
    trackAdminEvent: (eventName: string, payload?: Record<string, unknown>) => void;
    handleEditById: (id: string) => void;
    setIsCommandPaletteOpen: (open: boolean) => void;
    setCommandPaletteQuery: (query: string) => void;
}

export function useAdminCommandPalette(input: UseAdminCommandPaletteInput) {
    const {
        announcements,
        listAnnouncements,
        listQuery,
        handleNavSelect,
        handleShellSearch,
        trackAdminEvent,
        handleEditById,
        setIsCommandPaletteOpen,
        setCommandPaletteQuery,
    } = input;

    const commandPaletteCommands = useMemo(() => ([
        {
            id: 'goto-list',
            label: 'Go to listings',
            description: 'Open all announcements list',
            onSelect: () => handleNavSelect('list'),
        },
        {
            id: 'focus-search',
            label: 'Focus list search',
            description: 'Jump to listings and focus search field',
            onSelect: () => handleShellSearch(listQuery.trim()),
        },
        {
            id: 'goto-review',
            label: 'Go to pending review',
            description: 'Open review queue',
            onSelect: () => handleNavSelect('review'),
        },
        {
            id: 'goto-analytics',
            label: 'Go to analytics',
            description: 'Open analytics command center',
            onSelect: () => handleNavSelect('analytics'),
        },
    ]), [handleNavSelect, handleShellSearch, listQuery]);

    const commandPaletteAnnouncements = useMemo(() => {
        const map = new Map<string, Announcement>();
        for (const item of announcements) {
            if (!item?.id || map.has(item.id)) continue;
            map.set(item.id, item);
        }
        for (const item of listAnnouncements) {
            if (!item?.id || map.has(item.id)) continue;
            map.set(item.id, item);
        }
        return Array.from(map.values());
    }, [announcements, listAnnouncements]);

    const handleCommandPaletteOpenAnnouncement = useCallback((id: string) => {
        trackAdminEvent('admin_row_action_clicked', { action: 'command_open_announcement', id });
        setIsCommandPaletteOpen(false);
        setCommandPaletteQuery('');
        handleEditById(id);
    }, [handleEditById, setCommandPaletteQuery, setIsCommandPaletteOpen, trackAdminEvent]);

    return {
        commandPaletteCommands,
        commandPaletteAnnouncements,
        handleCommandPaletteOpenAnnouncement,
    };
}
