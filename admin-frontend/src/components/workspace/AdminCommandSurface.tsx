import { useMemo } from 'react';

type Command = {
    id: string;
    label: string;
    description: string;
    onSelect: () => void;
};

type Announcement = {
    id?: string;
    title?: string;
    type?: string;
};

type AdminCommandSurfaceProps = {
    open: boolean;
    query: string;
    onQueryChange: (value: string) => void;
    onClose: () => void;
    commands: Command[];
    announcements: Announcement[];
    onOpenAnnouncement: (id: string) => void;
};

export function AdminCommandSurface({
    open,
    query,
    onQueryChange,
    onClose,
    commands,
    announcements,
    onOpenAnnouncement,
}: AdminCommandSurfaceProps) {
    const normalizedQuery = query.trim().toLowerCase();
    const filteredCommands = useMemo(
        () => commands.filter((command) => {
            if (!normalizedQuery) return true;
            return `${command.label} ${command.description}`.toLowerCase().includes(normalizedQuery);
        }).slice(0, 12),
        [commands, normalizedQuery]
    );
    const filteredAnnouncements = useMemo(
        () => announcements.filter((item) => {
            if (!normalizedQuery) return true;
            return `${item.title ?? ''} ${item.type ?? ''}`.toLowerCase().includes(normalizedQuery);
        }).slice(0, 8),
        [announcements, normalizedQuery]
    );

    if (!open) return null;

    return (
        <div className="admin-command-surface" role="presentation" onClick={onClose}>
            <div
                className="admin-command-dialog"
                role="dialog"
                aria-modal="true"
                aria-label="Admin command surface"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="admin-command-header">
                    <p className="admin-command-kicker">Global Command Surface</p>
                    <input
                        autoFocus
                        type="search"
                        value={query}
                        onChange={(event) => onQueryChange(event.target.value)}
                        placeholder="Search modules, actions, and recent announcements"
                    />
                </div>
                <div className="admin-command-grid">
                    <section className="admin-command-section">
                        <header>
                            <h3>Actions</h3>
                            <span>{filteredCommands.length}</span>
                        </header>
                        <div className="admin-command-list">
                            {filteredCommands.map((command) => (
                                <button
                                    key={command.id}
                                    type="button"
                                    className="admin-command-item"
                                    onClick={() => {
                                        command.onSelect();
                                        onClose();
                                    }}
                                >
                                    <strong>{command.label}</strong>
                                    <span>{command.description}</span>
                                </button>
                            ))}
                        </div>
                    </section>
                    <section className="admin-command-section">
                        <header>
                            <h3>Recent announcements</h3>
                            <span>{filteredAnnouncements.length}</span>
                        </header>
                        <div className="admin-command-list">
                            {filteredAnnouncements.map((item) => (
                                <button
                                    key={item.id ?? item.title}
                                    type="button"
                                    className="admin-command-item"
                                    onClick={() => {
                                        if (!item.id) return;
                                        onOpenAnnouncement(item.id);
                                        onClose();
                                    }}
                                    disabled={!item.id}
                                >
                                    <strong>{item.title ?? 'Untitled announcement'}</strong>
                                    <span>{item.type ?? 'Announcement'}</span>
                                </button>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
