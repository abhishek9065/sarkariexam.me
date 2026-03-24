'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAnalyticsOverview, getAnalyticsContent } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Eye, Search, MousePointerClick, TrendingUp, TrendingDown, Loader2, BarChart3,
} from 'lucide-react';
import type { AnalyticsOverview } from '@/lib/types';

export function AnalyticsPage() {
  const [days, setDays] = useState('30');

  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['analytics-overview', days],
    queryFn: async () => {
      const res = await getAnalyticsOverview(Number(days));
      return res.data as AnalyticsOverview;
    },
  });

  const { data: content, isLoading: loadingContent } = useQuery({
    queryKey: ['analytics-content', days],
    queryFn: async () => {
      const res = await getAnalyticsContent(Number(days));
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">Platform performance overview</p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loadingOverview ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : overview ? (
        <>
          {/* KPI cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Total Views"
              value={overview.totalViews?.toLocaleString() || '0'}
              icon={Eye}
              trend={overview.comparison?.viewsDeltaPct}
            />
            <KpiCard
              title="Total Searches"
              value={overview.totalSearches?.toLocaleString() || '0'}
              icon={Search}
              trend={overview.comparison?.searchesDeltaPct}
            />
            <KpiCard
              title="Avg CTR"
              value={`${(overview.clickThroughRate || 0).toFixed(1)}%`}
              icon={MousePointerClick}
              trend={overview.comparison?.ctrDeltaPct}
            />
            <KpiCard
              title="Subscribers"
              value={(overview.totalEmailSubscribers + overview.totalPushSubscribers)?.toLocaleString() || '0'}
              icon={BarChart3}
            />
          </div>

          {/* Views by type */}
          {overview.typeBreakdown && overview.typeBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Views by Content Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {overview.typeBreakdown.map(({ type, count }) => {
                    const total = overview.totalAnnouncements || 1;
                    const pct = (count / total * 100).toFixed(1);
                    return (
                      <div key={type} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="capitalize">{type.replace('-', ' ')}</span>
                          <span className="font-medium tabular-nums">{count.toLocaleString()} ({pct}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Anomalies */}
          {overview.anomalies && overview.anomalies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Anomalies & Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {overview.anomalies.map((anomaly, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm p-2 rounded bg-warning/10 text-warning-foreground">
                      <TrendingDown className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{anomaly.message}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Failed to load analytics data.
          </CardContent>
        </Card>
      )}

      {/* Top content */}
      {!loadingContent && content && Array.isArray(content) && content.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {content.slice(0, 10).map((item: Record<string, unknown>, i: number) => (
                <div key={i} className="flex items-center justify-between gap-4 py-2 border-b last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{item.title as string}</p>
                    <p className="text-xs text-muted-foreground capitalize">{(item.type as string || '').replace('-', ' ')}</p>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
                    <Eye className="h-3 w-3" />
                    {((item.views as number) || 0).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KpiCard({ title, value, icon: Icon, trend }: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs mt-1 ${trend >= 0 ? 'text-success' : 'text-destructive'}`}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend).toFixed(1)}% vs previous period
          </div>
        )}
      </CardContent>
    </Card>
  );
}
