'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { deleteUser, getUsers, updateUser } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  Shield,
  ShieldOff,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react';
import type { AdminRole, User } from '@/lib/types';

const PAGE_SIZE = 20;

type PendingAction =
  | { kind: 'role'; user: User; nextRole: AdminRole }
  | { kind: 'status'; user: User; nextActive: boolean }
  | { kind: 'delete'; user: User };

function formatDate(value?: string) {
  if (!value) return 'Never';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function roleLabel(role: AdminRole) {
  return role === 'superadmin' ? 'Superadmin' : role.charAt(0).toUpperCase() + role.slice(1);
}

export function UsersPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [auditReason, setAuditReason] = useState('');

  const filters = {
    search: search || undefined,
    role: roleFilter !== 'all' ? roleFilter : undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };

  const usersQuery = useQuery({
    queryKey: ['admin-users', filters],
    queryFn: () => getUsers(filters),
  });

  const closeDialog = () => {
    setPendingAction(null);
    setAuditReason('');
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<User> & { auditReason: string } }) => updateUser(id, updates),
    onSuccess: async (_response, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(variables.updates.role ? 'User role updated.' : 'User status updated.');
      closeDialog();
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to update user.'),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => deleteUser(id, reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      if ((usersQuery.data?.data.length ?? 0) === 1 && page > 0) setPage((value) => value - 1);
      toast.success('User deleted.');
      closeDialog();
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to delete user.'),
  });

  const users = usersQuery.data?.data || [];
  const total = usersQuery.data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const mutationPending = updateMutation.isPending || deleteMutation.isPending;
  const loadedSuperadmins = users.filter((user) => user.role === 'superadmin').length;
  const loadedActiveSuperadmins = users.filter((user) => user.role === 'superadmin' && user.isActive).length;
  const completeSuperadminView = !search && total <= PAGE_SIZE && (roleFilter === 'superadmin' || roleFilter === 'all');

  function isSelf(user: User) {
    return user.id === currentUser?.id;
  }

  function isObviousOnlySuperadmin(user: User) {
    return completeSuperadminView && user.role === 'superadmin' && loadedSuperadmins === 1;
  }

  function isObviousLastActiveSuperadmin(user: User) {
    return completeSuperadminView && user.role === 'superadmin' && user.isActive && loadedActiveSuperadmins === 1;
  }

  function openAction(action: PendingAction) {
    setAuditReason('');
    setPendingAction(action);
  }

  function confirmAction() {
    if (!pendingAction || auditReason.trim().length < 3) return;
    if (pendingAction.kind === 'role') {
      updateMutation.mutate({ id: pendingAction.user.id, updates: { role: pendingAction.nextRole, auditReason: auditReason.trim() } });
    } else if (pendingAction.kind === 'status') {
      updateMutation.mutate({ id: pendingAction.user.id, updates: { isActive: pendingAction.nextActive, auditReason: auditReason.trim() } });
    } else {
      deleteMutation.mutate({ id: pendingAction.user.id, reason: auditReason.trim() });
    }
  }

  const actionTitle = pendingAction?.kind === 'role'
    ? 'Confirm role change'
    : pendingAction?.kind === 'status'
      ? `Confirm ${pendingAction.nextActive ? 'activation' : 'deactivation'}`
      : 'Confirm user deletion';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="mt-1 text-muted-foreground">Manage access with confirmed, audited actions.</p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-2 text-right">
          <div className="text-xl font-bold">{total.toLocaleString('en-IN')}</div>
          <div className="text-xs text-muted-foreground">Total matching users</div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by email or username…"
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(0); }}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={(value) => { setRoleFilter(value); setPage(0); }}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="superadmin">Superadmin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="reviewer">Reviewer</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {usersQuery.isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : usersQuery.isError ? (
        <Card><CardContent className="py-12 text-center"><AlertTriangle className="mx-auto mb-3 h-6 w-6 text-destructive" /><p className="font-medium">Users are unavailable.</p><p className="mt-1 text-sm text-muted-foreground">Refresh the page or try again later.</p></CardContent></Card>
      ) : users.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-medium">No users found.</p><p className="mt-1 text-sm text-muted-foreground">Try clearing the search or selecting a different role.</p></CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">User</th>
                    <th className="hidden px-4 py-3 text-left font-medium md:table-cell">Role / Status</th>
                    <th className="hidden px-4 py-3 text-left font-medium xl:table-cell">Account activity</th>
                    <th className="px-4 py-3 text-right font-medium">Confirmed actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const self = isSelf(user);
                    const onlySuperadmin = isObviousOnlySuperadmin(user);
                    const lastActiveSuperadmin = isObviousLastActiveSuperadmin(user);
                    const roleBlocked = self || onlySuperadmin;
                    const deactivateBlocked = (self && user.isActive) || lastActiveSuperadmin;
                    const deleteBlocked = self || onlySuperadmin;
                    const nextRole: AdminRole = user.role === 'user' ? 'admin' : 'user';
                    return (
                      <tr key={user.id} className="border-b transition-colors last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-4 align-top">
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{user.username?.charAt(0).toUpperCase() || '?'}</div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{user.username}</span>{self ? <Badge variant="outline">You</Badge> : null}</div>
                              <div className="mt-1 break-all text-xs text-muted-foreground">{user.email}</div>
                              <div className="mt-2 flex flex-wrap gap-2 md:hidden"><Badge variant={['admin', 'superadmin'].includes(user.role) ? 'default' : 'secondary'}>{roleLabel(user.role)}</Badge><Badge variant={user.isActive ? 'outline' : 'destructive'}>{user.isActive ? 'Active' : 'Inactive'}</Badge></div>
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-4 py-4 align-top md:table-cell">
                          <div className="flex flex-wrap gap-2"><Badge variant={['admin', 'superadmin'].includes(user.role) ? 'default' : 'secondary'}>{roleLabel(user.role)}</Badge><Badge variant={user.isActive ? 'outline' : 'destructive'}>{user.isActive ? 'Active' : 'Inactive'}</Badge></div>
                          {onlySuperadmin ? <div className="mt-2 text-xs font-medium text-amber-700">Only visible superadmin</div> : lastActiveSuperadmin ? <div className="mt-2 text-xs font-medium text-amber-700">Last visible active superadmin</div> : null}
                        </td>
                        <td className="hidden px-4 py-4 align-top text-xs text-muted-foreground xl:table-cell">
                          <div><span className="font-medium text-foreground">Last login:</span> {formatDate(user.lastLogin)}</div>
                          <div className="mt-1"><span className="font-medium text-foreground">Created:</span> {formatDate(user.createdAt)}</div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button variant="outline" size="sm" disabled={mutationPending || roleBlocked} title={roleBlocked ? (self ? 'You cannot demote your own admin account' : 'The only superadmin cannot be demoted') : undefined} onClick={() => openAction({ kind: 'role', user, nextRole })}>
                              {user.role === 'user' ? <Shield /> : <ShieldOff />}{user.role === 'user' ? 'Promote to admin' : 'Demote to user'}
                            </Button>
                            <Button variant="outline" size="sm" disabled={mutationPending || deactivateBlocked} title={deactivateBlocked ? (self ? 'You cannot deactivate yourself' : 'The last active superadmin cannot be deactivated') : undefined} onClick={() => openAction({ kind: 'status', user, nextActive: !user.isActive })}>
                              {user.isActive ? <UserX /> : <UserCheck />}{user.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button variant="destructive" size="sm" disabled={mutationPending || deleteBlocked} title={deleteBlocked ? (self ? 'You cannot delete yourself' : 'The only superadmin cannot be deleted') : undefined} onClick={() => openAction({ kind: 'delete', user })}>
                              <Trash2 />Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {!usersQuery.isLoading && !usersQuery.isError && total > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString('en-IN')} users</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0 || usersQuery.isFetching} onClick={() => setPage((value) => Math.max(0, value - 1))}><ChevronLeft />Previous</Button>
            <span className="text-xs text-muted-foreground">Page {page + 1} of {Math.max(totalPages, 1)}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1 || usersQuery.isFetching} onClick={() => setPage((value) => value + 1)}>Next<ChevronRight /></Button>
          </div>
        </div>
      ) : null}

      <Dialog open={Boolean(pendingAction)} onOpenChange={(open) => { if (!open && !mutationPending) closeDialog(); }}>
        <DialogContent showCloseButton={!mutationPending}>
          <DialogHeader>
            <DialogTitle>{actionTitle}</DialogTitle>
            <DialogDescription>This action affects production access and will be written to the audit log.</DialogDescription>
          </DialogHeader>
          {pendingAction ? (
            <div className="space-y-4">
              <div className="rounded-xl border bg-muted/40 p-3 text-sm">
                <div className="font-medium">{pendingAction.user.username}</div>
                <div className="mt-1 text-xs text-muted-foreground">{pendingAction.user.email}</div>
                {pendingAction.kind === 'role' ? <div className="mt-3 flex items-center gap-2"><Badge variant="secondary">{roleLabel(pendingAction.user.role)}</Badge><span>→</span><Badge>{roleLabel(pendingAction.nextRole)}</Badge></div> : null}
                {pendingAction.kind === 'status' ? <div className="mt-3 text-xs"><span className="font-medium">Status:</span> {pendingAction.user.isActive ? 'Active' : 'Inactive'} → {pendingAction.nextActive ? 'Active' : 'Inactive'}</div> : null}
                {pendingAction.kind === 'delete' ? <div className="mt-3 text-xs font-medium text-destructive">Deletion cannot be undone.</div> : null}
              </div>
              <div>
                <label htmlFor="audit-reason" className="text-sm font-medium">Audit reason <span className="text-destructive">*</span></label>
                <Textarea id="audit-reason" value={auditReason} onChange={(event) => setAuditReason(event.target.value)} disabled={mutationPending} maxLength={500} placeholder="Explain why this access change is required…" className="mt-2" />
                <div className="mt-1 text-right text-xs text-muted-foreground">{auditReason.trim().length}/500</div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" disabled={mutationPending} onClick={closeDialog}>Cancel</Button>
            <Button variant={pendingAction?.kind === 'delete' ? 'destructive' : 'default'} disabled={mutationPending || auditReason.trim().length < 3} onClick={confirmAction}>
              {mutationPending ? <Loader2 className="animate-spin" /> : null}{pendingAction?.kind === 'delete' ? 'Delete user' : 'Confirm change'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
