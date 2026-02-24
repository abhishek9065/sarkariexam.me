import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { AdminAnnouncementListItem } from '../../../types';

type PaletteCommand = {
    id: string;
    label: string;
    description?: string;
    onSelect: () => void;
};

type PaletteItem = {
    key: string;
    kind: 'command' | 'announcement' | 'recent';
    label: string;
    description?: string;
    icon?: string;
    score: number;
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

const RECENT_KEY = 'admin-palette-recent';
const MAX_RECENT = 5;

function getRecent(): string[] {
    try {
        const raw = localStorage.getItem(RECENT_KEY);
        return raw ? (JSON.parse(raw) as string[]).slice(0, MAX_RECENT) : [];
    } catch {
        return [];
    }
}

function pushRecent(id: string) {
    try {
        const prev = getRecent().filter((item) => item !== id);
        localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...prev].slice(0, MAX_RECENT)));
    } catch { /* ignore */ }
}

/**
 * Simple fuzzy scorer — returns 0 (no match) or positive value (higher = better).
 * Rewards: consecutive matches, match at word-start, exact substring.
 */
function fuzzyScore(needle: string, haystack: string): number {
    if (!needle) return 1;
    const lower = haystack.toLowerCase();
    const n = needle.toLowerCase();

    // Exact substring — high score
    const substringIdx = lower.indexOf(n);
    if (substringIdx !== -1) {
        return 100 + (substringIdx === 0 ? 50 : 0);
    }

    // Character-by-character fuzzy
    let score = 0;
    let hIdx = 0;
    let consecutive = 0;
    for (let nIdx = 0; nIdx < n.length; nIdx++) {
        const char = n[nIdx];
        let found = false;
        while (hIdx < lower.length) {
            if (lower[hIdx] === char) {
                score += 1 + consecutive;
                // Bonus for word-start match
                if (hIdx === 0 || lower[hIdx - 1] === ' ' || lower[hIdx - 1] === '-' || lower[hIdx - 1] === '/') {
                    score += 3;
                }
                consecutive++;
                hIdx++;
                found = true;
                break;
            }
            consecutive = 0;
            hIdx++;
        }
        if (!found) return 0;
    }
    return score;
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
    const listRef = useRef<HTMLDivElement | null>(null);
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

    const recentIds = useMemo(() => (open ? getRecent() : []), [open]);

    const commandItems = useMemo<PaletteItem[]>(() => {
        return commands
            .map((cmd) => {
                const labelScore = fuzzyScore(normalizedQuery, cmd.label);
                const descScore = fuzzyScore(normalizedQuery, cmd.description ?? '');
                const best = Math.max(labelScore, descScore * 0.7);
                return {
                    key: `cmd-${cmd.id}`,
                    kind: 'command' as const,
                    label: cmd.label,
                    description: cmd.description,
                    icon: '\u2318',
                    score: best,
                    onSelect: () => {
                        pushRecent(cmd.id);
                        cmd.onSelect();
                    },
                };
            })
            .filter((item) => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
    }, [commands, normalizedQuery]);

    const announcementItems = useMemo<PaletteItem[]>(() => {
        if (!normalizedQuery) return [];
        const unique = new Map<string, AdminAnnouncementListItem>();
        for (const item of announcements) {
            const id = item.id || item._id;
            if (!id || unique.has(id)) continue;
            unique.set(id, item);
        }

        return Array.from(unique.values())
            .map((item) => {
                const id = item.id || item._id || '';
                const titleScore = fuzzyScore(normalizedQuery, item.title || '');
                const slugScore = fuzzyScore(normalizedQuery, item.slug || '');
                const orgScore = fuzzyScore(normalizedQuery, item.organization || '');
                const idScore = fuzzyScore(normalizedQuery, id);
                const best = Math.max(titleScore, slugScore * 0.8, orgScore * 0.7, idScore * 0.5);
                return {
                    key: `ann-${id}`,
                    kind: 'announcement' as const,
                    label: item.title || 'Untitled',
                    description: `${item.organization || 'Unknown'} \u00B7 ${item.type || '-'}`,
                    icon: '\uD83D\uDCDD',
                    score: best,
                    onSelect: () => {
                        pushRecent(`ann-${id}`);
                        onOpenAnnouncement(id);
                    },
                };
            })
            .filter((item) => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 12);
    }, [announcements, normalizedQuery, onOpenAnnouncement]);

    const recentItems = useMemo<PaletteItem[]>(() => {
        if (normalizedQuery) return [];
        return recentIds
            .map((recentId) => {
                const cmd = commands.find((c) => c.id === recentId);
                if (!cmd) return null;
                return {
                    key: `recent-${cmd.id}`,
                    kind: 'recent' as const,
                    label: cmd.label,
                    description: cmd.description,
                    icon: '\uD83D\uDD52',
                    score: 0,
                    onSelect: () => {
                        pushRecent(cmd.id);
                        cmd.onSelect();
                    },
                };
            })
            .filter((item): item is PaletteItem => item !== null);
    }, [recentIds, commands, normalizedQuery]);

    // Build grouped flat list
    type SectionItem = { type: 'header'; label: string } | { type: 'item'; item: PaletteItem };
    const sections = useMemo<SectionItem[]>(() => {
        const result: SectionItem[] = [];
        if (recentItems.length > 0) {
            result.push({ type: 'header', label: 'Recent' });
            for (const item of recentItems) result.push({ type: 'item', item });
        }
        if (commandItems.length > 0) {
            result.push({ type: 'header', label: normalizedQuery ? 'Commands' : 'All Commands' });
            for (const item of commandItems) result.push({ type: 'item', item });
        }
        if (announcementItems.length > 0) {
            result.push({ type: 'header', label: 'Content' });
            for (const item of announcementItems) result.push({ type: 'item', item });
        }
        return result;
    }, [recentItems, commandItems, announcementItems, normalizedQuery]);

    const flatItems = useMemo(() => sections.filter((s): s is { type: 'item'; item: PaletteItem } => s.type === 'item'), [sections]);

    useEffect(() => {
        if (!open) return;
        setActiveIndex(0);
    }, [open, query]);

    // Scroll active item into view
    useEffect(() => {
        const list = listRef.current;
        if (!list) return;
        const active = list.querySelector('[aria-current="true"]');
        active?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex]);

    const selectItem = useCallback((item: PaletteItem | undefined) => {
        if (!item) return;
        item.onSelect();
        onClose();
        onQueryChange('');
    }, [onClose, onQueryChange]);

    if (!open) return null;

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
                        setActiveIndex((prev) => (flatItems.length === 0 ? 0 : (prev + 1) % flatItems.length));
                        return;
                    }
                    if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        setActiveIndex((prev) => (flatItems.length === 0 ? 0 : (prev - 1 + flatItems.length) % flatItems.length));
                        return;
                    }
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        selectItem(flatItems[activeIndex]?.item);
                    }
                }}
            >
                <div className="admin-palette-header">
                    <span className="admin-palette-icon">{'\u2318'}</span>
                    <input
                        ref={inputRef}
                        className="admin-palette-input"
                        type="search"
                        value={query}
                        onChange={(event) => onQueryChange(event.target.value)}
                        placeholder="Search commands, modules, or content\u2026"
                        aria-label="Search admin commands"
                    />
                    <kbd className="admin-palette-kbd">ESC</kbd>
                </div>
                <div className="admin-palette-list" ref={listRef}>
                    {flatItems.length === 0 ? (
                        <div className="admin-palette-empty">
                            <span className="admin-palette-empty-icon">{'\uD83D\uDD0E'}</span>
                            <span>No results found. Try a different keyword.</span>
                        </div>
                    ) : (
                        sections.map((section, sIdx) => {
                            if (section.type === 'header') {
                                return (
                                    <div key={`hdr-${sIdx}`} className="admin-palette-section">
                                        {section.label}
                                    </div>
                                );
                            }
                            const flatIdx = flatItems.indexOf(section);
                            return (
                                <button
                                    key={section.item.key}
                                    type="button"
                                    className={`admin-palette-item${flatIdx === activeIndex ? ' active' : ''}`}
                                    onMouseEnter={() => setActiveIndex(flatIdx)}
                                    onClick={() => selectItem(section.item)}
                                    aria-current={flatIdx === activeIndex ? 'true' : undefined}
                                >
                                    <span className="admin-palette-item-icon">{section.item.icon}</span>
                                    <span className="admin-palette-item-body">
                                        <span className="admin-palette-item-label">{section.item.label}</span>
                                        {section.item.description ? (
                                            <span className="admin-palette-item-desc">{section.item.description}</span>
                                        ) : null}
                                    </span>
                                    <span className="admin-palette-item-badge">
                                        {section.item.kind === 'recent' ? 'Recent' : section.item.kind === 'announcement' ? 'Content' : 'Cmd'}
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>
                <div className="admin-palette-footer">
                    <span><kbd>{'\u2191'}</kbd><kbd>{'\u2193'}</kbd> navigate</span>
                    <span><kbd>{'\u23CE'}</kbd> select</span>
                    <span><kbd>esc</kbd> close</span>
                </div>
            </div>
        </div>
    );
}
