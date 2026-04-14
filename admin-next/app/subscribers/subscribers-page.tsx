'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle, Download, Mail, Search, Trash2, Users, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { deleteSubscriber, getSubscriberStats, getSubscribers } from '@/lib/api';
import type { AlertSubscriber } from '@/lib/types';

function formatDate(value?: string) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function preferenceTags(subscriber: AlertSubscriber) {
  return [
    ...subscriber.categoryNames.map((item) => `Category: ${item}`),
    ...subscriber.stateNames.map((item) => `State: ${item}`),
    ...subscriber.organizationNames.map((item) => `Org: ${item}`),
    ...subscriber.qualificationNames.map((item) => `Qualification: ${item}`),
    ...subscriber.postTypes.map((item) => `Type: ${item}`),
  ];
}

function downloadCsv(rows: AlertSubscriber[]) {
  const headers = ['Email', 'Status', 'Verified', 'Frequency', 'Categories', 'States', 'Organizations', 'Qualifications', 'Post Types', 'Alerts Sent', 'Created At'];
  const lines = rows.map((row) => [
    row.email,
    row.isActive ? 'active' : 'inactive',
    row.verified ? 'yes' : 'no',
    row.frequency,
    row.categoryNames.join('; '),
    row.stateNames.join('; '),
    row.organizationNames.join('; '),
    row.qualificationNames.join('; '),
    row.postTypes.join('; '),
    String(row.alertCount || 0),
    row.createdAt,
  ]);

  const content = [headers, ...lines]
    .map((line) => line.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'alert-subscribers.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export function SubscribersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [frequency, setFrequency] = useState<'all' | 'instant' | 'daily' | 'weekly'>('all');

  const statsQuery = useQuery({
    queryKey: ['alert-subscriber-stats'],
    queryFn: getSubscriberStats,
  });

  const subscribersQuery = useQuery({
    queryKey: ['alert-subscribers', search, status, frequency],
    queryFn: () => getSubscribers({ search: search || undefined, status, frequency, limit: 100 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSubscriber(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-subscribers'] });
      queryClient.invalidateQueries({ queryKey: ['alert-subscriber-stats'] });
      toast.success('Subscriber removed.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove subscriber');
    },
  });

  const subscribers = subscribersQuery.data?.data || [];
  const stats = statsQuery.data?.data;

  const activeCount = stats?.active ?? subscribers.filter((item) => item.isActive).length;
  const inactiveCount = stats?.inactive ?? subscribers.filter((item) => !item.isActive).length;
  const frequencyBreakdown = useMemo(() => {
    const byFrequency = new Map((stats?.byFrequency || []).map((item) => [item._id, item.count]));
    return {
      instant: byFrequency.get('instant') || 0,
      daily: byFrequency.get('daily') || 0,
      weekly: byFrequency.get('weekly') || 0,
    };
  }, [stats?.byFrequency]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#ffd0d0] bg-[#fff0f0]">
            <Users className="h-4.5 w-4.5 text-red-600" />
          </div>
          <div>
            <h2 className="text-[18px] font-extrabold text-gray-800">Alert Subscribers</h2>
            <p className="text-[11px] text-gray-400">{(stats?.total ?? subscribers.length).toLocaleString()} total subscriptions</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => downloadCsv(subscribers)}
          className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-[13px] font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-[22px] border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-[22px] font-extrabold text-gray-800">{(stats?.total ?? 0).toLocaleString()}</div>
          <div className="mt-1 flex items-center gap-1.5">
            <Users className="h-3 w-3 text-blue-500" />
            <span className="text-[11px] text-gray-500">Total</span>
          </div>
        </div>
        <div className="rounded-[22px] border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-[22px] font-extrabold text-green-700">{activeCount.toLocaleString()}</div>
          <div className="mt-1 flex items-center gap-1.5">
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span className="text-[11px] text-gray-500">Active</span>
          </div>
        </div>
        <div className="rounded-[22px] border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-[22px] font-extrabold text-red-600">{inactiveCount.toLocaleString()}</div>
          <div className="mt-1 flex items-center gap-1.5">
            <XCircle className="h-3 w-3 text-red-500" />
            <span className="text-[11px] text-gray-500">Inactive</span>
          </div>
        </div>
        <div className="rounded-[22px] border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-[22px] font-extrabold text-blue-700">{(stats?.verified ?? 0).toLocaleString()}</div>
          <div className="mt-1 flex items-center gap-1.5">
            <Mail className="h-3 w-3 text-blue-500" />
            <span className="text-[11px] text-gray-500">Verified</span>
          </div>
        </div>
      </div>

      <div className="rounded-[22px] border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-[13px] font-bold text-gray-800">Frequency Breakdown</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Instant', count: frequencyBreakdown.instant, tone: 'text-[#e65100] bg-[#fff4ef]' },
            { label: 'Daily', count: frequencyBreakdown.daily, tone: 'text-[#1565c0] bg-[#eff4ff]' },
            { label: 'Weekly', count: frequencyBreakdown.weekly, tone: 'text-[#2e7d32] bg-[#f0fff4]' },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-gray-100 p-4">
              <div className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${item.tone}`}>{item.label}</div>
              <div className="mt-3 text-[22px] font-extrabold text-gray-800">{item.count.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[22px] border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="flex min-w-48 flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by email..."
              className="flex-1 bg-transparent text-[13px] text-gray-700 outline-none placeholder:text-gray-400"
            />
          </div>

          <div className="flex rounded-xl bg-gray-100 p-1">
            {(['all', 'active', 'inactive'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setStatus(item)}
                className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold capitalize transition-all ${status === item ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="flex rounded-xl bg-gray-100 p-1">
            {(['all', 'instant', 'daily', 'weekly'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFrequency(item)}
                className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold capitalize transition-all ${frequency === item ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[22px] border border-gray-100 bg-white shadow-sm">
        <div className="grid grid-cols-[1.2fr_1fr_auto_auto_auto] items-center gap-3 border-b border-[#e8ecf8] bg-gradient-to-r from-[#f8f9ff] to-[#f0f4ff] px-4 py-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Subscriber</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Preferences</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Frequency</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Status</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Action</span>
        </div>

        {subscribers.map((subscriber, index) => (
          <div
            key={subscriber.id}
            className={`grid grid-cols-[1.2fr_1fr_auto_auto_auto] items-center gap-3 border-b border-gray-50 px-4 py-3.5 transition-colors hover:bg-blue-50/20 ${index % 2 === 1 ? 'bg-gray-50/20' : ''}`}
          >
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-gray-800">{subscriber.email}</p>
              <p className="mt-1 text-[11px] text-gray-400">
                Created {formatDate(subscriber.createdAt)}{subscriber.lastAlertedAt ? ` · Last alert ${formatDate(subscriber.lastAlertedAt)}` : ''}
              </p>
            </div>

            <div className="flex flex-wrap gap-1">
              {preferenceTags(subscriber).slice(0, 6).map((preference) => (
                <span key={preference} className="rounded-full bg-[#f8f2ff] px-2 py-0.5 text-[9px] font-bold text-[#6a1b9a]">
                  {preference}
                </span>
              ))}
              {preferenceTags(subscriber).length === 0 ? <span className="text-[11px] text-gray-400">All updates</span> : null}
            </div>

            <div className="flex items-center gap-1">
              <Bell className="h-2.5 w-2.5 text-orange-400" />
              <span className="text-[12px] font-bold capitalize text-gray-700">{subscriber.frequency}</span>
            </div>

            <div className="flex flex-col items-start gap-1">
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${subscriber.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {subscriber.isActive ? 'Active' : 'Inactive'}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${subscriber.verified ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                {subscriber.verified ? 'Verified' : 'Pending'}
              </span>
            </div>

            <div className="text-right">
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(subscriber.id)}
                className="rounded-lg bg-red-50 p-2 text-red-500 transition-colors hover:bg-red-100 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}

        {subscribers.length === 0 ? (
          <div className="px-4 py-10 text-center text-[13px] text-gray-500">No alert subscribers found for the current filters.</div>
        ) : null}
      </div>
    </div>
  );
}
