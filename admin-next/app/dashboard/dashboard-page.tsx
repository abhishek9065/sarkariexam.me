'use client';

import { useQuery } from '@tanstack/react-query';
import { getDashboard } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Users,
  Eye,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Send,
  Archive,
  Loader2,
} from 'lucide-react';
import type { DashboardData, ContentType, AnnouncementStatus } from '@/lib/types';

const statusColors: Record<AnnouncementStatus, string> = {
  draft: 'secondary',
  pending: 'warning',
  scheduled: 'outline',
  published: 'success',
  archived: 'destructive',
};

const typeLabels: Record<ContentType, string> = {
  job: 'Jobs',
  result: 'Results',
  'admit-card': 'Admit Cards',
  syllabus: 'Syllabus',
  'answer-key': 'Answer Keys',
  admission: 'Admissions',
};

export function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await getDashboard();
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Failed to load dashboard data. Please try again.
      </div>
    );
  }

  if (!data) return null;
  const d = data as DashboardData;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your platform</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Announcements"
          value={d.announcements.total}
          icon={FileText}
          description={`${d.announcements.byStatus.published} published`}
        />
        <StatCard
          title="Total Users"
          value={d.users.total}
          icon={Users}
          description={`${d.users.active} active, ${d.users.admins} admins`}
        />
        <StatCard
          title="Pending Review"
          value={d.announcements.byStatus.pending}
          icon={Clock}
          description={`${d.workspace.overdueReview} overdue`}
          variant={d.workspace.overdueReview > 0 ? 'warning' : 'default'}
        />
        <StatCard
          title="QA Issues"
          value={d.qa.totalQaIssues}
          icon={AlertTriangle}
          description={`${d.qa.pendingQaIssues} in pending posts`}
          variant={d.qa.totalQaIssues > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Status & Type breakdown */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(Object.entries(d.announcements.byStatus) as [AnnouncementStatus, number][]).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusIcon status={status} />
                    <span className="text-sm capitalize">{status}</span>
                  </div>
                  <span className="text-sm font-medium tabular-nums">{count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">By Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(Object.entries(d.announcements.byType) as [ContentType, number][]).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm">{typeLabels[type] || type}</span>
                  <span className="text-sm font-medium tabular-nums">{count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SLA Summary */}
      {d.sla.pendingTotal > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending SLA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{d.sla.buckets.lt1}</p>
                <p className="text-xs text-muted-foreground">&lt; 1 day</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{d.sla.buckets.d1_3}</p>
                <p className="text-xs text-muted-foreground">1-3 days</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{d.sla.buckets.d3_7}</p>
                <p className="text-xs text-muted-foreground">3-7 days</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-destructive">{d.sla.buckets.gt7}</p>
                <p className="text-xs text-muted-foreground">&gt; 7 days</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Average pending age: {d.sla.averageDays} days
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recent announcements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Announcements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {d.recentAnnouncements.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-4 py-2 border-b last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{item.organization}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={statusColors[item.status] as 'default'}>{item.status}</Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye className="h-3 w-3" />
                    {item.viewCount.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, description, variant = 'default' }: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  variant?: 'default' | 'warning';
}) {
  return (
    <Card className={variant === 'warning' ? 'border-warning/50' : ''}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function StatusIcon({ status }: { status: AnnouncementStatus }) {
  switch (status) {
    case 'published': return <CheckCircle2 className="h-4 w-4 text-success" />;
    case 'pending': return <Clock className="h-4 w-4 text-warning" />;
    case 'scheduled': return <Send className="h-4 w-4 text-primary" />;
    case 'archived': return <Archive className="h-4 w-4 text-muted-foreground" />;
    default: return <FileText className="h-4 w-4 text-muted-foreground" />;
  }
}
