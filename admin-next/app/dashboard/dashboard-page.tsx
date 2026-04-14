'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Briefcase, Clock3, FileCheck2, Loader2 } from 'lucide-react';
import { getEditorialDashboard } from '@/lib/api';

export function DashboardPage() {
  const dashboardQuery = useQuery({
    queryKey: ['editorial-dashboard'],
    queryFn: async () => (await getEditorialDashboard()).data,
  });

  if (dashboardQuery.isLoading) {
    return <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading dashboard…</div>;
  }

  const data = dashboardQuery.data;
  if (!data) {
    return <div className="text-sm text-gray-500">Dashboard data is unavailable.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-[linear-gradient(135deg,#060d2e_0%,#0d1b6e_45%,#1a237e_100%)] px-6 py-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-200">Editorial Command Center</div>
            <h1 className="mt-2 text-[24px] font-black">Live CMS Dashboard</h1>
            <p className="mt-1 text-[13px] text-blue-200">The dashboard is now backed by the new post platform instead of demo numbers.</p>
          </div>
          <BarChart3 className="h-8 w-8 text-blue-200" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Total Posts', value: data.total, icon: Briefcase },
          { label: 'Published', value: data.published, icon: FileCheck2 },
          { label: 'In Review', value: data.inReview, icon: Clock3 },
          { label: 'Drafts', value: data.byStatus.draft || 0, icon: Briefcase },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[22px] font-black text-gray-900">{item.value}</div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">{item.label}</div>
                </div>
                <Icon className="h-5 w-5 text-[#e65100]" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-[14px] font-bold text-gray-900">Type Breakdown</h2>
          <div className="space-y-2">
            {Object.entries(data.byType).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                <span className="text-[12px] font-semibold text-gray-700">{key}</span>
                <span className="text-[12px] font-bold text-gray-900">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[14px] font-bold text-gray-900">Recently Updated</h2>
            <Link href="/announcements" className="text-[12px] font-semibold text-[#e65100] hover:underline">Open CMS</Link>
          </div>
          <div className="space-y-3">
            {data.recentPosts.map((post) => (
              <div key={post.id} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
                <Link href={`/announcements/${post.id}`} className="font-semibold text-gray-900 hover:underline">
                  {post.title}
                </Link>
                <div className="mt-1 text-[12px] text-gray-500">
                  {post.organization?.name || 'No organization'} · {post.status} · {new Date(post.updatedAt).toLocaleDateString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
