'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminAnnouncements, deleteAnnouncement, changeAnnouncementStatus, bulkChangeStatus } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Plus, Search, Eye, Trash2, Loader2, ChevronLeft, ChevronRight, Pencil,
  CheckCircle2, Archive, Download, ArrowUpDown, ArrowUp, ArrowDown, X,
} from 'lucide-react';
import type { Announcement, AnnouncementStatus, ContentType } from '@/lib/types';

const PAGE_SIZE = 20;

const statusVariant: Record<AnnouncementStatus, string> = {
  draft: 'secondary',
  pending: 'warning',
  scheduled: 'outline',
  published: 'success',
  archived: 'destructive',
};

const typeLabels: Record<ContentType, string> = {
  job: 'Job', result: 'Result', 'admit-card': 'Admit Card',
  syllabus: 'Syllabus', 'answer-key': 'Answer Key', admission: 'Admission',
};

type SortField = 'newest' | 'oldest' | 'updated' | 'views' | 'deadline';

function SortIcon({ field, current }: { field: SortField; current: SortField }) {
  if (current !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
  return field === 'oldest' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
}

function exportCSV(announcements: Announcement[]) {
  const headers = ['Title', 'Type', 'Category', 'Organization', 'Status', 'Views', 'Deadline', 'Posted At', 'Updated At'];
  const rows = announcements.map(a => [
    `"${(a.title || '').replace(/"/g, '""')}"`,
    a.type,
    `"${(a.category || '').replace(/"/g, '""')}"`,
    `"${(a.organization || '').replace(/"/g, '""')}"`,
    a.status,
    a.viewCount ?? 0,
    a.deadline || '',
    a.postedAt || '',
    a.updatedAt || '',
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `announcements-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function AnnouncementsListPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortField>('newest');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const filters = {
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    type: typeFilter !== 'all' ? typeFilter : undefined,
    sort: sortBy,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin-announcements', filters],
    queryFn: () => getAdminAnnouncements(filters),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      toast.success('Announcement deleted');
      setDeleteTarget(null);
    },
    onError: (err: Error) => toast.error(err.message || 'Delete failed'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => changeAnnouncementStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      toast.success('Status updated');
    },
    onError: (err: Error) => toast.error(err.message || 'Status update failed'),
  });

  const bulkMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: string }) => bulkChangeStatus(ids, status),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      toast.success(`${result.data.updated} announcements updated`);
      setSelected(new Set());
    },
    onError: (err: Error) => toast.error(err.message || 'Bulk operation failed'),
  });

  const announcements = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const allOnPageSelected = announcements.length > 0 && announcements.every((a: Announcement) => selected.has(a.id));

  const toggleAll = useCallback(() => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        announcements.forEach((a: Announcement) => next.delete(a.id));
      } else {
        announcements.forEach((a: Announcement) => next.add(a.id));
      }
      return next;
    });
  }, [announcements, allOnPageSelected]);

  const toggleOne = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const cycleSortBy = (field: SortField) => {
    setSortBy(field);
    setPage(0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Announcements</h1>
          <p className="text-muted-foreground mt-1">{total} total announcements</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCSV(announcements)} disabled={announcements.length === 0}>
            <Download className="h-4 w-4 mr-2" />Export CSV
          </Button>
          <Link href="/announcements/new">
            <Button><Plus className="h-4 w-4 mr-2" />Create New</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search announcements..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="job">Job</SelectItem>
                <SelectItem value="result">Result</SelectItem>
                <SelectItem value="admit-card">Admit Card</SelectItem>
                <SelectItem value="syllabus">Syllabus</SelectItem>
                <SelectItem value="answer-key">Answer Key</SelectItem>
                <SelectItem value="admission">Admission</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Bar */}
      {selected.size > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-3 flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium">{selected.size} selected</span>
            <Button size="sm" variant="outline" onClick={() => bulkMutation.mutate({ ids: Array.from(selected), status: 'published' })}
              disabled={bulkMutation.isPending}>
              <CheckCircle2 className="h-4 w-4 mr-1" />Publish
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkMutation.mutate({ ids: Array.from(selected), status: 'archived' })}
              disabled={bulkMutation.isPending}>
              <Archive className="h-4 w-4 mr-1" />Archive
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkMutation.mutate({ ids: Array.from(selected), status: 'draft' })}
              disabled={bulkMutation.isPending}>
              Draft
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setBulkDeleteOpen(true)} disabled={bulkMutation.isPending}>
              <Trash2 className="h-4 w-4 mr-1" />Delete
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} className="ml-auto">
              <X className="h-4 w-4 mr-1" />Clear
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No announcements found matching your filters.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 w-10">
                      <Checkbox checked={allOnPageSelected} onCheckedChange={toggleAll} aria-label="Select all" />
                    </th>
                    <th className="text-left px-4 py-3 font-medium">
                      <button className="flex items-center hover:text-foreground" onClick={() => cycleSortBy(sortBy === 'newest' ? 'oldest' : 'newest')}>
                        Title <SortIcon field="newest" current={sortBy} />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Type</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Organization</th>
                    <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">
                      <button className="flex items-center justify-end hover:text-foreground ml-auto" onClick={() => cycleSortBy('views')}>
                        Views <SortIcon field="views" current={sortBy} />
                      </button>
                    </th>
                    <th className="text-right px-4 py-3 font-medium hidden lg:table-cell">
                      <button className="flex items-center justify-end hover:text-foreground ml-auto" onClick={() => cycleSortBy('deadline')}>
                        Deadline <SortIcon field="deadline" current={sortBy} />
                      </button>
                    </th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {announcements.map((a: Announcement) => (
                    <tr key={a.id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${selected.has(a.id) ? 'bg-primary/5' : ''}`}>
                      <td className="px-4 py-3">
                        <Checkbox checked={selected.has(a.id)} onCheckedChange={() => toggleOne(a.id)} aria-label={`Select ${a.title}`} />
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/announcements/${a.id}`} className="font-medium hover:underline line-clamp-1">
                          {a.title}
                        </Link>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(a.updatedAt).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <Badge variant="outline">{typeLabels[a.type] || a.type}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={a.status}
                          onValueChange={v => statusMutation.mutate({ id: a.id, status: v })}
                        >
                          <SelectTrigger className="h-7 w-[110px] text-xs">
                            <Badge variant={statusVariant[a.status] as 'default'} className="text-xs">{a.status}</Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground truncate max-w-[200px]">
                        {a.organization}
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <div className="flex items-center justify-end gap-1 text-muted-foreground">
                          <Eye className="h-3 w-3" />{a.viewCount?.toLocaleString() || 0}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right hidden lg:table-cell text-muted-foreground text-xs">
                        {a.deadline ? new Date(a.deadline).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/announcements/${a.id}`}>
                            <Button variant="ghost" size="icon" title="Edit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="icon" title="Delete"
                            onClick={() => setDeleteTarget(a.id)}>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />Prev
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              {page + 1} / {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              Next<ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete the announcement. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} Announcements</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete all selected announcements. This cannot be easily undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                bulkMutation.mutate({ ids: Array.from(selected), status: 'archived' });
                setBulkDeleteOpen(false);
              }}
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
