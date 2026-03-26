'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, updateUser, deleteUser } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search, Loader2, ChevronLeft, ChevronRight, Shield, ShieldOff, Trash2, UserCheck, UserX,
} from 'lucide-react';
import type { User } from '@/lib/types';

const PAGE_SIZE = 20;

export function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(0);

  const filters = {
    search: search || undefined,
    role: roleFilter !== 'all' ? roleFilter : undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', filters],
    queryFn: () => getUsers(filters),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Record<string, unknown> }) => updateUser(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const users = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground mt-1">{total} total users</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or username..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={v => { setRoleFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No users found matching your filters.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium">User</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Email</th>
                    <th className="text-left px-4 py-3 font-medium">Role</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Status</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Joined</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u: User) => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {u.username?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <span className="font-medium">{u.username}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>{u.role}</Badge>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <Badge variant={u.isActive ? 'outline' : 'destructive'}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {u.role === 'user' ? (
                            <Button variant="ghost" size="icon" title="Promote to admin"
                              onClick={() => updateMutation.mutate({ id: u.id, updates: { role: 'admin' } })}>
                              <Shield className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" title="Demote to user"
                              onClick={() => updateMutation.mutate({ id: u.id, updates: { role: 'user' } })}>
                              <ShieldOff className="h-4 w-4" />
                            </Button>
                          )}
                          {u.isActive ? (
                            <Button variant="ghost" size="icon" title="Deactivate"
                              onClick={() => updateMutation.mutate({ id: u.id, updates: { isActive: false } })}>
                              <UserX className="h-4 w-4 text-warning" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" title="Activate"
                              onClick={() => updateMutation.mutate({ id: u.id, updates: { isActive: true } })}>
                              <UserCheck className="h-4 w-4 text-success" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" title="Delete user"
                            onClick={() => { if (confirm(`Delete user ${u.email}?`)) deleteMutation.mutate(u.id); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />Prev
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              Next<ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
