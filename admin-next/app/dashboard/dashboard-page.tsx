'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BellRing,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FilePlus2,
  HeartPulse,
  Loader2,
  Megaphone,
  SearchCheck,
  ShieldAlert,
  Users,
} from 'lucide-react';
import {
  getCampaigns,
  getEditorialAuditLog,
  getEditorialDashboard,
  getEditorialWorkflowFreshness,
  getEditorialWorkflowQueue,
  getEditorialWorkflowSeo,
  getEditorialWorkflowSla,
  getSEOMetrics,
  getSubscriberStats,
  getSystemHealth,
  getUpcomingDeadlines,
} from '@/lib/api';

type QueryState = {
  isLoading: boolean;
  isError: boolean;
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function SectionState({ query, loadingLabel, children }: { query: QueryState; loadingLabel: string; children: ReactNode }) {
  if (query.isLoading) {
    return <div className="flex items-center gap-2 py-3 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> {loadingLabel}</div>;
  }
  if (query.isError) {
    return <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-sm text-gray-500">Unavailable</div>;
  }
  return <>{children}</>;
}

function Panel({ title, icon, href, children }: { title: string; icon: ReactNode; href?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-gray-900">
          {icon}
          <h2 className="text-[14px] font-bold">{title}</h2>
        </div>
        {href ? <Link href={href} className="text-[12px] font-semibold text-[#e65100] hover:underline">Open <ArrowRight className="inline h-3 w-3" /></Link> : null}
      </div>
      {children}
    </section>
  );
}

function QueueCard({ href, label, description, value, unavailable, tone = 'slate' }: {
  href: string;
  label: string;
  description: string;
  value?: string | number;
  unavailable?: boolean;
  tone?: 'slate' | 'red' | 'amber' | 'purple' | 'green';
}) {
  const tones = {
    slate: 'border-slate-200 bg-slate-50 text-slate-900',
    red: 'border-red-200 bg-red-50 text-red-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    purple: 'border-purple-200 bg-purple-50 text-purple-900',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  };
  return (
    <Link href={href} className={`group rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[13px] font-bold">{label}</div>
          <div className="mt-1 text-[11px] opacity-70">{description}</div>
        </div>
        <div className="text-right">
          <div className="text-[20px] font-black">{unavailable ? '—' : value}</div>
          <div className="text-[10px] font-semibold uppercase tracking-wide opacity-60">{unavailable ? 'Unavailable' : 'Open'}</div>
        </div>
      </div>
    </Link>
  );
}

export function DashboardPage() {
  const dashboardQuery = useQuery({
    queryKey: ['editorial-dashboard'],
    queryFn: async () => (await getEditorialDashboard()).data,
    retry: false,
  });
  const pendingQuery = useQuery({
    queryKey: ['editorial-workflow-queue'],
    queryFn: async () => (await getEditorialWorkflowQueue()).data,
    retry: false,
  });
  const slaQuery = useQuery({
    queryKey: ['editorial-workflow-sla'],
    queryFn: async () => (await getEditorialWorkflowSla()).data,
    retry: false,
  });
  const freshnessQuery = useQuery({
    queryKey: ['editorial-workflow-freshness'],
    queryFn: async () => (await getEditorialWorkflowFreshness()).data,
    retry: false,
  });
  const deadlinesQuery = useQuery({
    queryKey: ['upcoming-deadlines'],
    queryFn: async () => (await getUpcomingDeadlines(8)).data,
    retry: false,
  });
  const campaignsQuery = useQuery({
    queryKey: ['admin-campaigns'],
    queryFn: async () => (await getCampaigns()).data,
    retry: false,
  });
  const workflowSeoQuery = useQuery({
    queryKey: ['editorial-workflow-seo'],
    queryFn: async () => (await getEditorialWorkflowSeo(12)).data,
    retry: false,
  });
  const seoMetricsQuery = useQuery({
    queryKey: ['admin-seo'],
    queryFn: async () => (await getSEOMetrics()).data,
    retry: false,
  });
  const healthQuery = useQuery({
    queryKey: ['admin-health'],
    queryFn: async () => (await getSystemHealth()).data,
    retry: false,
  });
  const subscribersQuery = useQuery({
    queryKey: ['alert-subscriber-stats'],
    queryFn: async () => (await getSubscriberStats()).data,
    retry: false,
  });
  const auditQuery = useQuery({
    queryKey: ['editorial-audit-log', 'dashboard'],
    queryFn: async () => (await getEditorialAuditLog({ limit: 6 })).data,
    retry: false,
  });

  const dashboard = dashboardQuery.data;
  const failedCampaigns = (campaignsQuery.data ?? []).filter((campaign) => campaign.status === 'failed' || campaign.status === 'partial_failed');
  const healthStatus = healthQuery.data?.health.status;
  const healthyServices = healthQuery.data?.services.services.filter((service) => service.status === 'up').length;
  const totalServices = healthQuery.data?.services.services.length;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-[linear-gradient(135deg,#060d2e_0%,#0d1b6e_45%,#1a237e_100%)] px-5 py-5 text-white sm:px-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-200">Operations Command Center</div>
            <h1 className="mt-2 text-[24px] font-black">What needs attention now</h1>
            <p className="mt-1 max-w-2xl text-[13px] text-blue-200">Live editorial, delivery, audience, SEO, and platform signals from the admin APIs.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { href: '/announcements/new', label: 'New Post', icon: FilePlus2 },
              { href: '/workflow', label: 'Review Workflow', icon: FileCheck2 },
              { href: '/notifications', label: 'Open Campaigns', icon: Megaphone },
              { href: '/seo', label: 'Open SEO', icon: SearchCheck },
              { href: '/system-admin', label: 'Open System Admin', icon: HeartPulse },
            ].map((action) => {
              const Icon = action.icon;
              return <Link key={action.href} href={action.href} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-[12px] font-semibold hover:bg-white/20"><Icon className="h-4 w-4" />{action.label}</Link>;
            })}
          </div>
        </div>
      </div>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-[#e65100]" />
          <h2 className="text-[15px] font-black text-gray-900">Action Queue</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <QueueCard href="/workflow" label="Review pending posts" description="Posts waiting for editorial review" value={pendingQuery.data?.length ?? 0} unavailable={pendingQuery.isError || pendingQuery.isLoading} tone="amber" />
          <QueueCard href="/workflow" label="Fix stale / expiring" description="Content in the freshness queue" value={freshnessQuery.data?.length ?? 0} unavailable={freshnessQuery.isError || freshnessQuery.isLoading} tone="red" />
          <QueueCard href="/notifications" label="Retry failed campaigns" description="Failed or partially failed delivery" value={failedCampaigns.length} unavailable={campaignsQuery.isError || campaignsQuery.isLoading} tone="red" />
          <QueueCard href="/seo" label="Open SEO issues" description="Posts in the editorial SEO queue" value={workflowSeoQuery.data?.length ?? 0} unavailable={workflowSeoQuery.isError || workflowSeoQuery.isLoading} tone="purple" />
          <QueueCard href="/system-admin" label="Check system health" description="Current platform health status" value={healthStatus ? healthStatus.replace('_', ' ') : 'Unknown'} unavailable={healthQuery.isError || healthQuery.isLoading} tone={healthStatus === 'healthy' ? 'green' : 'slate'} />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-[#e65100]" />
          <h2 className="text-[15px] font-black text-gray-900">Editorial Overview</h2>
        </div>
        <SectionState query={dashboardQuery} loadingLabel="Loading editorial overview…">
          {dashboard ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: 'Total Posts', value: dashboard.total, icon: Briefcase },
                  { label: 'Published', value: dashboard.published, icon: FileCheck2 },
                  { label: 'In Review', value: dashboard.inReview, icon: Clock3 },
                  { label: 'Drafts', value: dashboard.byStatus.draft || 0, icon: Briefcase },
                ].map((item) => {
                  const Icon = item.icon;
                  return <div key={item.label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><div><div className="text-[22px] font-black text-gray-900">{item.value}</div><div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">{item.label}</div></div><Icon className="h-5 w-5 text-[#e65100]" /></div></div>;
                })}
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                <Panel title="Type Breakdown" icon={<BarChart3 className="h-4 w-4" />}>
                  <div className="space-y-2">
                    {Object.entries(dashboard.byType).map(([key, value]) => <div key={key} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2"><span className="text-[12px] font-semibold capitalize text-gray-700">{key.replace('-', ' ')}</span><span className="text-[12px] font-bold text-gray-900">{value}</span></div>)}
                    {Object.keys(dashboard.byType).length === 0 ? <p className="text-sm text-gray-500">No post types yet.</p> : null}
                  </div>
                </Panel>
                <Panel title="Recently Updated" icon={<Activity className="h-4 w-4" />} href="/announcements">
                  <div className="space-y-2">
                    {dashboard.recentPosts.slice(0, 5).map((post) => <div key={post.id} className="rounded-xl bg-gray-50 px-3 py-3"><Link href={`/announcements/${post.id}`} className="text-[13px] font-semibold text-gray-900 hover:underline">{post.title}</Link><div className="mt-1 text-[11px] text-gray-500">{post.organization?.name || 'No organization'} · {post.status.replace('_', ' ')} · {formatDate(post.updatedAt)}</div></div>)}
                    {dashboard.recentPosts.length === 0 ? <p className="text-sm text-gray-500">No recently updated posts.</p> : null}
                  </div>
                </Panel>
              </div>
            </>
          ) : null}
        </SectionState>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Pending & Blocked Content" icon={<FileCheck2 className="h-4 w-4" />} href="/workflow">
          <SectionState query={pendingQuery} loadingLabel="Loading workflow queue…">
            <div className="space-y-2">
              {(pendingQuery.data ?? []).slice(0, 5).map((post) => <Link key={post.id} href={`/announcements/${post.id}`} className="block rounded-xl border border-gray-100 bg-gray-50 p-3 hover:border-amber-200"><div className="line-clamp-1 text-[13px] font-semibold text-gray-900">{post.title}</div><div className="mt-1 text-[11px] text-gray-500">{post.readiness?.issueCount ? `${post.readiness.issueCount} approval blocker(s)` : 'Waiting for review'} · Updated {formatDate(post.updatedAt)}</div></Link>)}
              {pendingQuery.data?.length === 0 ? <p className="text-sm text-gray-500">No posts are waiting for review.</p> : null}
            </div>
          </SectionState>
        </Panel>

        <Panel title="SLA Violations" icon={<AlertTriangle className="h-4 w-4 text-red-600" />} href="/workflow">
          <SectionState query={slaQuery} loadingLabel="Loading SLA status…">
            <div className="space-y-2">
              {(slaQuery.data ?? []).slice(0, 5).map((item) => <Link key={item.id} href={`/announcements/${item.id}`} className="block rounded-xl border border-red-100 bg-red-50 p-3"><div className="line-clamp-1 text-[13px] font-semibold text-red-900">{item.title}</div><div className="mt-1 text-[11px] font-medium text-red-700">{item.hoursOverdue} hours overdue</div></Link>)}
              {slaQuery.data?.length === 0 ? <div className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" /> No SLA violations.</div> : null}
            </div>
          </SectionState>
        </Panel>

        <Panel title="Upcoming Deadlines" icon={<CalendarClock className="h-4 w-4" />} href="/calendar">
          <SectionState query={deadlinesQuery} loadingLabel="Loading deadlines…">
            <div className="space-y-2">
              {(deadlinesQuery.data ?? []).slice(0, 5).map((item) => <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3"><div className="min-w-0"><div className="line-clamp-1 text-[13px] font-semibold text-gray-900">{item.title}</div><div className="mt-1 text-[11px] text-gray-500">{new Date(item.deadline).toLocaleDateString('en-IN')} · {item.type}</div></div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${item.daysLeft <= 3 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>{item.daysLeft}d</span></div>)}
              {deadlinesQuery.data?.length === 0 ? <p className="text-sm text-gray-500">No upcoming deadlines.</p> : null}
            </div>
          </SectionState>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <Panel title="Campaign Failures" icon={<BellRing className="h-4 w-4" />} href="/notifications">
          <SectionState query={campaignsQuery} loadingLabel="Loading campaigns…">
            <div className="space-y-2">
              {failedCampaigns.slice(0, 4).map((campaign) => <div key={campaign.id} className="rounded-xl border border-red-100 bg-red-50 p-3"><div className="line-clamp-1 text-[13px] font-semibold text-red-900">{campaign.title}</div><div className="mt-1 text-[11px] text-red-700">{campaign.status.replace('_', ' ')} · {campaign.failedCount.toLocaleString('en-IN')} failed</div></div>)}
              {failedCampaigns.length === 0 ? <div className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" /> No failed campaigns.</div> : null}
            </div>
          </SectionState>
        </Panel>

        <Panel title="SEO & Content Quality" icon={<SearchCheck className="h-4 w-4" />} href="/seo">
          <SectionState query={seoMetricsQuery} loadingLabel="Loading SEO health…">
            <div className="rounded-xl bg-purple-50 p-3"><div className="text-[26px] font-black text-purple-900">{seoMetricsQuery.data?.metrics.healthScore}%</div><div className="text-[11px] font-semibold text-purple-700">SEO health score</div></div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-center"><div className="rounded-xl bg-gray-50 p-2"><div className="text-[16px] font-bold text-gray-900">{seoMetricsQuery.data?.coverage.missing}</div><div className="text-[10px] text-gray-500">Missing policy</div></div><div className="rounded-xl bg-gray-50 p-2"><div className="text-[16px] font-bold text-gray-900">{workflowSeoQuery.isError || workflowSeoQuery.isLoading ? '—' : (workflowSeoQuery.data?.length ?? '—')}</div><div className="text-[10px] text-gray-500">{workflowSeoQuery.isError ? 'Unavailable' : 'Content issues'}</div></div></div>
          </SectionState>
        </Panel>

        <Panel title="System Health" icon={<HeartPulse className="h-4 w-4" />} href="/system-admin">
          <SectionState query={healthQuery} loadingLabel="Checking system health…">
            <div className={`rounded-xl p-3 ${healthStatus === 'healthy' ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`}><div className="text-[20px] font-black capitalize">{healthStatus || 'Unknown'}</div><div className="text-[11px] font-semibold opacity-70">Platform status</div></div>
            <div className="mt-3 space-y-2 text-[12px]"><div className="flex justify-between"><span className="text-gray-500">Services online</span><span className="font-bold text-gray-900">{healthyServices}/{totalServices}</span></div><div className="flex justify-between"><span className="text-gray-500">Recent errors</span><span className="font-bold text-gray-900">{healthQuery.data?.errors.length ?? 0}</span></div></div>
          </SectionState>
        </Panel>

        <Panel title="Subscribers" icon={<Users className="h-4 w-4" />} href="/subscribers">
          <SectionState query={subscribersQuery} loadingLabel="Loading subscribers…">
            <div className="grid grid-cols-2 gap-2"><div className="rounded-xl bg-blue-50 p-3"><div className="text-[22px] font-black text-blue-900">{subscribersQuery.data?.active.toLocaleString('en-IN')}</div><div className="text-[10px] font-semibold text-blue-700">Active</div></div><div className="rounded-xl bg-emerald-50 p-3"><div className="text-[22px] font-black text-emerald-900">{subscribersQuery.data?.verified.toLocaleString('en-IN')}</div><div className="text-[10px] font-semibold text-emerald-700">Verified</div></div></div>
            <div className="mt-3 flex justify-between text-[12px]"><span className="text-gray-500">Total subscriptions</span><span className="font-bold text-gray-900">{subscribersQuery.data?.total.toLocaleString('en-IN')}</span></div>
          </SectionState>
        </Panel>
      </div>

      <Panel title="Recent Audit Activity" icon={<Activity className="h-4 w-4" />} href="/audit-log">
        <SectionState query={auditQuery} loadingLabel="Loading recent activity…">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {(auditQuery.data ?? []).map((entry) => <div key={entry.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3"><div className="line-clamp-2 text-[13px] font-semibold text-gray-900">{entry.summary}</div><div className="mt-2 text-[11px] text-gray-500">{entry.action} · {entry.actorRole || 'system'} · {formatDate(entry.createdAt)}</div></div>)}
            {auditQuery.data?.length === 0 ? <p className="text-sm text-gray-500">No recent audit activity.</p> : null}
          </div>
        </SectionState>
      </Panel>
    </div>
  );
}
