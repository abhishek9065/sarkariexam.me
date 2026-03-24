'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminAnnouncements, deleteAnnouncement, changeAnnouncementStatus } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Search, Eye, Trash2, Loader2, ChevronLeft, ChevronRight, Pencil,
  CheckCircle2, Archive, Send, Clock,
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

export function AnnouncementsListPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(0);

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-announcements'] }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => changeAnnouncementStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-announcements'] }),
  });

  const announcements = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Announcements</h1>
          <p className="text-muted-foreground mt-1">{total} total announcements</p>
        </div>
        <Link href="/announcements/new">
          <Button><Plus className="h-4 w-4 mr-2" />Create New</Button>
        </Link>
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
            <Select value={sortBy} onValueChange={v => { setSortBy(v); setPage(0); }}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Sort" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="updated">Updated</SelectItem>
                <SelectItem value="views">Views</SelectItem>
                <SelectItem value="deadline">Deadline</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

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
                    <th className="text-left px-4 py-3 font-medium">Title</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Type</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Organization</th>
                    <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Views</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {announcements.map((a: Announcement) => (
                    <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
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
                        <Badge variant={statusVariant[a.status] as 'default'}>{a.status}</Badge>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground truncate max-w-[200px]">
                        {a.organization}
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <div className="flex items-center justify-end gap-1 text-muted-foreground">
                          <Eye className="h-3 w-3" />{a.viewCount?.toLocaleString() || 0}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {a.status === 'draft' && (
                            <Button variant="ghost" size="icon" title="Publish"
                              onClick={() => statusMutation.mutate({ id: a.id, status: 'published' })}>
                              <CheckCircle2 className="h-4 w-4 text-success" />
                            </Button>
                          )}
                          {a.status === 'published' && (
                            <Button variant="ghost" size="icon" title="Archive"
                              onClick={() => statusMutation.mutate({ id: a.id, status: 'archived' })}>
                              <Archive className="h-4 w-4" />
                            </Button>
                          )}
                          <Link href={`/announcements/${a.id}`}>
                            <Button variant="ghost" size="icon" title="Edit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="icon" title="Delete"
                            onClick={() => { if (confirm('Archive this announcement?')) deleteMutation.mutate(a.id); }}>
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
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              Next<ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
