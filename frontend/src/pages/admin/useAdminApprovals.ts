import { useCallback, useState } from 'react';

import type { AdminApprovalItem, AdminApprovalStatus } from '../../components/admin/AdminApprovalsPanel';
import { getApiErrorMessage } from '../../utils/errors';
import type { AdminTab } from './adminAccess';

const apiBase = import.meta.env.VITE_API_BASE ?? '';

type ToastTone = 'success' | 'error' | 'info';

type AdminApprovalExecutionItem = AdminApprovalItem & {
    endpoint?: string;
    method?: string;
    payload?: Record<string, unknown>;
};

type UseAdminApprovalsInput = {
    isLoggedIn: boolean;
    adminFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
    withStepUp: <T>(reason: string, action: (stepUpToken: string) => Promise<T>) => Promise<T>;
    canAccessTab: (tab: AdminTab) => boolean;
    setActiveAdminTab: (tab: AdminTab) => void;
    setMessage: (message: string) => void;
    pushToast: (message: string, tone?: ToastTone) => void;
};

export function useAdminApprovals(input: UseAdminApprovalsInput) {
    const {
        isLoggedIn,
        adminFetch,
        withStepUp,
        canAccessTab,
        setActiveAdminTab,
        setMessage,
        pushToast,
    } = input;

    const [approvals, setApprovals] = useState<AdminApprovalItem[]>([]);
    const [approvalsLoading, setApprovalsLoading] = useState(false);
    const [approvalsError, setApprovalsError] = useState<string | null>(null);

    const executeApprovedAction = useCallback(async (approval: AdminApprovalExecutionItem) => {
        const endpoint = typeof approval.endpoint === 'string' ? approval.endpoint : '';
        if (!endpoint.startsWith('/api/admin/')) {
            return { attempted: false as const, response: null };
        }

        const method = typeof approval.method === 'string' ? approval.method.toUpperCase() : 'POST';
        const payload = approval.payload && typeof approval.payload === 'object'
            ? approval.payload
            : {};

        let body: Record<string, unknown> | undefined;
        if (approval.actionType === 'announcement_publish') {
            const note = typeof payload.note === 'string' ? payload.note : undefined;
            body = note ? { note } : {};
        } else if (approval.actionType === 'announcement_bulk_publish' && endpoint.endsWith('/announcements/bulk-approve')) {
            const note = typeof payload.note === 'string' ? payload.note : undefined;
            body = note ? { ids: approval.targetIds, note } : { ids: approval.targetIds };
        } else if (approval.actionType === 'announcement_bulk_publish' && endpoint.endsWith('/announcements/bulk')) {
            body = { ids: approval.targetIds, data: payload };
        } else if (approval.actionType !== 'announcement_delete') {
            body = Object.keys(payload).length > 0 ? payload : undefined;
        }

        const response = await withStepUp('Confirm your password and 2FA to execute approved request.', async (stepUpToken) => {
            const headers: Record<string, string> = {
                'X-Admin-Step-Up-Token': stepUpToken,
                'X-Admin-Approval-Id': approval.id,
            };
            const requestInit: RequestInit = {
                method,
                headers,
            };
            if (method !== 'GET' && method !== 'HEAD' && body !== undefined) {
                headers['Content-Type'] = 'application/json';
                requestInit.body = JSON.stringify(body);
            }
            return adminFetch(`${apiBase}${endpoint}`, requestInit);
        });

        return { attempted: true as const, response };
    }, [adminFetch, withStepUp]);

    const refreshApprovals = useCallback(async (status: AdminApprovalStatus | 'all' = 'pending') => {
        if (!isLoggedIn) return;
        setApprovalsLoading(true);
        setApprovalsError(null);
        try {
            const params = new URLSearchParams({
                status,
                limit: '50',
                offset: '0',
            });
            const response = await adminFetch(`${apiBase}/api/admin/approvals?${params.toString()}`);
            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                setApprovalsError(getApiErrorMessage(errorBody, 'Failed to load approvals.'));
                return;
            }
            const payload = await response.json();
            setApprovals(payload.data ?? []);
        } catch (error) {
            console.error(error);
            setApprovalsError('Failed to load approvals.');
        } finally {
            setApprovalsLoading(false);
        }
    }, [adminFetch, isLoggedIn]);

    const handleApprovalRequiredResponse = useCallback(async (response: Response, actionLabel: string) => {
        if (response.status !== 202) return false;
        const payload = await response.json().catch(() => ({}));
        if (!payload?.requiresApproval) return false;
        const infoMessage = payload?.message || `${actionLabel} queued for secondary approval.`;
        setMessage(infoMessage);
        pushToast(infoMessage, 'info');
        refreshApprovals();
        if (canAccessTab('approvals')) {
            setActiveAdminTab('approvals');
        }
        return true;
    }, [canAccessTab, pushToast, refreshApprovals, setActiveAdminTab, setMessage]);

    const approveWorkflowItem = useCallback(async (approvalId: string) => {
        try {
            const response = await withStepUp('Confirm your password and 2FA to approve this request.', async (stepUpToken) => {
                return adminFetch(`${apiBase}/api/admin/approvals/${approvalId}/approve`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Admin-Step-Up-Token': stepUpToken,
                    },
                    body: JSON.stringify({}),
                });
            });
            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                setMessage(getApiErrorMessage(errorBody, 'Failed to approve workflow item.'));
                return;
            }

            const payload = await response.json().catch(() => ({}));
            const approval = payload?.data as AdminApprovalExecutionItem | undefined;
            const canExecute =
                approval?.status === 'approved'
                && typeof approval?.endpoint === 'string'
                && typeof approval?.method === 'string';

            if (canExecute && approval) {
                const execution = await executeApprovedAction(approval);
                if (execution.attempted && execution.response) {
                    if (!execution.response.ok) {
                        const executionError = await execution.response.json().catch(() => ({}));
                        setMessage(`Approval granted, execution failed: ${getApiErrorMessage(executionError, 'Please retry the action.')}`);
                        pushToast('Approval granted, but execution needs retry.', 'info');
                        refreshApprovals('pending');
                        return;
                    }

                    setMessage('Approval granted and action executed.');
                    pushToast('Request approved and executed.', 'success');
                    refreshApprovals('pending');
                    return;
                }
            }

            setMessage('Approval granted. Action is ready for execution.');
            pushToast('Request approved.', 'success');
            refreshApprovals('pending');
        } catch (error: any) {
            if (error?.message === 'Step-up cancelled') return;
            console.error(error);
            setMessage('Failed to approve request.');
        }
    }, [adminFetch, executeApprovedAction, pushToast, refreshApprovals, setMessage, withStepUp]);

    const rejectWorkflowItem = useCallback(async (approvalId: string) => {
        try {
            const response = await withStepUp('Confirm your password and 2FA to reject this request.', async (stepUpToken) => {
                return adminFetch(`${apiBase}/api/admin/approvals/${approvalId}/reject`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Admin-Step-Up-Token': stepUpToken,
                    },
                    body: JSON.stringify({ reason: 'Rejected from admin console.' }),
                });
            });
            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                setMessage(getApiErrorMessage(errorBody, 'Failed to reject workflow item.'));
                return;
            }
            setMessage('Approval rejected.');
            pushToast('Request rejected.', 'info');
            refreshApprovals('pending');
        } catch (error: any) {
            if (error?.message === 'Step-up cancelled') return;
            console.error(error);
            setMessage('Failed to reject request.');
        }
    }, [adminFetch, pushToast, refreshApprovals, setMessage, withStepUp]);

    const clearApprovalsState = useCallback(() => {
        setApprovals([]);
        setApprovalsError(null);
        setApprovalsLoading(false);
    }, []);

    return {
        approvals,
        approvalsLoading,
        approvalsError,
        refreshApprovals,
        handleApprovalRequiredResponse,
        approveWorkflowItem,
        rejectWorkflowItem,
        clearApprovalsState,
    };
}
