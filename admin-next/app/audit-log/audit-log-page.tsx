'use client';

import { useQuery } from '@tanstack/react-query';
import { Activity, Loader2 } from 'lucide-react';
import { getEditorialAuditLog } from '@/lib/api';

export function AuditLogPage() {
  const auditQuery = useQuery({
    queryKey: ['editorial-audit-log'],
    queryFn: async () => (await getEditorialAuditLog({ limit: 100 })).data,
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-black text-gray-900">Editorial Audit Log</h1>
        <p className="text-[12px] text-gray-500">Live workflow and publish activity from the new content platform.</p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        {auditQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading audit log…</div>
        ) : auditQuery.data && auditQuery.data.length > 0 ? (
          <div className="space-y-3">
            {auditQuery.data.map((item) => (
              <div key={item.id} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="mt-1 rounded-xl bg-[#fff4ef] p-2 text-[#e65100]">
                    <Activity size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-900">{item.summary}</div>
                    <div className="mt-1 text-[12px] text-gray-500">
                      {item.action} · {item.actorRole || 'system'} · {new Date(item.createdAt).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No audit entries yet.</p>
        )}
      </div>
    </div>
  );
}
