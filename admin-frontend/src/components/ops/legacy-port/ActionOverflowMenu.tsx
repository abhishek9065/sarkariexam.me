import { useRef } from 'react';

export interface OverflowAction {
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

    return (
        <details className="ops-action-menu" ref={detailsRef}>
            <summary
                className="admin-btn subtle small"
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
                More
            </summary>
            <div className="ops-action-panel">
                {actions.map((action, index) => (
                    <button
                        key={action.id}
                        ref={(element) => {
                            buttonRefs.current[index] = element;
                        }}
                        type="button"
                        className={`admin-btn small ${action.tone === 'danger' ? 'danger' : action.tone === 'warning' ? 'subtle' : ''}`}
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
