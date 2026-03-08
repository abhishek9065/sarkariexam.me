import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAdminAuth } from '../../app/useAdminAuth';
import { AdminStepUpCard } from '../../components/AdminStepUpCard';
import { OpsBadge, OpsCard, OpsEmptyState, OpsErrorState, OpsTable, OpsToolbar } from '../../components/ops';
import { useAdminNotifications } from '../../components/ops/legacy-port';
import {
    AdminApiWorkflowError,
    getAdminRoleUsers,
    getAdminRoles,
    inviteAdminRoleUser,
    issueAdminUserPasswordReset,
    updateAdminRolePermissions,
    updateAdminRoleUser,
    updateAdminUserStatus,
} from '../../lib/api/client';
import type { AdminPortalRole, AdminRoleUser } from '../../types';

const toneByRole = (role: AdminRoleUser['role']) => {
    if (role === 'admin') return 'danger';
    if (role === 'editor') return 'info';
    if (role === 'reviewer') return 'warning';
    if (role === 'contributor') return 'info';
    return 'neutral';
};

const invitationTone = (state?: AdminRoleUser['invitationState']) => {
    if (state === 'accepted') return 'success';
    if (state === 'reset-required') return 'warning';
    return 'neutral';
};

const formatMaybeDate = (value?: string | null) => (value ? new Date(value).toLocaleString() : '-');

const describeAccessControlError = (
    error: unknown,
    fallbackMessage: string,
): { title?: string; message: string } => {
    if (error instanceof AdminApiWorkflowError) {
        if (error.code === 'two_factor_required') {
            return {
                title: 'Two-factor required',
                message: 'Sign in again with your authenticator code to access admin access controls.',
            };
        }
        if (error.status === 403) {
            return {
                title: 'Access restricted',
                message: error.message || 'You do not have permission to access this admin control.',
            };
        }
        return {
            message: error.message || fallbackMessage,
        };
    }

    if (error instanceof Error) {
        return { message: error.message || fallbackMessage };
    }

    return { message: fallbackMessage };
};

export function UsersRolesModule() {
    const queryClient = useQueryClient();
    const { stepUpToken, hasValidStepUp } = useAdminAuth();
    const { notifyError, notifySuccess } = useAdminNotifications();
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<AdminPortalRole>('reviewer');
    const [permissionDrafts, setPermissionDrafts] = useState<Record<AdminPortalRole, string[]>>({
        admin: [],
        editor: [],
        contributor: [],
        reviewer: [],
        viewer: [],
    });

    const usersQuery = useQuery({
        queryKey: ['admin-role-users'],
        queryFn: () => getAdminRoleUsers(),
    });

    const rolesQuery = useQuery({
        queryKey: ['admin-role-permissions'],
        queryFn: () => getAdminRoles(),
    });

    useEffect(() => {
        if (!rolesQuery.data?.roles) return;
        setPermissionDrafts({
            admin: [...(rolesQuery.data.roles.admin ?? [])],
            editor: [...(rolesQuery.data.roles.editor ?? [])],
            contributor: [...(rolesQuery.data.roles.contributor ?? [])],
            reviewer: [...(rolesQuery.data.roles.reviewer ?? [])],
            viewer: [...(rolesQuery.data.roles.viewer ?? [])],
        });
    }, [rolesQuery.data]);

    const rows = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
    const permissionList = rolesQuery.data?.permissions ?? [];
    const usersErrorState = usersQuery.error
        ? describeAccessControlError(usersQuery.error, 'Failed to load admin roster.')
        : null;
    const rolesErrorState = rolesQuery.error
        ? describeAccessControlError(rolesQuery.error, 'Failed to load role permissions.')
        : null;

    const refreshAll = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['admin-role-users'] }),
            queryClient.invalidateQueries({ queryKey: ['admin-role-permissions'] }),
        ]);
    };

    const roleMutation = useMutation({
        mutationFn: async (payload: {
            id: string;
            role: AdminPortalRole;
            isActive?: boolean;
        }) => {
            if (!stepUpToken || !hasValidStepUp) {
                throw new Error('Step-up verification is required to change roles.');
            }
            return updateAdminRoleUser(payload.id, { role: payload.role, isActive: payload.isActive }, stepUpToken);
        },
        onSuccess: refreshAll,
    });

    const statusMutation = useMutation({
        mutationFn: async (payload: { id: string; isActive: boolean }) => {
            if (!stepUpToken || !hasValidStepUp) {
                throw new Error('Step-up verification is required to change account status.');
            }
            return updateAdminUserStatus(payload.id, payload.isActive, stepUpToken);
        },
        onSuccess: refreshAll,
    });

    const inviteMutation = useMutation({
        mutationFn: async () => {
            if (!stepUpToken || !hasValidStepUp) {
                throw new Error('Step-up verification is required to invite admin users.');
            }
            return inviteAdminRoleUser({ email: inviteEmail.trim(), role: inviteRole }, stepUpToken);
        },
        onSuccess: async () => {
            setInviteEmail('');
            setInviteRole('reviewer');
            await refreshAll();
            notifySuccess('Invite sent', 'Reset-password onboarding was issued to the invited admin.');
        },
        onError: (error) => {
            notifyError('Invite failed', error instanceof Error ? error.message : 'Failed to invite admin user.');
        },
    });

    const resetMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!stepUpToken || !hasValidStepUp) {
                throw new Error('Step-up verification is required to issue password resets.');
            }
            return issueAdminUserPasswordReset(id, stepUpToken);
        },
        onSuccess: async () => {
            await refreshAll();
            notifySuccess('Reset issued', 'Password reset instructions were sent.');
        },
        onError: (error) => {
            notifyError('Reset failed', error instanceof Error ? error.message : 'Failed to issue password reset.');
        },
    });

    const permissionMutation = useMutation({
        mutationFn: async (role: AdminPortalRole) => {
            if (!stepUpToken || !hasValidStepUp) {
                throw new Error('Step-up verification is required to update role permissions.');
            }
            return updateAdminRolePermissions(role, permissionDrafts[role] ?? [], stepUpToken);
        },
        onSuccess: async () => {
            await refreshAll();
            notifySuccess('Permissions updated', 'Role override matrix saved.');
        },
        onError: (error) => {
            notifyError('Permission update failed', error instanceof Error ? error.message : 'Failed to update role permissions.');
        },
    });

    return (
        <>
            <AdminStepUpCard />
            <OpsCard title="Access Control" description="Manage admin lifecycle, access posture, and role-permission overrides without leaving admin vNext.">
                <div className="ops-stack">
                    <OpsToolbar
                        controls={(
                            <>
                                <input
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(event) => setInviteEmail(event.target.value)}
                                    placeholder="invite-admin@example.com"
                                />
                                <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as AdminPortalRole)}>
                                    <option value="admin">Admin</option>
                                    <option value="editor">Editor</option>
                                    <option value="contributor">Contributor</option>
                                    <option value="reviewer">Reviewer</option>
                                    <option value="viewer">Viewer</option>
                                </select>
                            </>
                        )}
                        actions={(
                            <>
                                <span className="ops-inline-muted">{rows.length} admin accounts</span>
                                <button
                                    type="button"
                                    className="admin-btn small"
                                    disabled={!inviteEmail.trim() || inviteMutation.isPending || !hasValidStepUp}
                                    onClick={() => inviteMutation.mutate()}
                                >
                                    {inviteMutation.isPending ? 'Inviting...' : 'Invite Admin'}
                                </button>
                            </>
                        )}
                    />

                    {usersQuery.isPending ? <div className="admin-alert info">Loading admin roster...</div> : null}
                    {usersErrorState ? (
                        <OpsErrorState
                            title={usersErrorState.title}
                            message={usersErrorState.message}
                            onRetry={() => void usersQuery.refetch()}
                            retryLabel="Retry roster load"
                        />
                    ) : null}

                    {rows.length > 0 ? (
                        <OpsTable
                            columns={[
                                { key: 'email', label: 'Account' },
                                { key: 'role', label: 'Role' },
                                { key: 'status', label: 'Status' },
                                { key: 'security', label: 'Security' },
                                { key: 'invitation', label: 'Invitation' },
                                { key: 'sessions', label: 'Sessions' },
                                { key: 'actions', label: 'Actions' },
                            ]}
                        >
                            {rows.map((row) => (
                                <tr key={row.id}>
                                    <td>
                                        <strong>{row.email}</strong>
                                        <div className="ops-inline-muted">{row.username || 'No username set'}</div>
                                        <div className="ops-inline-muted">Last login: {formatMaybeDate(row.lastLoginAt)}</div>
                                    </td>
                                    <td>
                                        <OpsBadge tone={toneByRole(row.role) as 'neutral' | 'info' | 'warning' | 'danger'}>
                                            {row.role}
                                        </OpsBadge>
                                        <div className="ops-actions">
                                            <select
                                                value={row.role}
                                                onChange={(event) => roleMutation.mutate({
                                                    id: row.id,
                                                    role: event.target.value as AdminPortalRole,
                                                    isActive: row.isActive,
                                                })}
                                                disabled={roleMutation.isPending || !hasValidStepUp}
                                            >
                                                <option value="admin">Admin</option>
                                                <option value="editor">Editor</option>
                                                <option value="contributor">Contributor</option>
                                                <option value="reviewer">Reviewer</option>
                                                <option value="viewer">Viewer</option>
                                            </select>
                                        </div>
                                    </td>
                                    <td>
                                        <OpsBadge tone={row.isActive ? 'success' : 'danger'}>
                                            {row.isActive ? 'active' : 'suspended'}
                                        </OpsBadge>
                                        {row.passwordResetRequired ? <div className="ops-inline-muted">Password reset required</div> : null}
                                    </td>
                                    <td>
                                        <div>{row.twoFactorEnabled ? '2FA enabled' : '2FA not enabled'}</div>
                                        <div className="ops-inline-muted">
                                            Backup codes: {row.backupCodesAvailable ?? 0}/{row.backupCodesTotal ?? 0}
                                        </div>
                                    </td>
                                    <td>
                                        <OpsBadge tone={invitationTone(row.invitationState) as 'neutral' | 'success' | 'warning'}>
                                            {row.invitationState ?? 'pending'}
                                        </OpsBadge>
                                        <div className="ops-inline-muted">Invited: {formatMaybeDate(row.invitedAt)}</div>
                                        <div className="ops-inline-muted">By: {row.invitedBy || '-'}</div>
                                    </td>
                                    <td>{row.activeSessionCount ?? 0}</td>
                                    <td>
                                        <div className="ops-actions">
                                            <button
                                                type="button"
                                                className="admin-btn small subtle"
                                                disabled={statusMutation.isPending || !hasValidStepUp}
                                                onClick={() => statusMutation.mutate({ id: row.id, isActive: !row.isActive })}
                                            >
                                                {row.isActive ? 'Suspend' : 'Reactivate'}
                                            </button>
                                            <button
                                                type="button"
                                                className="admin-btn small subtle"
                                                disabled={resetMutation.isPending || !hasValidStepUp}
                                                onClick={() => resetMutation.mutate(row.id)}
                                            >
                                                Require Reset
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </OpsTable>
                    ) : null}

                    {!usersQuery.isPending && !usersQuery.error && rows.length === 0 ? (
                        <OpsEmptyState message="No admin users found. Accounts appear here once an admin role is assigned." />
                    ) : null}

                    {roleMutation.isError ? <OpsErrorState message={roleMutation.error instanceof Error ? roleMutation.error.message : 'Failed to update role.'} /> : null}
                    {statusMutation.isError ? <OpsErrorState message={statusMutation.error instanceof Error ? statusMutation.error.message : 'Failed to update account status.'} /> : null}
                    {resetMutation.isError ? <OpsErrorState message={resetMutation.error instanceof Error ? resetMutation.error.message : 'Failed to issue reset.'} /> : null}
                </div>
            </OpsCard>

            <OpsCard title="Role Permission Matrix" description="Default roles stay intact, but permission overrides can now be edited directly for the admin console.">
                {rolesQuery.isPending ? <div className="admin-alert info">Loading role permissions...</div> : null}
                {rolesErrorState ? (
                    <OpsErrorState
                        title={rolesErrorState.title}
                        message={rolesErrorState.message}
                        onRetry={() => void rolesQuery.refetch()}
                        retryLabel="Retry permission load"
                    />
                ) : null}
                {!rolesQuery.isPending && !rolesQuery.error ? (
                    <div className="ops-table-wrap">
                        <table className="ops-table">
                            <thead>
                                <tr>
                                    <th>Role</th>
                                    {permissionList.map((permission) => <th key={permission}>{permission}</th>)}
                                    <th>Save</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(Object.keys(permissionDrafts) as AdminPortalRole[]).map((role) => (
                                    <tr key={role}>
                                        <td>
                                            <strong>{role}</strong>
                                        </td>
                                        {permissionList.map((permission) => {
                                            const checked = (permissionDrafts[role] ?? []).includes(permission);
                                            return (
                                                <td key={`${role}-${permission}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => {
                                                            setPermissionDrafts((current) => {
                                                                const active = new Set(current[role] ?? []);
                                                                if (active.has(permission)) active.delete(permission);
                                                                else active.add(permission);
                                                                return { ...current, [role]: Array.from(active) };
                                                            });
                                                        }}
                                                    />
                                                </td>
                                            );
                                        })}
                                        <td>
                                            <button
                                                type="button"
                                                className="admin-btn small"
                                                disabled={permissionMutation.isPending || !hasValidStepUp}
                                                onClick={() => permissionMutation.mutate(role)}
                                            >
                                                Save
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : null}
                {permissionMutation.isError ? (
                    <OpsErrorState message={permissionMutation.error instanceof Error ? permissionMutation.error.message : 'Failed to update role permissions.'} />
                ) : null}
            </OpsCard>
        </>
    );
}
