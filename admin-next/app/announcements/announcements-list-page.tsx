'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ComponentType, type CSSProperties } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { changeAnnouncementStatus, deleteAnnouncement, getAdminAnnouncements } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  AlertCircle,
  ArrowUpRight,
  Briefcase,
  CheckCircle,
  CheckSquare,
  CreditCard,
  Eye,
  FileText,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Square,
  Trash2,
  Trophy,
} from 'lucide-react';
import type { Announcement, AnnouncementStatus, ContentType } from '@/lib/types';

const PAGE_SIZE = 10;

type SortField = 'updated' | 'views' | 'title';

const TYPE_LABELS: Record<ContentType, string> = {
  job: 'Latest Jobs',
  result: 'Results',
  'admit-card': 'Admit Card',
  syllabus: 'Syllabus',
  'answer-key': 'Answer Key',
  admission: 'Admission',
};

type IconComponent = ComponentType<{ className?: string; style?: CSSProperties }>;

const TYPE_COLORS: Record<ContentType, { text: string; bg: string; border: string; icon: IconComponent }> = {
  job: { text: '#e65100', bg: '#fff4ef', border: '#ffd9c4', icon: Briefcase },
  result: { text: '#2e7d32', bg: '#f0fff4', border: '#b9f5c4', icon: Trophy },
  'admit-card': { text: '#6a1b9a', bg: '#f9f0ff', border: '#e4c8ff', icon: CreditCard },
  'answer-key': { text: '#00695c', bg: '#f0fffe', border: '#a5f3e8', icon: FileText },
  syllabus: { text: '#f57f17', bg: '#fffbef', border: '#ffe8a0', icon: FileText },
  admission: { text: '#1565c0', bg: '#eff4ff', border: '#c2d9ff', icon: FileText },
};

const STATUS_STYLES: Record<AnnouncementStatus, { label: string; color: string; bg: string; icon: IconComponent }> = {
  published: { label: 'Active', color: '#2e7d32', bg: '#f0fff4', icon: CheckCircle },
  draft: { label: 'Draft', color: '#f57f17', bg: '#fffbef', icon: FileText },
  pending: { label: 'Pending', color: '#1565c0', bg: '#eff4ff', icon: AlertCircle },
  scheduled: { label: 'Scheduled', color: '#6a1b9a', bg: '#f9f0ff', icon: AlertCircle },
  archived: { label: 'Archived', color: '#c62828', bg: '#fff0f0', icon: Trash2 },
};

function formatDate(date?: string) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: value >= 100000 ? 1 : 0,
  }).format(value);
}

function exportCSV(announcements: Announcement[]) {
  const headers = ['Title', 'Type', 'Category', 'Organization', 'Status', 'Views', 'Deadline', 'Updated At'];
  const rows = announcements.map(item => [
    `"${(item.title || '').replace(/"/g, '""')}"`,
    item.type,
    `"${(item.category || '').replace(/"/g, '""')}"`,
    `"${(item.organization || '').replace(/"/g, '""')}"`,
    item.status,
    item.viewCount ?? 0,
    item.deadline || '',
    item.updatedAt || '',
  ]);

  const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
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
  const searchParams = useSearchParams();
  const routeType = (searchParams.get('type') as ContentType | null) ?? null;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AnnouncementStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | ContentType>(routeType ?? 'all');
  const [sortBy, setSortBy] = useState<SortField>('updated');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    setTypeFilter(routeType ?? 'all');
    setPage(0);
  }, [routeType]);

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
      toast.success('Post deleted.');
      setDeleteTarget(null);
    },
    onError: (error: Error) => toast.error(error.message || 'Delete failed'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AnnouncementStatus }) => changeAnnouncementStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      toast.success('Post status updated.');
    },
    onError: (error: Error) => toast.error(error.message || 'Status update failed'),
  });

  const announcements = (data?.data || []) as Announcement[];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const allOnPageSelected = announcements.length > 0 && announcements.every(item => selected.has(item.id));

  const stats = useMemo(() => ({
    total,
    active: announcements.filter(item => item.status === 'published').length,
    draft: announcements.filter(item => item.status === 'draft').length,
    archived: announcements.filter(item => item.status === 'archived').length,
  }), [announcements, total]);

  function toggleAll() {
    setSelected(current => {
      const next = new Set(current);
      if (allOnPageSelected) {
        announcements.forEach(item => next.delete(item.id));
      } else {
        announcements.forEach(item => next.add(item.id));
      }
      return next;
    });
  }

  function toggleOne(id: string) {
    setSelected(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-extrabold text-gray-800">Content Manager</h2>
          <p className="text-[11px] text-gray-400">
            {total.toLocaleString('en-IN')} posts · {stats.active} active · {stats.draft} drafts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportCSV(announcements)}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-[13px] font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Export CSV
          </button>
          <Link
            href="/announcements/new"
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold text-white shadow-md transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #e65100, #bf360c)', boxShadow: '0 3px 14px rgba(230,81,0,0.3)' }}
          >
            <Plus className="h-4 w-4" />
            New Post
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Posts', value: stats.total, color: '#1565c0', bg: '#eff4ff' },
          { label: 'Published', value: stats.active, color: '#2e7d32', bg: '#f0fff4' },
          { label: 'Drafts', value: stats.draft, color: '#f57f17', bg: '#fffbef' },
          { label: 'Archived', value: stats.archived, color: '#c62828', bg: '#fff0f0' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-3 rounded-[22px] border border-gray-100 bg-white px-4 py-3 shadow-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-2xl" style={{ background: item.bg }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: item.color }}>{item.value}</span>
            </div>
            <span className="text-[11px] font-semibold text-gray-500">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="rounded-[22px] border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="flex min-w-44 flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <input
              value={search}
              onChange={event => {
                setSearch(event.target.value);
                setPage(0);
              }}
              placeholder="Search by title, org..."
              className="flex-1 bg-transparent text-[13px] text-gray-700 outline-none placeholder:text-gray-400"
            />
          </div>

          {!routeType && (
            <select
              value={typeFilter}
              onChange={event => {
                setTypeFilter(event.target.value as 'all' | ContentType);
                setPage(0);
              }}
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[12px] font-semibold text-gray-700 outline-none"
            >
              <option value="all">All Categories</option>
              {(Object.keys(TYPE_LABELS) as ContentType[]).map(type => (
                <option key={type} value={type}>{TYPE_LABELS[type]}</option>
              ))}
            </select>
          )}

          <select
            value={statusFilter}
            onChange={event => {
              setStatusFilter(event.target.value as 'all' | AnnouncementStatus);
              setPage(0);
            }}
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[12px] font-semibold text-gray-700 outline-none"
          >
            <option value="all">All Status</option>
            <option value="published">Active</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="scheduled">Scheduled</option>
            <option value="archived">Archived</option>
          </select>

          <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
            <Filter className="h-3 w-3 text-gray-400" />
            <select
              value={sortBy}
              onChange={event => setSortBy(event.target.value as SortField)}
              className="bg-transparent text-[12px] font-semibold text-gray-700 outline-none"
            >
              <option value="updated">Sort: Updated</option>
              <option value="views">Sort: Views</option>
              <option value="title">Sort: Title</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
              setTypeFilter(routeType ?? 'all');
              setSortBy('updated');
              setPage(0);
            }}
            className="rounded-xl border border-gray-200 p-2.5 text-gray-500 transition-colors hover:bg-gray-100"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-[22px] border-2 border-orange-200 bg-white p-3 shadow-sm">
          <span className="rounded-lg bg-orange-100 px-3 py-1.5 text-[12px] font-bold text-orange-700">
            {selected.size} selected
          </span>
          <button
            type="button"
            onClick={() => {
              selected.forEach(id => statusMutation.mutate({ id, status: 'published' }));
              setSelected(new Set());
            }}
            className="rounded-xl bg-green-50 px-3 py-2 text-[12px] font-bold text-green-700 transition-colors hover:bg-green-100"
          >
            Publish
          </button>
          <button
            type="button"
            onClick={() => {
              selected.forEach(id => statusMutation.mutate({ id, status: 'draft' }));
              setSelected(new Set());
            }}
            className="rounded-xl bg-amber-50 px-3 py-2 text-[12px] font-bold text-amber-700 transition-colors hover:bg-amber-100"
          >
            Move to Draft
          </button>
          <button
            type="button"
            onClick={() => {
              selected.forEach(id => deleteMutation.mutate(id));
              setSelected(new Set());
            }}
            className="rounded-xl bg-red-50 px-3 py-2 text-[12px] font-bold text-red-600 transition-colors hover:bg-red-100"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ml-auto rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            Clear
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-[22px] border border-gray-100 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="py-16 text-center">
            <Search className="mx-auto mb-3 h-8 w-8 text-gray-200" />
            <p className="text-[13px] text-gray-400">No posts match your filters.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-3 border-b border-[#e8ecf8] bg-gradient-to-r from-[#f8f9ff] to-[#f0f4ff] px-4 py-3">
              <button type="button" onClick={toggleAll} className="text-gray-400 transition-colors hover:text-orange-500">
                {allOnPageSelected ? <CheckSquare className="h-4 w-4 text-orange-500" /> : <Square className="h-4 w-4" />}
              </button>
              <span className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Post</span>
              <span className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Category</span>
              <span className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Status</span>
              <span className="text-right text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Views</span>
              <span className="text-right text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Actions</span>
            </div>

            {announcements.map((post, index) => {
              const categoryTone = TYPE_COLORS[post.type];
              const statusTone = STATUS_STYLES[post.status];
              const CategoryIcon = categoryTone.icon;
              const StatusIcon = statusTone.icon;
              const isSelected = selected.has(post.id);

              return (
                <div
                  key={post.id}
                  className={cn(
                    'grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-3 border-b border-gray-50 px-4 py-3.5 transition-colors hover:bg-orange-50/20',
                    index % 2 === 1 && 'bg-gray-50/20',
                    isSelected && 'bg-orange-50/40'
                  )}
                >
                  <button type="button" onClick={() => toggleOne(post.id)} className="text-gray-400 transition-colors hover:text-orange-500">
                    {isSelected ? <CheckSquare className="h-4 w-4 text-orange-500" /> : <Square className="h-4 w-4" />}
                  </button>

                  <div className="flex min-w-0 items-center gap-2.5">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[8px] font-extrabold text-white"
                      style={{ background: 'linear-gradient(135deg, #1a237e, #283593)' }}
                    >
                      {post.organization.split(' ').map(part => part[0]).join('').slice(0, 3)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-gray-800" title={post.title}>
                        {post.title}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {post.organization} · {formatDate(post.updatedAt)} {post.totalPosts ? `· ${post.totalPosts.toLocaleString('en-IN')} posts` : ''}
                      </p>
                    </div>
                  </div>

                  <div>
                    <span
                      className="flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold"
                      style={{ background: categoryTone.bg, border: `1px solid ${categoryTone.border}`, color: categoryTone.text }}
                    >
                      <CategoryIcon className="h-2.5 w-2.5" />
                      {TYPE_LABELS[post.type]}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const nextStatus: Record<AnnouncementStatus, AnnouncementStatus> = {
                        draft: 'published',
                        pending: 'published',
                        scheduled: 'published',
                        published: 'archived',
                        archived: 'draft',
                      };
                      statusMutation.mutate({ id: post.id, status: nextStatus[post.status] });
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <span
                      className="flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold"
                      style={{ background: statusTone.bg, color: statusTone.color }}
                    >
                      <StatusIcon className="h-2.5 w-2.5" />
                      {statusTone.label}
                    </span>
                  </button>

                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1 text-[12px] font-bold text-gray-700">
                      <Eye className="h-3 w-3 text-gray-400" />
                      {formatCompactNumber(post.viewCount || 0)}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1.5">
                    <Link
                      href={`/announcements/${post.id}`}
                      className="rounded-lg bg-blue-50 p-2 text-blue-600 transition-colors hover:bg-blue-100"
                      title="Edit"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(post.id)}
                      className="rounded-lg bg-red-50 p-2 text-red-500 transition-colors hover:bg-red-100"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/30 px-4 py-3.5">
                <span className="text-[11px] text-gray-400">
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total} posts
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage(current => Math.max(0, current - 1))}
                    disabled={page === 0}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-40"
                  >
                    Prev
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, index) => index).map(number => (
                    <button
                      key={number}
                      type="button"
                      onClick={() => setPage(number)}
                      className={cn(
                        'h-8 w-8 rounded-lg text-[12px] font-bold transition-all',
                        page === number ? 'text-white' : 'text-gray-500 hover:bg-gray-100'
                      )}
                      style={page === number ? { background: 'linear-gradient(135deg, #e65100, #bf360c)' } : undefined}
                    >
                      {number + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPage(current => Math.min(totalPages - 1, current + 1))}
                    disabled={page >= totalPages - 1}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[rgba(10,20,60,0.55)] p-4 backdrop-blur-[4px]">
          <div className="w-full max-w-sm rounded-[22px] bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] bg-red-100">
              <Trash2 className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="mb-2 text-[16px] font-extrabold text-gray-800">Delete this post?</h3>
            <p className="mb-5 text-[13px] text-gray-500">This will permanently remove the selected announcement.</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-[13px] font-semibold text-gray-600 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(deleteTarget)}
                className="flex-1 rounded-xl py-2.5 text-[13px] font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #c62828, #b71c1c)' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
