'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getErrorReports, updateErrorReport } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  AlertTriangle, Loader2, ChevronLeft, ChevronRight, CheckCircle, Eye, ExternalLink,
} from 'lucide-react';

const PAGE_SIZE = 20;

const statusColors: Record<string, string> = {
  new: 'destructive',
  triaged: 'secondary',
  resolved: 'default',
};

export function ErrorReportsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [detailItem, setDetailItem] = useState<any | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-error-reports', page, statusFilter],
    queryFn: () => getErrorReports({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, status, reviewNote }: { id: string; status: 'triaged' | 'resolved'; reviewNote?: string }) =>
      updateErrorReport(id, { status, reviewNote }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-error-reports'] });
      toast.success('Error report updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Error Reports</h1>
        <p className="text-muted-foreground mt-1">{total} error reports from users</p>
      </div>

      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="triaged">Triaged</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No error reports found.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium">Error ID</th>
                    <th className="text-left px-4 py-3 font-medium">Message</th>
                    <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Page</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Date</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r: any) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs">{r.errorId || r.id?.slice(0, 8)}</td>
                      <td className="px-4 py-3 max-w-[300px]">
                        <p className="line-clamp-1">{r.message}</p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground text-xs max-w-[200px] truncate">
                        {r.pageUrl || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={(statusColors[r.status] || 'secondary') as 'default'}>
                          {r.status || 'new'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" title="View Details" onClick={() => { setDetailItem(r); setReviewNote(r.reviewNote || ''); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(!r.status || r.status === 'new') && (
                            <Button variant="ghost" size="icon" title="Triage" onClick={() => updateMut.mutate({ id: r.id, status: 'triaged' })}>
                              <AlertTriangle className="h-4 w-4 text-orange-500" />
                            </Button>
                          )}
                          {r.status !== 'resolved' && (
                            <Button variant="ghost" size="icon" title="Resolve" onClick={() => updateMut.mutate({ id: r.id, status: 'resolved' })}>
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, total)} of {total}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm text-muted-foreground">{page + 1}/{totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailItem} onOpenChange={open => { if (!open) setDetailItem(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Error Report Details</DialogTitle>
            <DialogDescription>ID: {detailItem?.errorId || detailItem?.id}</DialogDescription>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <Badge variant={(statusColors[detailItem.status] || 'secondary') as 'default'}>{detailItem.status || 'new'}</Badge>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Date</label>
                  <p className="mt-1 text-sm">{detailItem.createdAt ? new Date(detailItem.createdAt).toLocaleString() : '—'}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Message</label>
                <p className="mt-1 text-sm bg-muted p-3 rounded-md">{detailItem.message}</p>
              </div>

              {detailItem.pageUrl && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Page URL</label>
                  <a href={detailItem.pageUrl} target="_blank" rel="noopener noreferrer" className="mt-1 text-sm text-primary hover:underline flex items-center gap-1">
                    {detailItem.pageUrl} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {detailItem.userAgent && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">User Agent</label>
                  <p className="mt-1 text-xs text-muted-foreground bg-muted p-2 rounded-md font-mono break-all">{detailItem.userAgent}</p>
                </div>
              )}

              {detailItem.stack && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Stack Trace</label>
                  <pre className="mt-1 text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-40 whitespace-pre-wrap font-mono">{detailItem.stack}</pre>
                </div>
              )}

              {detailItem.componentStack && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Component Stack</label>
                  <pre className="mt-1 text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-40 whitespace-pre-wrap font-mono">{detailItem.componentStack}</pre>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-muted-foreground">Review Note</label>
                <Textarea
                  value={reviewNote}
                  onChange={e => setReviewNote(e.target.value)}
                  placeholder="Add a review note..."
                  rows={2}
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {detailItem && detailItem.status !== 'triaged' && detailItem.status !== 'resolved' && (
              <Button variant="outline" onClick={() => { updateMut.mutate({ id: detailItem.id, status: 'triaged', reviewNote: reviewNote || undefined }); setDetailItem(null); }}>
                <AlertTriangle className="h-4 w-4 mr-1.5" />Triage
              </Button>
            )}
            {detailItem && detailItem.status !== 'resolved' && (
              <Button onClick={() => { updateMut.mutate({ id: detailItem.id, status: 'resolved', reviewNote: reviewNote || undefined }); setDetailItem(null); }}>
                <CheckCircle className="h-4 w-4 mr-1.5" />Resolve
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
