'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Clock3, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { approveCmsPost, getEditorialWorkflowQueue, getEditorialWorkflowSla } from '@/lib/api';

export function WorkflowPage() {
  const queryClient = useQueryClient();
  const pendingQuery = useQuery({
    queryKey: ['editorial-workflow-queue'],
    queryFn: async () => (await getEditorialWorkflowQueue()).data,
  });
  const slaQuery = useQuery({
    queryKey: ['editorial-workflow-sla'],
    queryFn: async () => (await getEditorialWorkflowSla()).data,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveCmsPost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editorial-workflow-queue'] });
      queryClient.invalidateQueries({ queryKey: ['editorial-workflow-sla'] });
      toast.success('Post approved.');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to approve post'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-black text-gray-900">Editorial Workflow</h1>
        <p className="text-[12px] text-gray-500">Review submitted drafts, approve them, and watch SLA pressure on the queue.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Send size={15} />
            <h2 className="text-[14px] font-bold text-gray-900">Pending Review</h2>
          </div>
          {pendingQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading queue…</div>
          ) : pendingQuery.data && pendingQuery.data.length > 0 ? (
            <div className="space-y-3">
              {pendingQuery.data.map((item) => (
                <div key={item.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link href={`/announcements/${item.id}`} className="text-[14px] font-bold text-gray-900 hover:underline">
                        {item.title}
                      </Link>
                      <div className="mt-1 text-[12px] text-gray-500">{item.organization?.name || 'No organization tagged'} · {item.type}</div>
                      <div className="mt-1 text-[11px] text-gray-400">Updated {new Date(item.updatedAt).toLocaleString('en-IN')}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => approveMutation.mutate(item.id)}
                      disabled={approveMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-3 py-2 text-[12px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} />
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No posts are waiting in review.</p>
          )}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Clock3 size={15} />
            <h2 className="text-[14px] font-bold text-gray-900">SLA Watch</h2>
          </div>
          {slaQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading SLA…</div>
          ) : slaQuery.data && slaQuery.data.length > 0 ? (
            <div className="space-y-3">
              {slaQuery.data.map((item) => (
                <div key={item.id} className="rounded-2xl border border-red-100 bg-red-50 p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={14} className="mt-0.5 text-red-600" />
                    <div>
                      <div className="font-semibold text-red-900">{item.title}</div>
                      <div className="text-[12px] text-red-700">{item.hoursOverdue} hours overdue</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No SLA violations right now.</p>
          )}
        </div>
      </div>
    </div>
  );
}
