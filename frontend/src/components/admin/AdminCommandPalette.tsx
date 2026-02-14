import { useEffect, useMemo, useRef, useState } from 'react';
import type { Announcement } from '../../types';

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
    announcements: Announcement[];
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
            .slice(0, 6)
            .map((command) => ({
                key: `cmd-${command.id}`,
                kind: 'command' as const,
                label: command.label,
                description: command.description,
                onSelect: command.onSelect,
            }));
    }, [commands, normalizedQuery]);

    const announcementItems = useMemo<PaletteItem[]>(() => {
        const unique = new Map<string, Announcement>();
        for (const item of announcements) {
            if (!item?.id || unique.has(item.id)) continue;
            unique.set(item.id, item);
        }
        return Array.from(unique.values())
            .filter((item) => {
                if (!normalizedQuery) return false;
                return (
                    item.title.toLowerCase().includes(normalizedQuery) ||
                    item.slug?.toLowerCase().includes(normalizedQuery) ||
                    item.organization?.toLowerCase().includes(normalizedQuery) ||
                    item.id.toLowerCase().includes(normalizedQuery)
                );
            })
            .slice(0, 10)
            .map((item) => ({
                key: `announcement-${item.id}`,
                kind: 'announcement' as const,
                label: item.title,
                description: `${item.organization || 'Unknown'} · ${item.type} · ${item.id}`,
                onSelect: () => onOpenAnnouncement(item.id),
            }));
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
        <div className="admin-command-palette-overlay" role="presentation" onClick={onClose}>
            <div
                className="admin-command-palette"
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
                <div className="admin-command-header">
                    <input
                        ref={inputRef}
                        type="search"
                        value={query}
                        onChange={(event) => onQueryChange(event.target.value)}
                        placeholder="Jump to list, review queue, or announcement by title/slug/id"
                        aria-label="Search admin commands"
                    />
                    <button type="button" className="admin-btn secondary small" onClick={onClose}>
                        Close
                    </button>
                </div>
                <div className="admin-command-body">
                    {items.length === 0 ? (
                        <div className="empty-state">No matching command. Try title, slug, or id.</div>
                    ) : (
                        <ul className="admin-command-results" role="listbox" aria-label="Command results">
                            {items.map((item, index) => (
                                <li key={item.key}>
                                    <button
                                        type="button"
                                        className={`admin-command-item ${index === activeIndex ? 'active' : ''}`}
                                        onMouseEnter={() => setActiveIndex(index)}
                                        onClick={() => selectItem(item)}
                                    >
                                        <span className={`admin-command-kind ${item.kind}`}>
                                            {item.kind === 'command' ? 'CMD' : 'ANN'}
                                        </span>
                                        <span className="admin-command-text">
                                            <span className="admin-command-label">{item.label}</span>
                                            {item.description && <span className="admin-command-desc">{item.description}</span>}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}

