'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Clock3, Loader2, RefreshCcw, Search, Send, ShieldCheck, Sparkles, Target } from 'lucide-react';
import { toast } from 'sonner';
import {
  approveCmsPost,
  getEditorialWorkflowAlertsImpact,
  getEditorialWorkflowFreshness,
  getEditorialWorkflowQueue,
  getEditorialWorkflowSearchReadiness,
  getEditorialWorkflowSeo,
  getEditorialWorkflowSla,
  getEditorialWorkflowTrust,
  runEditorialFreshnessSweep,
} from '@/lib/api';
import type { CmsPost } from '@/lib/types';

function formatFreshnessMeta(item: CmsPost) {
  const daysToExpiry = item.freshness?.daysToExpiry;
  const daysSinceSource = item.freshness?.daysSinceSourceCapture;
  const chunks: string[] = [];

  if (daysToExpiry !== undefined) chunks.push(`Days to expiry: ${daysToExpiry}`);
  if (daysSinceSource !== undefined) chunks.push(`Source checked ${daysSinceSource} day(s) ago`);
  if (chunks.length === 0) return 'No explicit freshness timeline';
  return chunks.join(' · ');
}

export function WorkflowPage() {
  const queryClient = useQueryClient();
  const pendingQuery = useQuery({
    queryKey: ['editorial-workflow-queue'],
    queryFn: async () => (await getEditorialWorkflowQueue()).data,
  });
  const slaQuery = useQuery({
    queryKey: ['editorial-workflow-sla'],
    queryFn: async () => (await getEditorialWorkflowSla()).data,
  });
  const freshnessQuery = useQuery({
    queryKey: ['editorial-workflow-freshness'],
    queryFn: async () => (await getEditorialWorkflowFreshness()).data,
  });
  const trustQuery = useQuery({
    queryKey: ['editorial-workflow-trust'],
    queryFn: async () => (await getEditorialWorkflowTrust(18)).data,
  });
  const searchReadinessQuery = useQuery({
    queryKey: ['editorial-workflow-search-readiness'],
    queryFn: async () => (await getEditorialWorkflowSearchReadiness(18)).data,
  });
  const seoQuery = useQuery({
    queryKey: ['editorial-workflow-seo'],
    queryFn: async () => (await getEditorialWorkflowSeo(18)).data,
  });
  const alertImpactQuery = useQuery({
    queryKey: ['editorial-workflow-alert-impact'],
    queryFn: async () => (await getEditorialWorkflowAlertsImpact(12)).data,
  });

  const refreshWorkflowQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['editorial-workflow-queue'] }),
      queryClient.invalidateQueries({ queryKey: ['editorial-workflow-sla'] }),
      queryClient.invalidateQueries({ queryKey: ['editorial-workflow-freshness'] }),
      queryClient.invalidateQueries({ queryKey: ['editorial-workflow-trust'] }),
      queryClient.invalidateQueries({ queryKey: ['editorial-workflow-search-readiness'] }),
      queryClient.invalidateQueries({ queryKey: ['editorial-workflow-seo'] }),
      queryClient.invalidateQueries({ queryKey: ['editorial-workflow-alert-impact'] }),
    ]);
  };

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveCmsPost(id),
    onSuccess: async () => {
      await refreshWorkflowQueries();
      toast.success('Post approved.');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to approve post'),
  });

  const previewSweepMutation = useMutation({
    mutationFn: () => runEditorialFreshnessSweep({ dryRun: true, limit: 100, note: 'Manual dry-run from workflow dashboard' }),
    onSuccess: ({ data }) => {
      toast.message(`Freshness sweep preview: ${data.totalCandidates} candidate(s), ${data.failures.length} failure(s).`);
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to preview freshness sweep'),
  });

  const executeSweepMutation = useMutation({
    mutationFn: () => runEditorialFreshnessSweep({ dryRun: false, limit: 100, note: 'Manual archive sweep from workflow dashboard' }),
    onSuccess: async ({ data }) => {
      await refreshWorkflowQueries();
      toast.success(`Archived ${data.archivedCount} post(s). Revalidated ${data.revalidatedCount} page(s).`);
      if (data.failures.length > 0) {
        toast.warning(`${data.failures.length} post(s) could not be archived. Check freshness queue.`);
      }
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to execute freshness sweep'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-black text-gray-900">Editorial Workflow</h1>
        <p className="text-[12px] text-gray-500">Review, approve, and continuously maintain trust, freshness, search quality, and SEO readiness.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Send size={15} />
            <h2 className="text-[14px] font-bold text-gray-900">Pending Review</h2>
          </div>
          {pendingQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading queue…</div>
          ) : pendingQuery.data && pendingQuery.data.length > 0 ? (
            <div className="space-y-3">
              {pendingQuery.data.map((item) => (
                <div key={item.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link href={`/announcements/${item.id}`} className="text-[14px] font-bold text-gray-900 hover:underline">
                        {item.title}
                      </Link>
                      <div className="mt-1 text-[12px] text-gray-500">{item.organization?.name || 'No organization tagged'} · {item.type}</div>
                      <div className="mt-1 text-[11px] text-gray-400">Updated {new Date(item.updatedAt).toLocaleString('en-IN')}</div>
                      {item.readiness?.issueCount ? (
                        <div className="mt-2 text-[11px] font-semibold text-red-700">{item.readiness.issueCount} readiness issue(s)</div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => approveMutation.mutate(item.id)}
                      disabled={approveMutation.isPending || (item.readiness?.canApprove === false)}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-3 py-2 text-[12px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} />
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No posts are waiting in review.</p>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Clock3 size={15} />
              <h2 className="text-[14px] font-bold text-gray-900">SLA Watch</h2>
            </div>
            {slaQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading SLA…</div>
            ) : slaQuery.data && slaQuery.data.length > 0 ? (
              <div className="space-y-3">
                {slaQuery.data.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-red-100 bg-red-50 p-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={14} className="mt-0.5 text-red-600" />
                      <div>
                        <div className="font-semibold text-red-900">{item.title}</div>
                        <div className="text-[12px] text-red-700">{item.hoursOverdue} hours overdue</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No SLA violations right now.</p>
            )}
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck size={15} />
                <h2 className="text-[14px] font-bold text-gray-900">Freshness Watch</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => previewSweepMutation.mutate()}
                  disabled={previewSweepMutation.isPending || executeSweepMutation.isPending}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <Search size={12} />
                  Preview Sweep
                </button>
                <button
                  type="button"
                  onClick={() => executeSweepMutation.mutate()}
                  disabled={previewSweepMutation.isPending || executeSweepMutation.isPending}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-2.5 py-1.5 text-[11px] font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50"
                >
                  <RefreshCcw size={12} className={executeSweepMutation.isPending ? 'animate-spin' : ''} />
                  Archive Expired
                </button>
              </div>
            </div>
            {freshnessQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading freshness…</div>
            ) : freshnessQuery.data && freshnessQuery.data.length > 0 ? (
              <div className="space-y-3">
                {freshnessQuery.data.slice(0, 6).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                    <div className="font-semibold text-amber-900">{item.title}</div>
                    <div className="mt-1 text-[12px] text-amber-700">{item.freshness?.staleReason || 'Needs freshness review'}</div>
                    <div className="mt-1 text-[11px] text-amber-600">
                      {formatFreshnessMeta(item)}{item.readiness?.warningCount ? ` · ${item.readiness.warningCount} warning(s)` : ''}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No freshness issues right now.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck size={15} />
            <h2 className="text-[14px] font-bold text-gray-900">Trust Queue</h2>
          </div>
          {trustQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading trust…</div>
          ) : trustQuery.data && trustQuery.data.length > 0 ? (
            <div className="space-y-3">
              {trustQuery.data.slice(0, 5).map((item) => (
                <div key={item.id} className="rounded-xl border border-red-100 bg-red-50 p-3">
                  <div className="text-[13px] font-semibold text-red-900">{item.title}</div>
                  <div className="mt-1 text-[11px] text-red-700">
                    Verification: {item.trust?.verificationStatus || 'unknown'}
                    {item.trust?.sourceNeedsRefresh ? ' · Source refresh needed' : ''}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No trust issues in queue.</p>
          )}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Search size={15} />
            <h2 className="text-[14px] font-bold text-gray-900">Search Readiness</h2>
          </div>
          {searchReadinessQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading search queue…</div>
          ) : searchReadinessQuery.data && searchReadinessQuery.data.length > 0 ? (
            <div className="space-y-3">
              {searchReadinessQuery.data.slice(0, 5).map((item) => (
                <div key={item.id} className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                  <div className="text-[13px] font-semibold text-blue-900">{item.title}</div>
                  <div className="mt-1 text-[11px] text-blue-700">
                    Terms: {item.searchMeta?.termCount || 0}
                    {item.searchMeta?.coverageScore !== undefined ? ` · Coverage ${item.searchMeta.coverageScore}%` : ''}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Search readiness looks healthy.</p>
          )}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={15} />
            <h2 className="text-[14px] font-bold text-gray-900">SEO Readiness</h2>
          </div>
          {seoQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading SEO queue…</div>
          ) : seoQuery.data && seoQuery.data.length > 0 ? (
            <div className="space-y-3">
              {seoQuery.data.slice(0, 5).map((item) => (
                <div key={item.id} className="rounded-xl border border-fuchsia-100 bg-fuchsia-50 p-3">
                  <div className="text-[13px] font-semibold text-fuchsia-900">{item.title}</div>
                  <div className="mt-1 text-[11px] text-fuchsia-700">
                    SEO desc: {(item.seo?.effectiveDescription || '').length} chars
                    {item.readiness?.publishIssueCount ? ` · ${item.readiness.publishIssueCount} publish blocker(s)` : ''}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">SEO queue is clear.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Target size={15} />
          <h2 className="text-[14px] font-bold text-gray-900">Alert Impact Watch</h2>
        </div>
        {alertImpactQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading alert impact…</div>
        ) : alertImpactQuery.data && alertImpactQuery.data.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {alertImpactQuery.data.map((item) => (
              <div key={item.post.id} className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                <div className="text-[13px] font-semibold text-emerald-900">{item.post.title}</div>
                <div className="mt-1 text-[11px] text-emerald-700">
                  Reach: {item.preview.total} · Instant {item.preview.instant} · Daily {item.preview.daily} · Weekly {item.preview.weekly}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No high-impact alert candidates found.</p>
        )}
      </div>
    </div>
  );
}
