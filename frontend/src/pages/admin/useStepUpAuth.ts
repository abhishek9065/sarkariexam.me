import { useCallback, useRef, useState } from 'react';

import { adminRequest } from '../../utils/adminRequest';
import { getApiErrorMessage } from '../../utils/errors';

const apiBase = import.meta.env.VITE_API_BASE ?? '';

export type StepUpGrant = {
    token: string;
    expiresAtMs: number;
};

export function useStepUpAuth(adminEmail?: string) {
    const [stepUpOpen, setStepUpOpen] = useState(false);
    const [stepUpReason, setStepUpReason] = useState('Sensitive action requires fresh verification.');
    const [stepUpError, setStepUpError] = useState<string>('');
    const [stepUpLoading, setStepUpLoading] = useState(false);
    const [stepUpGrant, setStepUpGrant] = useState<StepUpGrant | null>(null);
    const stepUpResolverRef = useRef<((token: string | null) => void) | null>(null);

    const closeStepUpDialog = useCallback((token: string | null) => {
        setStepUpOpen(false);
        setStepUpLoading(false);
        setStepUpError('');
        const resolver = stepUpResolverRef.current;
        stepUpResolverRef.current = null;
        resolver?.(token);
    }, []);

    const requestStepUpToken = useCallback((reason: string): Promise<string | null> => {
        if (stepUpGrant && stepUpGrant.expiresAtMs > Date.now() + 5000) {
            return Promise.resolve(stepUpGrant.token);
        }
        return new Promise((resolve) => {
            setStepUpReason(reason);
            setStepUpError('');
            stepUpResolverRef.current = resolve;
            setStepUpOpen(true);
        });
    }, [stepUpGrant]);

    const handleStepUpSubmit = useCallback(async (input: { password: string; twoFactorCode: string }) => {
        if (!adminEmail) {
            setStepUpError('Admin email context is missing. Please sign in again.');
            return;
        }

        setStepUpLoading(true);
        setStepUpError('');
        try {
            const response = await adminRequest(`${apiBase}/api/auth/admin/step-up`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                maxRetries: 0,
                body: JSON.stringify({
                    email: adminEmail,
                    password: input.password,
                    twoFactorCode: input.twoFactorCode,
                }),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                setStepUpError(getApiErrorMessage(payload, 'Step-up verification failed.'));
                return;
            }

            const token = payload?.data?.token as string | undefined;
            const expiresAt = payload?.data?.expiresAt as string | undefined;
            if (!token || !expiresAt) {
                setStepUpError('Invalid step-up response. Please try again.');
                return;
            }
            const expiresAtMs = new Date(expiresAt).getTime();
            setStepUpGrant({ token, expiresAtMs: Number.isFinite(expiresAtMs) ? expiresAtMs : Date.now() + 5 * 60 * 1000 });
            closeStepUpDialog(token);
        } catch (error) {
            console.error(error);
            setStepUpError('Step-up verification failed. Please try again.');
            setStepUpLoading(false);
        }
    }, [adminEmail, closeStepUpDialog]);

    const withStepUp = useCallback(async <T,>(
        reason: string,
        action: (stepUpToken: string) => Promise<T>
    ) => {
        const token = await requestStepUpToken(reason);
        if (!token) {
            throw new Error('Step-up cancelled');
        }
        return action(token);
    }, [requestStepUpToken]);

    const clearStepUpState = useCallback(() => {
        setStepUpGrant(null);
        setStepUpOpen(false);
        setStepUpLoading(false);
        setStepUpError('');
        stepUpResolverRef.current = null;
    }, []);

    return {
        stepUpOpen,
        stepUpReason,
        stepUpError,
        stepUpLoading,
        closeStepUpDialog,
        handleStepUpSubmit,
        withStepUp,
        clearStepUpState,
    };
}
