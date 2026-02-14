import { useRef } from 'react';

interface OverflowAction {
    id: string;
    label: string;
    onClick: () => void;
    disabled?: boolean;
    tone?: 'default' | 'warning' | 'danger' | 'info';
}

interface ActionOverflowMenuProps {
    itemLabel: string;
    actions: OverflowAction[];
}

export function ActionOverflowMenu({ itemLabel, actions }: ActionOverflowMenuProps) {
    const detailsRef = useRef<HTMLDetailsElement | null>(null);

    const handleAction = (action: OverflowAction) => {
        action.onClick();
        if (detailsRef.current) {
            detailsRef.current.open = false;
        }
    };

    const visibleActions = actions;

    return (
        <details className="action-menu action-overflow-menu" ref={detailsRef}>
            <summary
                className="admin-btn secondary small"
                role="button"
                aria-label={`More actions for ${itemLabel}`}
            >
                More
            </summary>
            <div className="action-menu-panel action-overflow-panel">
                {visibleActions.map((action) => (
                    <button
                        key={action.id}
                        type="button"
                        className={`admin-btn secondary small ${action.tone === 'danger' ? 'danger' : action.tone === 'warning' ? 'warning' : action.tone === 'info' ? 'info' : ''}`}
                        disabled={action.disabled}
                        onClick={() => handleAction(action)}
                    >
                        {action.label}
                    </button>
                ))}
            </div>
        </details>
    );
}
