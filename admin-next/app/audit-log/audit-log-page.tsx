'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getAuditLog } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ChevronLeft, ChevronRight, History, Pencil } from 'lucide-react';

const PAGE_SIZE = 50;

const statusVariant: Record<string, string> = {
  draft: 'secondary',
  pending: 'warning',
  scheduled: 'outline',
  published: 'success',
  archived: 'destructive',
};

export function AuditLogPage() {
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit-log', page],
    queryFn: () => getAuditLog({ limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
  });

  const entries = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground mt-1">Recent changes across all announcements</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : entries.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No audit entries found.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium">Title</th>
                    <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Type</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Version</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Updated By</th>
                    <th className="text-left px-4 py-3 font-medium">Updated At</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry: any, i: number) => (
                    <tr key={`${entry.id}-${i}`} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="font-medium line-clamp-1">{entry.title}</p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <Badge variant="outline">{entry.type}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={(statusVariant[entry.status] || 'secondary') as 'default'}>{entry.status}</Badge>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <History className="h-3 w-3" />v{entry.version}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                        {entry.updatedBy}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(entry.updatedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/announcements/${entry.id}`}>
                          <Button variant="ghost" size="icon" title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
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
    </div>
  );
}
