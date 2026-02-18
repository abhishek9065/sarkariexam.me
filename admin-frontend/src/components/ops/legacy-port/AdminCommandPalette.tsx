import { useEffect, useMemo, useRef, useState } from 'react';

import type { AdminAnnouncementListItem } from '../../../types';

type PaletteCommand = {
    id: string;
    label: string;
    description?: string;
    onSelect: () => void;
};

type PaletteItem =
    | {
        key: string;
        kind: 'command';
        label: string;
        description?: string;
        onSelect: () => void;
    }
    | {
        key: string;
        kind: 'announcement';
        label: string;
        description?: string;
        onSelect: () => void;
    };

interface AdminCommandPaletteProps {
    open: boolean;
    query: string;
    onQueryChange: (value: string) => void;
    onClose: () => void;
    commands: PaletteCommand[];
    announcements: AdminAnnouncementListItem[];
    onOpenAnnouncement: (id: string) => void;
}

export function AdminCommandPalette({
    open,
    query,
    onQueryChange,
    onClose,
    commands,
    announcements,
    onOpenAnnouncement,
}: AdminCommandPaletteProps) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        if (!open) return;
        const frame = window.requestAnimationFrame(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
        });
        return () => window.cancelAnimationFrame(frame);
    }, [open]);

    const normalizedQuery = query.trim().toLowerCase();

    const commandItems = useMemo<PaletteItem[]>(() => {
        return commands
            .filter((command) => {
                if (!normalizedQuery) return true;
                return (
                    command.label.toLowerCase().includes(normalizedQuery) ||
                    command.description?.toLowerCase().includes(normalizedQuery)
                );
            })
            .slice(0, 8)
            .map((command) => ({
                key: `cmd-${command.id}`,
                kind: 'command' as const,
                label: command.label,
                description: command.description,
                onSelect: command.onSelect,
            }));
    }, [commands, normalizedQuery]);

    const announcementItems = useMemo<PaletteItem[]>(() => {
        const unique = new Map<string, AdminAnnouncementListItem>();
        for (const item of announcements) {
            const id = item.id || item._id;
            if (!id || unique.has(id)) continue;
            unique.set(id, item);
        }

        return Array.from(unique.values())
            .filter((item) => {
                if (!normalizedQuery) return false;
                const id = item.id || item._id || '';
                return (
                    (item.title || '').toLowerCase().includes(normalizedQuery) ||
                    (item.slug || '').toLowerCase().includes(normalizedQuery) ||
                    (item.organization || '').toLowerCase().includes(normalizedQuery) ||
                    id.toLowerCase().includes(normalizedQuery)
                );
            })
            .slice(0, 12)
            .map((item) => {
                const id = item.id || item._id || '';
                return {
                    key: `announcement-${id}`,
                    kind: 'announcement' as const,
                    label: item.title || 'Untitled',
                    description: `${item.organization || 'Unknown'} · ${item.type || '-'} · ${id}`,
                    onSelect: () => onOpenAnnouncement(id),
                };
            });
    }, [announcements, normalizedQuery, onOpenAnnouncement]);

    const items = useMemo(() => [...commandItems, ...announcementItems], [announcementItems, commandItems]);

    useEffect(() => {
        if (!open) return;
        setActiveIndex(0);
    }, [open, query]);

    if (!open) return null;

    const selectItem = (item: PaletteItem | undefined) => {
        if (!item) return;
        item.onSelect();
        onClose();
        onQueryChange('');
    };

    return (
        <div className="admin-palette-backdrop" role="presentation" onClick={onClose}>
            <div
                className="admin-palette"
                role="dialog"
                aria-modal="true"
                aria-label="Admin command palette"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        onClose();
                        return;
                    }
                    if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        setActiveIndex((prev) => (items.length === 0 ? 0 : (prev + 1) % items.length));
                        return;
                    }
                    if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        setActiveIndex((prev) => (items.length === 0 ? 0 : (prev - 1 + items.length) % items.length));
                        return;
                    }
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        selectItem(items[activeIndex]);
                    }
                }}
            >
                <input
                    ref={inputRef}
                    className="admin-palette-input"
                    type="search"
                    value={query}
                    onChange={(event) => onQueryChange(event.target.value)}
                    placeholder="Jump to module or search announcement"
                    aria-label="Search admin commands"
                />
                <div className="admin-palette-list">
                    {items.length === 0 ? (
                        <div className="ops-empty">No matching command. Try title, slug, or ID.</div>
                    ) : (
                        items.map((item, index) => (
                            <button
                                key={item.key}
                                type="button"
                                className="admin-palette-item"
                                onMouseEnter={() => setActiveIndex(index)}
                                onClick={() => selectItem(item)}
                                aria-current={index === activeIndex ? 'true' : undefined}
                            >
                                <span>{item.label}</span>
                                <code>{item.description || (item.kind === 'command' ? 'CMD' : 'ANN')}</code>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
