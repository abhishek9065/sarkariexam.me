import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    handler: () => void;
    description: string;
}

/**
 * Hook to register keyboard shortcuts
 * @param shortcuts Array of shortcut definitions
 * @param enabled Whether shortcuts are active (disable when modals/inputs are focused)
 */
export function useKeyboardShortcuts(
    shortcuts: KeyboardShortcut[],
    enabled: boolean = true
) {
    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (!enabled) return;

            // Don't trigger shortcuts when typing in inputs/textareas
            const target = event.target as HTMLElement;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            ) {
                // Allow Escape key even in inputs
                if (event.key !== 'Escape') return;
            }

            for (const shortcut of shortcuts) {
                const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
                const ctrlMatch = !!shortcut.ctrl === (event.ctrlKey || event.metaKey);
                const shiftMatch = !!shortcut.shift === event.shiftKey;
                const altMatch = !!shortcut.alt === event.altKey;

                if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
                    event.preventDefault();
                    shortcut.handler();
                    break;
                }
            }
        },
        [shortcuts, enabled]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}

export default useKeyboardShortcuts;
