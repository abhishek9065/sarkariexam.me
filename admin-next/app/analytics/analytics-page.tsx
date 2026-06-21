'use client';

import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, AlertCircle, Eye, ListFilter, Search, Users } from 'lucide-react';

import { getAnalyticsOverview, getContentAnalytics, getLiveMetrics } from '@/lib/api';

type Period = 7 | 30 | 90;
type ChartMetric = 'views' | 'searches';

function formatNumber(value: number) {
  return value.toLocaleString('en-IN');
}

function EmptyState({ message = 'This metric is not available yet' }: { message?: string }) {
  return (
    <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-4 text-center text-[12px] text-gray-500">
      {message}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-red-100 bg-red-50/60 px-4 text-center">
      <AlertCircle className="mb-2 h-5 w-5 text-red-500" />
      <p className="text-[12px] font-semibold text-red-700">Unable to load this metric</p>
      <button type="button" onClick={onRetry} className="mt-2 text-[11px] font-bold text-red-600 hover:underline">
        Try again
      </button>
    </div>
  );
}

function LoadingState({ className = 'min-h-36' }: { className?: string }) {
  return <div className={`${className} animate-pulse rounded-xl bg-gray-100`} />;
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-[14px] font-bold text-gray-800">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[11px] text-gray-400">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>(30);
  const [chartMetric, setChartMetric] = useState<ChartMetric>('views');

  const overviewQuery = useQuery({
    queryKey: ['admin-analytics-overview', period],
    queryFn: () => getAnalyticsOverview(period),
  });
  const contentQuery = useQuery({
    queryKey: ['admin-content-analytics', 10],
    queryFn: () => getContentAnalytics(10),
  });
  const liveQuery = useQuery({
    queryKey: ['admin-live-analytics'],
    queryFn: getLiveMetrics,
    refetchInterval: 30_000,
  });

  const overview = overviewQuery.data?.data;
  const content = contentQuery.data?.data ?? [];
  const live = liveQuery.data?.data;
  const dailyRollups = overview?.dailyRollups ?? [];
  const periodViews = dailyRollups.reduce((total, row) => total + (row.views || 0), 0);

  const kpis = overview ? [
    { label: `Tracked detail views · ${period}d`, value: periodViews, icon: Eye, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: `Listing views · ${period}d`, value: overview.totalListingViews, icon: ListFilter, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: `Searches · ${period}d`, value: overview.totalSearches, icon: Search, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: `Card clicks · ${period}d`, value: overview.totalCardClicks, icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' },
  ] : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-extrabold text-gray-800">Analytics</h2>
          <p className="text-[11px] text-gray-400">Recorded traffic and content performance for SarkariExams.me</p>
        </div>
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1" aria-label="Analytics period">
          {([7, 30, 90] as const).map(days => (
            <button
              key={days}
              type="button"
              onClick={() => setPeriod(days)}
              className={`rounded-lg px-4 py-2 text-[12px] font-semibold transition-all ${
                period === days ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {days} Days
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {overviewQuery.isLoading ? (
          Array.from({ length: 4 }, (_, index) => <LoadingState key={index} className="h-28" />)
        ) : overviewQuery.isError ? (
          <div className="sm:col-span-2 xl:col-span-4"><ErrorState onRetry={() => void overviewQuery.refetch()} /></div>
        ) : (
          kpis.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${bg}`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <p className="text-[11px] font-semibold text-gray-500">{label}</p>
              <p className="mt-1 text-[22px] font-extrabold text-gray-800">{formatNumber(value)}</p>
            </div>
          ))
        )}
      </div>

      <Panel title="Traffic Overview" subtitle={`Recorded daily events for the selected ${period}-day period`}>
        {overviewQuery.isLoading ? <LoadingState className="h-64" /> : overviewQuery.isError ? (
          <ErrorState onRetry={() => void overviewQuery.refetch()} />
        ) : dailyRollups.length === 0 ? <EmptyState /> : (
          <>
            <div className="mb-3 flex justify-end gap-1 rounded-xl">
              {(['views', 'searches'] as const).map(metric => (
                <button
                  key={metric}
                  type="button"
                  onClick={() => setChartMetric(metric)}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold capitalize ${chartMetric === metric ? 'bg-orange-50 text-orange-700' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  {metric}
                </button>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={dailyRollups} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
                <defs>
                  <linearGradient id="analyticsArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e65100" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#e65100" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" vertical={false} />
                <XAxis axisLine={false} dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} />
                <YAxis axisLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} />
                <Tooltip formatter={(value) => formatNumber(Number(value))} />
                <Area dataKey={chartMetric} fill="url(#analyticsArea)" stroke="#e65100" strokeWidth={2.5} type="monotone" />
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Top Content" subtitle="All-time announcement view counts">
          {contentQuery.isLoading ? <LoadingState /> : contentQuery.isError ? (
            <ErrorState onRetry={() => void contentQuery.refetch()} />
          ) : content.length === 0 ? <EmptyState message="No content view data is available yet" /> : (
            <div className="divide-y divide-gray-100">
              {content.map((item, index) => (
                <div key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-[10px] font-bold text-gray-500">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-gray-800">{item.title}</p>
                    <p className="truncate text-[10px] text-gray-400">{item.type} · {item.organization}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[12px] font-bold text-gray-700">{formatNumber(item.viewCount)}</p>
                    <p className="text-[10px] text-gray-400">views</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Top Search Queries" subtitle={`Recorded queries during the selected ${period}-day period`}>
          {overviewQuery.isLoading ? <LoadingState /> : overviewQuery.isError ? (
            <ErrorState onRetry={() => void overviewQuery.refetch()} />
          ) : !overview?.topSearches?.length ? <EmptyState message="No search query data is available yet" /> : (
            <div className="divide-y divide-gray-100">
              {overview.topSearches.map((item, index) => (
                <div key={`${item.query}-${index}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  <p className="min-w-0 flex-1 truncate text-[12px] font-semibold text-gray-700">{item.query}</p>
                  <span className="text-[11px] font-bold text-gray-500">{formatNumber(item.count)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Geographic Activity" subtitle="Recorded activity by state in the last 24 hours">
          {liveQuery.isLoading ? <LoadingState /> : liveQuery.isError ? (
            <ErrorState onRetry={() => void liveQuery.refetch()} />
          ) : !live?.geoData?.length ? <EmptyState /> : (
            <div className="space-y-3">
              {live.geoData.map(item => {
                const maximum = live.geoData[0]?.users || 1;
                return (
                  <div key={item.state}>
                    <div className="mb-1 flex justify-between text-[11px]">
                      <span className="font-semibold text-gray-700">{item.state}</span>
                      <span className="text-gray-500">{formatNumber(item.users)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.min((item.users / maximum) * 100, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel title="Device Breakdown" subtitle="Mobile, desktop, and tablet traffic">
          <EmptyState />
        </Panel>
      </div>

      <Panel title="Live Activity Estimate" subtitle="Approximation based on recorded activity during the last five minutes">
        {liveQuery.isLoading ? <LoadingState /> : liveQuery.isError ? (
          <ErrorState onRetry={() => void liveQuery.refetch()} />
        ) : live ? (
          <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3">
            <Users className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-[20px] font-extrabold text-emerald-800">{formatNumber(live.activeUsers)}</p>
              <p className="text-[11px] text-emerald-700">Estimated active users; this is not a unique-user count.</p>
            </div>
          </div>
        ) : <EmptyState />}
      </Panel>
    </div>
  );
}
