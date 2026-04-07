'use client';

import { useQuery } from '@tanstack/react-query';
import { getBackups, exportAnnouncementsToCSV, getSecurityStats, getPerformanceSummary, getRateLimitStats, getSystemHealth } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Database, Shield, Activity, Gauge, AlertTriangle, CheckCircle, 
  Download, Clock, Server, Zap, Loader2, TrendingUp, AlertOctagon 
} from 'lucide-react';

export function SystemAdminPage() {
  const { data: backups, isLoading: loadingBackups } = useQuery({
    queryKey: ['admin-backups'],
    queryFn: async () => {
      const res = await getBackups();
      return res.data;
    },
  });

  const { data: security } = useQuery({
    queryKey: ['admin-security'],
    queryFn: async () => {
      const res = await getSecurityStats();
      return res.data;
    },
  });

  const { data: performance } = useQuery({
    queryKey: ['admin-performance'],
    queryFn: async () => {
      const res = await getPerformanceSummary();
      return res.data;
    },
  });

  const { data: rateLimits } = useQuery({
    queryKey: ['admin-rate-limits'],
    queryFn: async () => {
      const res = await getRateLimitStats();
      return res.data;
    },
  });

  const { data: health } = useQuery({
    queryKey: ['admin-health'],
    queryFn: async () => {
      const res = await getSystemHealth();
      return res.data;
    },
    refetchInterval: 30000,
  });

  const handleExport = async () => {
    try {
      const response = await exportAnnouncementsToCSV();
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `announcements_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Export downloaded');
    } catch {
      toast.error('Export failed');
    }
  };

  const healthStatus = health?.health?.status || 'unknown';
  const healthColor = healthStatus === 'healthy' ? 'bg-green-500' : healthStatus === 'degraded' ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Administration</h1>
          <p className="text-muted-foreground mt-1">Backups, security, performance, and health monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${healthColor} animate-pulse`} />
          <span className="text-sm capitalize">{healthStatus}</span>
        </div>
      </div>

      <Tabs defaultValue="health" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto">
          <TabsTrigger value="health" className="flex items-center gap-1.5">
            <Activity className="h-4 w-4" /> Health
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-1.5">
            <Gauge className="h-4 w-4" /> Performance
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1.5">
            <Shield className="h-4 w-4" /> Security
          </TabsTrigger>
          <TabsTrigger value="backups" className="flex items-center gap-1.5">
            <Database className="h-4 w-4" /> Backups
          </TabsTrigger>
          <TabsTrigger value="rate-limits" className="flex items-center gap-1.5">
            <Zap className="h-4 w-4" /> Rate Limits
          </TabsTrigger>
        </TabsList>

        {/* Health Tab */}
        <TabsContent value="health" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Database</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{health?.health?.checks?.database?.status || 'Unknown'}</div>
                <p className="text-xs text-muted-foreground">{health?.health?.checks?.database?.latency}ms latency</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Memory</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{health?.health?.checks?.memory?.usage || 0}%</div>
                <p className="text-xs text-muted-foreground">{health?.health?.checks?.memory?.status || 'Unknown'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.floor((health?.health?.checks?.uptime?.seconds || 0) / 3600)}h
                </div>
                <p className="text-xs text-muted-foreground">Since restart</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Services</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {health?.services?.services?.filter((s: any) => s.status === 'up').length || 0}
                  /{health?.services?.services?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Running</p>
              </CardContent>
            </Card>
          </div>

          {health?.errors && health.errors.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600 flex items-center gap-2 text-base">
                  <AlertOctagon className="h-5 w-5" />
                  Recent Errors ({health.errors.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {health.errors.map((err: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-red-50 rounded text-sm">
                    <span className="truncate">{err.message}</span>
                    <Badge variant="destructive">{err.count}x</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performance?.summary?.avgResponseTime || 0}ms</div>
                <p className="text-xs text-muted-foreground">Last hour</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">P95 Response</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performance?.summary?.p95ResponseTime || 0}ms</div>
                <p className="text-xs text-muted-foreground">95th percentile</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Requests/min</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performance?.summary?.requestsPerMinute || 0}</div>
                <p className="text-xs text-muted-foreground">Throughput</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(performance?.summary?.errorRate || 0)}%</div>
                <p className="text-xs text-muted-foreground">Last 24h</p>
              </CardContent>
            </Card>
          </div>

          {performance?.slowEndpoints && performance.slowEndpoints.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Slowest Endpoints</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {performance.slowEndpoints.map((ep: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                    <span className="font-mono">{ep.route}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">{ep.count} calls</span>
                      <Badge variant="secondary">{ep.avgDuration}ms avg</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Events (24h)</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{security?.totalEvents24h || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Critical</CardTitle>
                <AlertOctagon className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{security?.criticalCount || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{security?.failedLogins || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Suspicious IPs</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{security?.suspiciousIPs || 0}</div>
              </CardContent>
            </Card>
          </div>

          {security?.failedLoginsList && security.failedLoginsList.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Failed Login Attempts by IP</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {security.failedLoginsList.map((ip: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                    <span className="font-mono">{ip.ip}</span>
                    <Badge variant="destructive">{ip.count} attempts</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Backups Tab */}
        <TabsContent value="backups" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Data Export</CardTitle>
                <CardDescription>Export announcements to CSV format</CardDescription>
              </div>
              <Button onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Backups</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingBackups ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : backups?.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No backups found</p>
              ) : (
                <div className="space-y-2">
                  {backups?.map((backup: any) => (
                    <div key={backup.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{backup.id}</p>
                        <p className="text-xs text-muted-foreground">
                          {backup.collections?.length || 0} collections • {new Date(backup.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={backup.status === 'completed' ? 'default' : 'secondary'}>
                        {backup.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rate Limits Tab */}
        <TabsContent value="rate-limits" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Hits (24h)</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{rateLimits?.totalHits24h || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unique IPs</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{rateLimits?.uniqueIPs || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Most Limited</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{rateLimits?.mostLimited?.[0]?.count || 0}</div>
                <p className="text-xs text-muted-foreground truncate">{rateLimits?.mostLimited?.[0]?.key || 'None'}</p>
              </CardContent>
            </Card>
          </div>

          {rateLimits?.byEndpoint && rateLimits.byEndpoint.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rate Limit Hits by Endpoint</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {rateLimits.byEndpoint.map((ep: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                    <span className="font-mono truncate">{ep.endpoint}</span>
                    <Badge>{ep.hits} hits</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
