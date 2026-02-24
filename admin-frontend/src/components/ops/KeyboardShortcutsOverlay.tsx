import { useEffect, useState } from 'react';

const SHORTCUT_GROUPS = [
    {
        label: 'Navigation',
        shortcuts: [
            { keys: ['/', ' '], description: 'Focus search' },
            { keys: ['N'], description: 'Create new post' },
            { keys: ['Ctrl', 'K'], description: 'Open command palette' },
        ],
    },
    {
        label: 'General',
        shortcuts: [
            { keys: ['Esc'], description: 'Close dialog / overlay' },
            { keys: ['Shift', '?'], description: 'Show keyboard shortcuts' },
        ],
    },
    {
        label: 'Editor',
        shortcuts: [
            { keys: ['Ctrl', 'S'], description: 'Save / submit form' },
            { keys: ['Ctrl', 'Enter'], description: 'Publish / confirm' },
        ],
    },
];

export function KeyboardShortcutsOverlay() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            const inTypingContext =
                target?.tagName === 'INPUT'
                || target?.tagName === 'TEXTAREA'
                || target?.tagName === 'SELECT'
                || Boolean(target?.isContentEditable);

            if (
                event.key === '?'
                && event.shiftKey
                && !event.ctrlKey
                && !event.metaKey
                && !inTypingContext
            ) {
                event.preventDefault();
                setOpen((prev) => !prev);
            }

            if (event.key === 'Escape' && open) {
                setOpen(false);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open]);

    if (!open) return null;

    return (
        <div className="shortcuts-backdrop" role="presentation" onClick={() => setOpen(false)}>
            <div
                className="shortcuts-panel"
                role="dialog"
                aria-modal="true"
                aria-label="Keyboard shortcuts"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="shortcuts-header">
                    <h2 className="shortcuts-title">Keyboard Shortcuts</h2>
                    <button type="button" className="admin-btn subtle" onClick={() => setOpen(false)}>
                        {'\u2715'}
                    </button>
                </div>
                <div className="shortcuts-body">
                    {SHORTCUT_GROUPS.map((group) => (
                        <div key={group.label} className="shortcuts-group">
                            <h3 className="shortcuts-group-label">{group.label}</h3>
                            <div className="shortcuts-list">
                                {group.shortcuts.map((shortcut) => (
                                    <div key={shortcut.description} className="shortcuts-row">
                                        <span className="shortcuts-keys">
                                            {shortcut.keys.map((key) => (
                                                <kbd key={key}>{key}</kbd>
                                            ))}
                                        </span>
                                        <span className="shortcuts-desc">{shortcut.description}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
