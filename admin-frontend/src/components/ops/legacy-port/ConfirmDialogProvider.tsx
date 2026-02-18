import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { ConfirmDialogContext, type ConfirmDialogOptions } from './ConfirmDialogContext';

type ConfirmDialogState = ConfirmDialogOptions & {
    isOpen: boolean;
    resolve: ((result: boolean) => void) | null;
};

interface ConfirmDialogProviderProps {
    children: ReactNode;
}

export function ConfirmDialogProvider({ children }: ConfirmDialogProviderProps) {
    const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
    const [dialog, setDialog] = useState<ConfirmDialogState>({
        isOpen: false,
        title: '',
        message: '',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        variant: 'info',
        resolve: null,
    });

    const confirm = useCallback((options: ConfirmDialogOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            setDialog({
                isOpen: true,
                title: options.title,
                message: options.message,
                confirmText: options.confirmText || 'Confirm',
                cancelText: options.cancelText || 'Cancel',
                variant: options.variant || 'info',
                resolve,
            });
        });
    }, []);

    const handleConfirm = useCallback(() => {
        setDialog((current) => {
            current.resolve?.(true);
            return { ...current, isOpen: false, resolve: null };
        });
    }, []);

    const handleCancel = useCallback(() => {
        setDialog((current) => {
            current.resolve?.(false);
            return { ...current, isOpen: false, resolve: null };
        });
    }, []);

    useEffect(() => {
        if (!dialog.isOpen) return undefined;

        const focusFrame = window.requestAnimationFrame(() => {
            cancelButtonRef.current?.focus();
        });

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            handleCancel();
        };

        window.addEventListener('keydown', onKeyDown);

        return () => {
            window.cancelAnimationFrame(focusFrame);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [dialog.isOpen, handleCancel]);

    return (
        <ConfirmDialogContext.Provider value={{ confirm }}>
            {children}
            {dialog.isOpen ? (
                <div className="ops-confirm-overlay" onClick={handleCancel} role="presentation">
                    <div
                        className={`ops-confirm-dialog ${dialog.variant || 'info'}`}
                        onClick={(event) => event.stopPropagation()}
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="ops-confirm-title"
                        aria-describedby="ops-confirm-message"
                    >
                        <h3 id="ops-confirm-title">{dialog.title}</h3>
                        <p id="ops-confirm-message" className="ops-inline-muted">{dialog.message}</p>
                        <div className="ops-actions">
                            <button ref={cancelButtonRef} type="button" className="admin-btn" onClick={handleCancel}>{dialog.cancelText}</button>
                            <button type="button" className="admin-btn primary" onClick={handleConfirm}>{dialog.confirmText}</button>
                        </div>
                    </div>
                </div>
            ) : null}
        </ConfirmDialogContext.Provider>
    );
}
