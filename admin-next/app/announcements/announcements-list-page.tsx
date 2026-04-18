'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, CheckCircle2, Clock3, Eye, Plus, RefreshCcw, Search, Send } from 'lucide-react';
import { toast } from 'sonner';
import { archiveCmsPost, approveCmsPost, getCmsPosts, publishCmsPost, submitCmsPost } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { CmsPost, EditorialStatus } from '@/lib/types';

const typeLabel: Record<CmsPost['type'], string> = {
  job: 'Jobs',
  result: 'Results',
  'admit-card': 'Admit Card',
  admission: 'Admission',
  'answer-key': 'Answer Key',
  syllabus: 'Syllabus',
};

const statusLabel: Record<EditorialStatus, string> = {
  draft: 'Draft',
  in_review: 'In Review',
  approved: 'Approved',
  published: 'Published',
  archived: 'Archived',
};

const statusColor: Record<EditorialStatus, string> = {
  draft: 'bg-amber-50 text-amber-700 border-amber-200',
  in_review: 'bg-blue-50 text-blue-700 border-blue-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  published: 'bg-green-50 text-green-700 border-green-200',
  archived: 'bg-slate-100 text-slate-700 border-slate-200',
};
const EMPTY_POSTS: CmsPost[] = [];

function formatDate(value?: string) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function canSubmit(post: CmsPost) {
  return post.status === 'draft' && (post.readiness?.canSubmit ?? true);
}

function canApprove(post: CmsPost, role?: string) {
  return post.status === 'in_review' && (post.readiness?.canApprove ?? true) && ['reviewer', 'admin', 'superadmin'].includes(role || '');
}

function canPublish(post: CmsPost, role?: string) {
  return post.status === 'approved' && (post.readiness?.canPublish ?? true) && ['admin', 'superadmin'].includes(role || '');
}

function canArchive(post: CmsPost, role?: string) {
  return ['approved', 'published'].includes(post.status) && ['admin', 'superadmin'].includes(role || '');
}

function CmsActionButton({
  label,
  icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {icon}
      {label}
    </button>
  );
}

export function AnnouncementsListPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | EditorialStatus>('all');
  const [type, setType] = useState<'all' | CmsPost['type']>('all');

  const query = useQuery({
    queryKey: ['cms-posts', search, status, type],
    queryFn: () =>
      getCmsPosts({
        search: search || undefined,
        status,
        type: type === 'all' ? undefined : type,
        limit: 100,
        sort: 'updated',
      }),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['cms-posts'] });

  const transitionMutation = useMutation({
    mutationFn: async ({ action, post }: { action: 'submit' | 'approve' | 'publish' | 'archive'; post: CmsPost }) => {
      if (action === 'submit') return submitCmsPost(post.id);
      if (action === 'approve') return approveCmsPost(post.id);
      if (action === 'publish') return publishCmsPost(post.id);
      return archiveCmsPost(post.id);
    },
    onSuccess: (_, variables) => {
      refresh();
      toast.success(`${variables.post.title} moved via ${variables.action}.`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update workflow state');
    },
  });

  const posts = query.data?.data ?? EMPTY_POSTS;
  const stats = useMemo(() => ({
    total: posts.length,
    draft: posts.filter((post) => post.status === 'draft').length,
    review: posts.filter((post) => post.status === 'in_review').length,
    published: posts.filter((post) => post.status === 'published').length,
  }), [posts]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-black text-gray-900">Editorial CMS</h1>
          <p className="text-[12px] text-gray-500">Live content inventory backed by the new post platform.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-[12px] font-semibold text-gray-700 hover:bg-gray-50"
          >
            <RefreshCcw size={14} />
            Refresh
          </button>
          <Link
            href="/announcements/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[#e65100] px-4 py-2.5 text-[12px] font-bold text-white hover:opacity-90"
          >
            <Plus size={14} />
            New Post
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Total', value: stats.total },
          { label: 'Draft', value: stats.draft },
          { label: 'In Review', value: stats.review },
          { label: 'Published', value: stats.published },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
            <div className="text-[20px] font-black text-gray-900">{item.value}</div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="flex min-w-56 flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
            <Search size={14} className="text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, slug, or keywords"
              className="w-full bg-transparent text-[13px] text-gray-700 outline-none"
            />
          </div>
          <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[12px] font-semibold text-gray-700">
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="in_review">In Review</option>
            <option value="approved">Approved</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <select value={type} onChange={(event) => setType(event.target.value as typeof type)} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[12px] font-semibold text-gray-700">
            <option value="all">All Types</option>
            <option value="job">Jobs</option>
            <option value="result">Results</option>
            <option value="admit-card">Admit Cards</option>
            <option value="admission">Admissions</option>
            <option value="answer-key">Answer Keys</option>
            <option value="syllabus">Syllabus</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">Post</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">Type</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">Status</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">Organization</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">Updated</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {query.isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">Loading posts…</td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">No posts matched the current filters.</td>
                </tr>
              ) : (
                posts.map((post) => (
                  <tr key={post.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 align-top">
                      <div className="font-semibold text-gray-900">{post.title}</div>
                      <div className="mt-1 text-[11px] text-gray-500">/{post.slug}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {post.readiness?.issueCount ? (
                          <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700">
                            {post.readiness.issueCount} issue(s)
                          </span>
                        ) : post.readiness?.warningCount ? (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">
                            {post.readiness.warningCount} warning(s)
                          </span>
                        ) : (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                            Ready
                          </span>
                        )}
                        {post.freshness?.expiresSoon ? (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">
                            Expiring Soon
                          </span>
                        ) : null}
                        {post.freshness?.isStale ? (
                          <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">
                            Stale
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-[12px] font-semibold text-gray-700">{typeLabel[post.type]}</td>
                    <td className="px-4 py-3 align-top">
                      <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-bold ${statusColor[post.status]}`}>
                        {statusLabel[post.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-[12px] text-gray-700">{post.organization?.name || '-'}</td>
                    <td className="px-4 py-3 align-top text-[12px] text-gray-700">{formatDate(post.updatedAt)}</td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/announcements/${post.id}`} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50">
                          <Eye size={12} />
                          Edit
                        </Link>
                        {canSubmit(post) ? (
                          <CmsActionButton
                            label="Submit"
                            icon={<Send size={12} />}
                            onClick={() => transitionMutation.mutate({ action: 'submit', post })}
                            disabled={transitionMutation.isPending}
                          />
                        ) : null}
                        {canApprove(post, user?.role) ? (
                          <CmsActionButton
                            label="Approve"
                            icon={<CheckCircle2 size={12} />}
                            onClick={() => transitionMutation.mutate({ action: 'approve', post })}
                            disabled={transitionMutation.isPending}
                          />
                        ) : null}
                        {canPublish(post, user?.role) ? (
                          <CmsActionButton
                            label="Publish"
                            icon={<Clock3 size={12} />}
                            onClick={() => transitionMutation.mutate({ action: 'publish', post })}
                            disabled={transitionMutation.isPending}
                          />
                        ) : null}
                        {canArchive(post, user?.role) ? (
                          <CmsActionButton
                            label="Archive"
                            icon={<Archive size={12} />}
                            onClick={() => transitionMutation.mutate({ action: 'archive', post })}
                            disabled={transitionMutation.isPending}
                          />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
