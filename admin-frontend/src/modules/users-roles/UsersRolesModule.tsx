import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAdminAuth } from '../../app/useAdminAuth';
import { AdminStepUpCard } from '../../components/AdminStepUpCard';
import { OpsBadge, OpsCard, OpsEmptyState, OpsErrorState, OpsTable } from '../../components/ops';
import { getAdminRoleUsers, updateAdminRoleUser } from '../../lib/api/client';
import type { AdminRoleUser } from '../../types';

const toneByRole = (role: AdminRoleUser['role']) => {
    if (role === 'admin') return 'danger';
    if (role === 'editor') return 'info';
    if (role === 'reviewer') return 'warning';
    return 'neutral';
};

export function UsersRolesModule() {
    const queryClient = useQueryClient();
    const { stepUpToken, hasValidStepUp } = useAdminAuth();

    const query = useQuery({
        queryKey: ['admin-role-users'],
        queryFn: () => getAdminRoleUsers(),
    });

    const rows = useMemo(() => query.data ?? [], [query.data]);

    const updateMutation = useMutation({
        mutationFn: async (payload: {
            id: string;
            role: 'admin' | 'editor' | 'reviewer' | 'viewer' | 'contributor';
            isActive?: boolean;
        }) => {
            if (!stepUpToken || !hasValidStepUp) {
                throw new Error('Step-up verification is required to change roles.');
            }
            return updateAdminRoleUser(payload.id, { role: payload.role, isActive: payload.isActive }, stepUpToken);
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['admin-role-users'] });
        },
    });

    return (
        <>
            <AdminStepUpCard />
            <OpsCard title="Users & Roles" description="Manage admin/editor/reviewer/viewer role assignments with audit-safe updates.">
                {query.isPending ? <div className="admin-alert info">Loading admin users...</div> : null}
                {query.error ? <OpsErrorState message="Failed to load admin users." /> : null}
                {rows.length > 0 ? (
                    <OpsTable
                        columns={[
                            { key: 'email', label: 'Email' },
                            { key: 'role', label: 'Role' },
                            { key: 'status', label: 'Status' },
                            { key: 'lastLogin', label: 'Last Login' },
                            { key: 'actions', label: 'Actions' },
                        ]}
                    >
                        {rows.map((row) => (
                            <tr key={row.id}>
                                <td>
                                    <strong>{row.email}</strong>
                                    <div className="ops-inline-muted">{row.username || '-'}</div>
                                </td>
                                <td>
                                    <OpsBadge tone={toneByRole(row.role) as 'neutral' | 'info' | 'warning' | 'danger'}>
                                        {row.role}
                                    </OpsBadge>
                                </td>
                                <td>
                                    <OpsBadge tone={row.isActive ? 'success' : 'danger'}>
                                        {row.isActive ? 'active' : 'inactive'}
                                    </OpsBadge>
                                </td>
                                <td>{row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString() : '-'}</td>
                                <td>
                                    <div className="ops-actions">
                                        <select
                                            defaultValue={row.role}
                                            onChange={(event) => updateMutation.mutate({
                                                id: row.id,
                                                role: event.target.value as 'admin' | 'editor' | 'contributor' | 'reviewer' | 'viewer',
                                                isActive: row.isActive,
                                            })}
                                            disabled={updateMutation.isPending || !hasValidStepUp}
                                        >
                                            <option value="admin">Admin</option>
                                            <option value="editor">Editor</option>
                                            <option value="contributor">Contributor</option>
                                            <option value="reviewer">Reviewer</option>
                                            <option value="viewer">Viewer</option>
                                        </select>
                                        <button
                                            type="button"
                                            className="admin-btn small subtle"
                                            disabled={updateMutation.isPending || !hasValidStepUp}
                                            onClick={() => updateMutation.mutate({
                                                id: row.id,
                                                role: row.role,
                                                isActive: !row.isActive,
                                            })}
                                        >
                                            {row.isActive ? 'Deactivate' : 'Activate'}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </OpsTable>
                ) : null}
                {!query.isPending && !query.error && rows.length === 0 ? (
                    <OpsEmptyState message="No admin users found." />
                ) : null}
                {updateMutation.isError ? (
                    <OpsErrorState message={updateMutation.error instanceof Error ? updateMutation.error.message : 'Failed to update role.'} />
                ) : null}
                {updateMutation.isSuccess ? <div className="ops-success">Role updated.</div> : null}
            </OpsCard>
        </>
    );
}
