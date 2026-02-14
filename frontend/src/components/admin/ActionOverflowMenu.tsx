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
    const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

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
                className="admin-btn secondary small overflow-trigger"
                role="button"
                aria-label={`More actions for ${itemLabel}`}
                onKeyDown={(event) => {
                    if (event.key !== 'ArrowDown') return;
                    event.preventDefault();
                    if (detailsRef.current) {
                        detailsRef.current.open = true;
                    }
                    window.requestAnimationFrame(() => {
                        const first = buttonRefs.current.find(Boolean);
                        first?.focus();
                    });
                }}
            >
                <span>More</span>
                <span className="overflow-chevron" aria-hidden="true">▾</span>
            </summary>
            <div className="action-menu-panel action-overflow-panel">
                {visibleActions.map((action, index) => (
                    <button
                        key={action.id}
                        ref={(element) => {
                            buttonRefs.current[index] = element;
                        }}
                        type="button"
                        className={`admin-btn secondary small ${action.tone === 'danger' ? 'danger' : action.tone === 'warning' ? 'warning' : action.tone === 'info' ? 'info' : ''}`}
                        disabled={action.disabled}
                        onClick={() => handleAction(action)}
                        onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                                event.preventDefault();
                                if (detailsRef.current) {
                                    detailsRef.current.open = false;
                                    detailsRef.current.querySelector('summary')?.focus();
                                }
                                return;
                            }
                            if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
                            event.preventDefault();
                            const enabledButtons = buttonRefs.current.filter((node) => node && !node.disabled);
                            if (enabledButtons.length === 0) return;
                            const currentIndex = enabledButtons.findIndex((node) => node === event.currentTarget);
                            const nextIndex = event.key === 'ArrowDown'
                                ? (currentIndex + 1) % enabledButtons.length
                                : (currentIndex - 1 + enabledButtons.length) % enabledButtons.length;
                            enabledButtons[nextIndex]?.focus();
                        }}
                    >
                        {action.label}
                    </button>
                ))}
            </div>
        </details>
    );
}
