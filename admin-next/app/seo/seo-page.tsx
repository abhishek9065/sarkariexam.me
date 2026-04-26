'use client';

import { useQuery } from '@tanstack/react-query';
import { getSEOMetrics } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Search, FileText, CheckCircle, AlertTriangle, TrendingUp, Globe, Loader2 } from 'lucide-react';

export function SEODashboardPage() {
  const { data: seo, isLoading } = useQuery({
    queryKey: ['admin-seo'],
    queryFn: async () => {
      const res = await getSEOMetrics();
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const metrics = seo?.metrics;
  const coverage = seo?.coverage;
  const queries = seo?.queries || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">SEO Dashboard</h1>
        <p className="text-muted-foreground mt-1">Search optimization health and insights</p>
      </div>

      {/* Health Score */}
      <Card className="border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">SEO Health Score</p>
              <p className="text-4xl font-bold">{metrics?.healthScore || 0}%</p>
            </div>
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
          </div>
          <Progress value={metrics?.healthScore || 0} className="mt-4" />
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pages</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.total?.toLocaleString() || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Meta</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.withMeta?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.total ? Math.round((metrics.withMeta / metrics.total) * 100) : 0}% coverage
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Indexed</CardTitle>
            <Globe className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.indexed?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.total ? Math.round((metrics.indexed / metrics.total) * 100) : 0}% indexable
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Canonical Paths</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.withSchema?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.total ? Math.round((metrics.withSchema / metrics.total) * 100) : 0}% canonical
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Index Coverage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Index Coverage</CardTitle>
            <CardDescription>How search engines see your content</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Indexed (follow)
                </span>
                <span className="font-medium">{coverage?.indexed || 0}</span>
              </div>
              <Progress value={coverage?.indexed || 0} max={metrics?.total || 1} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Noindex (no follow)
                </span>
                <span className="font-medium">{coverage?.noindex || 0}</span>
              </div>
              <Progress value={coverage?.noindex || 0} max={metrics?.total || 1} className="h-2 bg-yellow-100" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Missing Policy
                </span>
                <span className="font-medium">{coverage?.missing || 0}</span>
              </div>
              <Progress value={coverage?.missing || 0} max={metrics?.total || 1} className="h-2 bg-red-100" />
            </div>
          </CardContent>
        </Card>

        {/* Top Search Queries */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" />
              Top Search Queries
            </CardTitle>
            <CardDescription>Most searched terms (last 30 days)</CardDescription>
          </CardHeader>
          <CardContent>
            {!queries || queries.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No search data available</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {queries.slice(0, 20).map((q: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 hover:bg-muted rounded">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-6">#{i + 1}</span>
                      <span className="font-medium">{q._id}</span>
                    </div>
                    <Badge variant="secondary">{q.count} searches</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">SEO Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">
            {coverage?.missing || 0} pages need index policy
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">
            {metrics?.total && metrics?.withMeta ? metrics.total - metrics.withMeta : 0} pages need meta descriptions
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">
            {metrics?.total && metrics?.withSchema ? metrics.total - metrics.withSchema : 0} pages need canonical paths
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}
