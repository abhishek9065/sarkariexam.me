import { useEffect, useRef, useState } from 'react';

export interface RowAction {
    id: string;
    label: string;
    onClick: () => void;
    disabled?: boolean;
    tone?: 'default' | 'warning' | 'danger' | 'info';
}

type RowActionMenuProps = {
    itemLabel: string;
    actions: RowAction[];
};

export function RowActionMenu({ itemLabel, actions }: RowActionMenuProps) {
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!open) return undefined;
        const handlePointer = (event: MouseEvent) => {
            const target = event.target as Node | null;
            if (!target || menuRef.current?.contains(target)) return;
            setOpen(false);
        };
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };
        window.addEventListener('mousedown', handlePointer);
        window.addEventListener('keydown', handleEscape);
        return () => {
            window.removeEventListener('mousedown', handlePointer);
            window.removeEventListener('keydown', handleEscape);
        };
    }, [open]);

    return (
        <div className="row-action-menu" ref={menuRef}>
            <button
                type="button"
                className="admin-btn subtle small"
                aria-label={`More actions for ${itemLabel}`}
                aria-expanded={open}
                onClick={() => setOpen((current) => !current)}
            >
                Actions
            </button>
            {open ? (
                <div className="row-action-panel" role="menu" aria-label={`${itemLabel} actions`}>
                    {actions.map((action) => (
                        <button
                            key={action.id}
                            type="button"
                            className={`row-action-item${action.tone ? ` ${action.tone}` : ''}`}
                            disabled={action.disabled}
                            onClick={() => {
                                action.onClick();
                                setOpen(false);
                            }}
                        >
                            {action.label}
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
