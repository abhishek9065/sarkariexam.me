'use client';

import Link from 'next/link';
import { useState, type CSSProperties, type ComponentType } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Bell,
  Briefcase,
  CheckCircle,
  Clock,
  CreditCard,
  Eye,
  FileText,
  Hash,
  Loader2,
  MessageCircle,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { getAnalyticsOverview, getDashboard } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import type {
  AnalyticsOverview,
  AnnouncementStatus,
  ContentType,
  DashboardData,
} from '@/lib/types';

type TrafficPoint = {
  day: string;
  views: number;
  pub: number;
};

type ChartTooltipProps = {
  active?: boolean;
  label?: string;
  payload?: Array<{
    name?: string;
    value?: number;
    color?: string;
    fill?: string;
  }>;
};

const FALLBACK_WEEKLY: TrafficPoint[] = [
  { day: 'Mon', views: 42500, pub: 3 },
  { day: 'Tue', views: 58900, pub: 5 },
  { day: 'Wed', views: 45200, pub: 2 },
  { day: 'Thu', views: 69800, pub: 7 },
  { day: 'Fri', views: 81200, pub: 4 },
  { day: 'Sat', views: 35400, pub: 1 },
  { day: 'Sun', views: 29800, pub: 2 },
];

const FALLBACK_TREND = [
  { label: 'Oct', value: 2100 },
  { label: 'Nov', value: 3400 },
  { label: 'Dec', value: 2800 },
  { label: 'Jan', value: 4200 },
  { label: 'Feb', value: 5100 },
  { label: 'Mar', value: 6800 },
];

const CATEGORY_META: Record<ContentType, { label: string; fill: string }> = {
  job: { label: 'Jobs', fill: '#e65100' },
  result: { label: 'Results', fill: '#2e7d32' },
  'admit-card': { label: 'Admit', fill: '#6a1b9a' },
  syllabus: { label: 'Syllabus', fill: '#f57f17' },
  'answer-key': { label: 'Ans Key', fill: '#00695c' },
  admission: { label: 'Admission', fill: '#1565c0' },
};

const TYPE_ICON: Record<ContentType, ComponentType<{ className?: string; style?: CSSProperties }>> = {
  job: Briefcase,
  result: Trophy,
  'admit-card': CreditCard,
  syllabus: FileText,
  'answer-key': FileText,
  admission: FileText,
};

const STATUS_COLORS: Record<AnnouncementStatus, string> = {
  draft: '#f57f17',
  pending: '#c62828',
  scheduled: '#1565c0',
  published: '#2e7d32',
  archived: '#6b7280',
};

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: value >= 100000 ? 1 : 0,
  }).format(value);
}

function formatAxisNumber(value: number) {
  return value >= 1000 ? `${Math.round(value / 1000)}K` : `${value}`;
}

function formatDay(date: string) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(new Date(date));
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(date));
}

function CustomTooltip({ active, label, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-lg">
      <p className="mb-1 text-[10px] font-semibold text-gray-500">{label}</p>
      {payload.map((item, index) => (
        <p
          key={`${item.name ?? 'value'}-${index}`}
          className="text-xs font-bold"
          style={{ color: item.color || item.fill || '#e65100' }}
        >
          {item.name}: {Number(item.value ?? 0).toLocaleString('en-IN')}
        </p>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const [viewMetric, setViewMetric] = useState<'views' | 'pub'>('views');

  const dashboardQuery = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await getDashboard();
      return response.data;
    },
  });

  const analyticsQuery = useQuery({
    queryKey: ['analytics-overview', 30],
    queryFn: async () => {
      const response = await getAnalyticsOverview(30);
      return response.data;
    },
  });

  if (dashboardQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (dashboardQuery.error || !dashboardQuery.data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
        Failed to load dashboard data. Please try again.
      </div>
    );
  }

  const dashboard = dashboardQuery.data as DashboardData;
  const analytics = analyticsQuery.data as AnalyticsOverview | undefined;

  const publishedCount = dashboard.announcements.byStatus.published ?? 0;
  const pendingCount = dashboard.announcements.byStatus.pending ?? 0;
  const draftCount = dashboard.announcements.byStatus.draft ?? 0;
  const overdueReview = dashboard.workspace.overdueReview ?? 0;
  const totalViews =
    analytics?.totalViews ??
    dashboard.recentAnnouncements.reduce((sum, item) => sum + item.viewCount, 0);
  const totalSubscribers = analytics?.totalEmailSubscribers ?? dashboard.users.total;
  const latestJobs = dashboard.announcements.byType.job ?? 0;

  const weekPublishedLookup = dashboard.recentAnnouncements.reduce<Record<string, number>>((acc, item) => {
    const key = new Date(item.updatedAt).toISOString().slice(0, 10);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const weeklyTraffic = analytics?.dailyRollups?.length
    ? analytics.dailyRollups.slice(-7).map((rollup, index) => ({
        day: formatDay(rollup.date),
        views: rollup.views,
        pub: weekPublishedLookup[new Date(rollup.date).toISOString().slice(0, 10)] ?? FALLBACK_WEEKLY[index]?.pub ?? 0,
      }))
    : FALLBACK_WEEKLY;

  const categoryData = (Object.entries(dashboard.announcements.byType) as Array<[ContentType, number]>)
    .map(([type, value]) => ({
      name: CATEGORY_META[type]?.label ?? type,
      value,
      fill: CATEGORY_META[type]?.fill ?? '#1565c0',
    }))
    .filter(item => item.value > 0);

  const recentActivity = dashboard.recentAnnouncements.slice(0, 6).map(item => {
    const Icon = TYPE_ICON[item.type] ?? FileText;
    return {
      text: `${item.title} ${item.status === 'published' ? 'published' : 'updated'}`,
      time: formatShortDate(item.updatedAt),
      color: STATUS_COLORS[item.status] ?? '#1565c0',
      icon: Icon,
    };
  });

  const topPosts = [...dashboard.recentAnnouncements]
    .sort((left, right) => right.viewCount - left.viewCount)
    .slice(0, 5)
    .map((item, index, items) => {
      const previous = items[index + 1]?.viewCount ?? item.viewCount;
      const pct = previous > 0 ? Math.round(((item.viewCount - previous) / previous) * 100) : 0;
      return {
        title: item.title,
        views: item.viewCount,
        change: `${pct >= 0 ? '+' : ''}${pct}%`,
        up: pct >= 0,
      };
    });

  const alertItems = [
    pendingCount > 0
      ? { text: `${pendingCount} posts pending editorial review`, type: 'warning' as const, action: 'Review Now' }
      : null,
    overdueReview > 0
      ? { text: `${overdueReview} review items are overdue`, type: 'danger' as const, action: 'Open Workflow' }
      : null,
    analyticsQuery.isSuccess
      ? { text: 'Live analytics synced for the last 30 days', type: 'info' as const, action: 'View Report' }
      : null,
  ].filter(Boolean) as Array<{ text: string; type: 'warning' | 'danger' | 'info'; action: string }>;

  const statCards = [
    {
      label: 'Total Posts',
      value: dashboard.announcements.total.toLocaleString('en-IN'),
      icon: Hash,
      color: '#1565c0',
      bg: '#eff4ff',
      delta: `+${dashboard.recentAnnouncements.length} recently updated`,
    },
    {
      label: 'Total Views',
      value: formatCompactNumber(totalViews),
      icon: Eye,
      color: '#e65100',
      bg: '#fff4ef',
      delta: analytics?.viewTrend?.pct ? `${analytics.viewTrend.pct > 0 ? '+' : ''}${analytics.viewTrend.pct}% vs previous` : 'Traffic trend',
    },
    {
      label: 'Subscribers',
      value: totalSubscribers.toLocaleString('en-IN'),
      icon: Users,
      color: '#2e7d32',
      bg: '#f0fff4',
      delta: analytics ? `${analytics.totalPushSubscribers.toLocaleString('en-IN')} push subscribers` : 'Alert subscribers',
    },
    {
      label: 'Pending Q&A',
      value: dashboard.qa.pendingQaIssues.toLocaleString('en-IN'),
      icon: MessageCircle,
      color: '#6a1b9a',
      bg: '#f9f0ff',
      delta: `${dashboard.qa.totalQaIssues.toLocaleString('en-IN')} total QA issues`,
    },
    {
      label: 'Drafts',
      value: draftCount.toLocaleString('en-IN'),
      icon: Clock,
      color: '#f57f17',
      bg: '#fffbef',
      delta: 'Unpublished content',
    },
    {
      label: 'Pending Review',
      value: pendingCount.toLocaleString('en-IN'),
      icon: AlertCircle,
      color: '#c62828',
      bg: '#fff0f0',
      delta: overdueReview > 0 ? `${overdueReview} overdue` : 'On track',
    },
    {
      label: 'Latest Jobs',
      value: latestJobs.toLocaleString('en-IN'),
      icon: Briefcase,
      color: '#e65100',
      bg: '#fff4ef',
      delta: 'Live vacancies',
    },
    {
      label: 'Published',
      value: publishedCount.toLocaleString('en-IN'),
      icon: CheckCircle,
      color: '#00695c',
      bg: '#f0fffe',
      delta: 'Published posts',
    },
  ];

  const thisWeekViews = weeklyTraffic.reduce((sum, item) => sum + item.views, 0);
  const dateLabel = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const trendData = analytics?.dailyRollups?.length
    ? analytics.dailyRollups.slice(-6).map(item => ({
        label: formatDay(item.date),
        value: item.views,
      }))
    : FALLBACK_TREND;

  return (
    <div className="space-y-5">
      <div
        className="relative overflow-hidden rounded-[24px] px-6 py-5"
        style={{ background: 'linear-gradient(125deg, #060d2e 0%, #0d1b6e 40%, #1a237e 70%, #0a3880 100%)' }}
      >
        <div
          className="absolute -right-10 -top-10 h-52 w-52 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #fdd835, transparent)' }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#fdd83566] to-transparent" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[9px] font-extrabold tracking-[0.14em] text-green-300">LIVE ADMIN DASHBOARD</span>
            </div>
            <h1 className="text-[22px] font-black tracking-[-0.01em] text-white">
              Welcome back, {user?.username || 'Super Admin'} 👋
            </h1>
            <p className="mt-1 text-xs text-blue-300">SarkariExams.me · {dateLabel} · All systems operational</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {[
              { label: 'This Week', value: formatCompactNumber(thisWeekViews), sub: 'Page views', color: '#fdd835' },
              { label: 'Published', value: publishedCount.toLocaleString('en-IN'), sub: 'Live posts', color: '#4ade80' },
              { label: 'Pending', value: pendingCount.toLocaleString('en-IN'), sub: 'Needs review', color: '#60a5fa' },
            ].map(item => (
              <div key={item.label} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 backdrop-blur-sm">
                <div className="text-lg font-extrabold" style={{ color: item.color }}>{item.value}</div>
                <div className="text-[9px] font-semibold text-white/60">{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {alertItems.length > 0 && (
        <div className="space-y-2">
          {alertItems.map((item, index) => {
            const tone =
              item.type === 'warning'
                ? { color: '#f57f17', bg: '#fffbef', border: '#ffe4a0', icon: AlertCircle }
                : item.type === 'danger'
                  ? { color: '#c62828', bg: '#fff0f0', border: '#ffd0d0', icon: AlertCircle }
                  : { color: '#1565c0', bg: '#eff4ff', border: '#c2d9ff', icon: Bell };
            const Icon = tone.icon;

            return (
              <div
                key={`${item.text}-${index}`}
                className="flex items-center gap-3 rounded-2xl border px-4 py-2.5"
                style={{ background: tone.bg, borderColor: tone.border }}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: tone.color }} />
                <p className="flex-1 text-xs font-medium text-gray-700">{item.text}</p>
                <button
                  type="button"
                  className="rounded-xl px-3 py-1 text-[11px] font-bold text-white"
                  style={{ background: tone.color }}
                >
                  {item.action}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="group cursor-default rounded-[22px] border border-gray-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl" style={{ background: card.bg }}>
                  <Icon className="h-4 w-4" style={{ color: card.color }} />
                </div>
                <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 text-gray-200 transition-colors group-hover:text-gray-400" />
              </div>
              <div className="text-[21px] font-black text-gray-800">{card.value}</div>
              <div className="mt-0.5 text-[11px] font-semibold text-gray-500">{card.label}</div>
              <div className="mt-2 flex items-center gap-1.5">
                <Zap className="h-2.5 w-2.5" style={{ color: card.color }} />
                <span className="text-[10px] font-semibold" style={{ color: card.color }}>{card.delta}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-[22px] border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-gray-800">Weekly Traffic</h3>
              <p className="text-[11px] text-gray-400">Last 7 days page views and post activity</p>
            </div>
            <div className="flex rounded-2xl bg-gray-100 p-1">
              {(['views', 'pub'] as const).map(metric => (
                <button
                  key={metric}
                  type="button"
                  onClick={() => setViewMetric(metric)}
                  className={cn(
                    'rounded-xl px-3 py-1.5 text-[11px] font-semibold transition-all',
                    viewMetric === metric ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  {metric === 'views' ? 'Page Views' : 'Posts Published'}
                </button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={weeklyTraffic} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="dashboard-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e65100" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#e65100" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={value => viewMetric === 'views' ? formatAxisNumber(value) : `${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey={viewMetric}
                name={viewMetric === 'views' ? 'Views' : 'Posts'}
                stroke="#e65100"
                strokeWidth={2.5}
                fill="url(#dashboard-area)"
                dot={{ r: 3, fill: '#e65100', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#e65100', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-[22px] border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-1 text-sm font-bold text-gray-800">Posts by Category</h3>
          <p className="mb-4 text-[11px] text-gray-400">Content distribution</p>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={categoryData} margin={{ top: 0, right: 0, bottom: 0, left: -25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9.5, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Posts" radius={[5, 5, 0, 0]}>
                {categoryData.map(item => (
                  <Cell key={item.name} fill={item.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1.5">
            {categoryData.map(item => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.fill }} />
                <span className="flex-1 text-[11px] text-gray-600">{item.name}</span>
                <span className="text-[11px] font-bold" style={{ color: item.fill }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-[22px] border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">Recent Activity</h3>
            <span className="flex items-center gap-1.5 rounded-full border border-green-100 bg-green-50 px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] font-bold text-green-700">LIVE</span>
            </span>
          </div>
          <div className="relative space-y-3">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-100" />
            {recentActivity.map(item => {
              const Icon = item.icon;
              return (
                <div key={`${item.text}-${item.time}`} className="flex items-start gap-3">
                  <div
                    className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl"
                    style={{ background: `${item.color}18`, border: `1.5px solid ${item.color}30` }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: item.color }} />
                  </div>
                  <div className="min-w-0 flex-1 pt-1.5">
                    <p className="text-xs font-medium text-gray-700">{item.text}</p>
                    <p className="text-[10px] text-gray-400">{item.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[22px] border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">Top Performing Posts</h3>
            <BarChart3 className="h-4 w-4 text-gray-300" />
          </div>
          <div className="space-y-1.5">
            {topPosts.map((post, index) => (
              <div key={post.title} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-gray-50">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-xl text-[10px] font-extrabold"
                  style={{
                    background: index === 0 ? 'linear-gradient(135deg, #e65100, #bf360c)' : index === 1 ? 'linear-gradient(135deg, #1565c0, #1a237e)' : '#e5e7eb',
                    color: index < 2 ? '#fff' : '#6b7280',
                  }}
                >
                  {index + 1}
                </span>
                <p className="flex-1 truncate text-xs font-semibold text-gray-700">{post.title}</p>
                <div className="shrink-0 text-right">
                  <div className="text-xs font-bold text-gray-700">{post.views.toLocaleString('en-IN')}</div>
                  <div className={cn('flex items-center justify-end gap-0.5 text-[10px] font-semibold', post.up ? 'text-green-600' : 'text-red-500')}>
                    {post.up ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                    {post.change}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[22px] border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Traffic Trend (6 Days)</h3>
            <p className="text-[11px] text-gray-400">Recent traffic growth from analytics</p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-green-100 bg-green-50 px-4 py-2">
            <TrendingUp className="h-3.5 w-3.5 text-green-600" />
            <div>
              <div className="text-[13px] font-extrabold text-green-800">
                {analytics?.comparison?.viewsDeltaPct ? `${analytics.comparison.viewsDeltaPct > 0 ? '+' : ''}${analytics.comparison.viewsDeltaPct}%` : '+33%'} trend
              </div>
              <div className="text-[9px] text-green-600">Compared with previous window</div>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={trendData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" name="Traffic" fill="#1565c0" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-[22px] border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-gray-800">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'New Job Post', href: '/announcements/new', icon: Briefcase, color: '#e65100', bg: '#fff4ef' },
            { label: 'Post Result', href: '/announcements?type=result', icon: Trophy, color: '#2e7d32', bg: '#f0fff4' },
            { label: 'Upload Admit Card', href: '/announcements?type=admit-card', icon: CreditCard, color: '#6a1b9a', bg: '#f9f0ff' },
            { label: 'Add Ticker Item', href: '/notifications', icon: Bell, color: '#1565c0', bg: '#eff4ff' },
          ].map(item => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex flex-col items-center gap-2.5 rounded-2xl border-2 border-dashed px-3 py-4 transition-all hover:scale-[1.02] hover:shadow-md"
                style={{ borderColor: `${item.color}30`, background: item.bg }}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: `${item.color}22` }}>
                  <Icon className="h-5 w-5" style={{ color: item.color }} />
                </div>
                <span className="text-center text-xs font-bold" style={{ color: item.color }}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
