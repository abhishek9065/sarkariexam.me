'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { getPendingApprovals, approveAnnouncement, rejectAnnouncement, getSLAViolations } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export function WorkflowPage() {
  const { data: pending, isLoading, refetch } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: async () => {
      const res = await getPendingApprovals();
      return res.data;
    },
  });

  const { data: violations } = useQuery({
    queryKey: ['sla-violations'],
    queryFn: async () => {
      const res = await getSLAViolations();
      return res.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => approveAnnouncement(id, note),
    onSuccess: () => { toast.success('Approved'); refetch(); },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectAnnouncement(id, reason),
    onSuccess: () => { toast.success('Rejected'); refetch(); },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Editorial Workflow</h1>
        <p className="text-muted-foreground mt-1">Manage content approvals and assignments</p>
      </div>

      {violations && violations.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              SLA Violations ({violations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {violations.map(v => (
                <div key={v.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <span className="text-sm font-medium">{v.title}</span>
                  <Badge variant="destructive">{v.hoursOverdue}h overdue</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Approvals ({pending?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : !pending || pending.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No pending approvals</p>
          ) : (
            <div className="space-y-3">
              {pending?.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Link href={`/announcements/${item.id}`} className="font-medium hover:underline">
                      {item.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">Assigned to: {item.assigneeEmail || 'Unassigned'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => approveMutation.mutate({ id: item.id })}>
                      <CheckCircle className="h-4 w-4 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => rejectMutation.mutate({ id: item.id, reason: 'Rejected' })}>
                      <XCircle className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
