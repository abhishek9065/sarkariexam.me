import { useState, useCallback, ReactNode } from 'react';
import './ConfirmDialog.css';
import { ConfirmDialogContext, type ConfirmDialogOptions, type ConfirmDialogState } from './ConfirmDialogContext';

interface ConfirmDialogProviderProps {
    children: ReactNode;
}

export function ConfirmDialogProvider({ children }: ConfirmDialogProviderProps) {
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
                ...options,
                confirmText: options.confirmText || 'Confirm',
                cancelText: options.cancelText || 'Cancel',
                variant: options.variant || 'info',
                resolve,
            });
        });
    }, []);

    const handleConfirm = useCallback(() => {
        dialog.resolve?.(true);
        setDialog((prev) => ({ ...prev, isOpen: false, resolve: null }));
    }, [dialog.resolve]);

    const handleCancel = useCallback(() => {
        dialog.resolve?.(false);
        setDialog((prev) => ({ ...prev, isOpen: false, resolve: null }));
    }, [dialog.resolve]);

    return (
        <ConfirmDialogContext.Provider value={{ confirm }}>
            {children}
            {dialog.isOpen && (
                <div className="confirm-overlay" onClick={handleCancel}>
                    <div
                        className={`confirm-dialog ${dialog.variant}`}
                        onClick={(e) => e.stopPropagation()}
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="confirm-title"
                        aria-describedby="confirm-message"
                    >
                        <h3 id="confirm-title" className="confirm-title">
                            {dialog.variant === 'danger' && '⚠️ '}
                            {dialog.variant === 'warning' && '⚡ '}
                            {dialog.title}
                        </h3>
                        <p id="confirm-message" className="confirm-message">
                            {dialog.message}
                        </p>
                        <div className="confirm-actions">
                            <button
                                className="confirm-btn cancel"
                                onClick={handleCancel}
                                autoFocus
                            >
                                {dialog.cancelText}
                            </button>
                            <button
                                className={`confirm-btn ${dialog.variant}`}
                                onClick={handleConfirm}
                            >
                                {dialog.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmDialogContext.Provider>
    );
}

export default ConfirmDialogProvider;
