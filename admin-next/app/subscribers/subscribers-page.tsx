'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Bell,
  CheckCircle,
  Download,
  Mail,
  Search,
  Trash2,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';

type Subscriber = {
  id: string;
  name: string;
  email: string;
  joinedDate: string;
  preferences: string[];
  status: 'active' | 'unsubscribed';
  alertsReceived: number;
};

const INITIAL_SUBSCRIBERS: Subscriber[] = [
  { id: '1', name: 'Rahul Kumar', email: 'rahul.kumar@gmail.com', joinedDate: '28 Mar 2026', preferences: ['Latest Jobs', 'Results'], status: 'active', alertsReceived: 142 },
  { id: '2', name: 'Priya Sharma', email: 'priya.s@outlook.com', joinedDate: '27 Mar 2026', preferences: ['Admit Card', 'Answer Key'], status: 'active', alertsReceived: 87 },
  { id: '3', name: 'Arjun Singh', email: 'arjun.singh92@yahoo.com', joinedDate: '26 Mar 2026', preferences: ['Latest Jobs'], status: 'active', alertsReceived: 215 },
  { id: '4', name: 'Neha Gupta', email: 'neha.gupta@gmail.com', joinedDate: '25 Mar 2026', preferences: ['Results', 'Syllabus'], status: 'active', alertsReceived: 63 },
  { id: '5', name: 'Vijay Patel', email: 'vpatel2000@gmail.com', joinedDate: '24 Mar 2026', preferences: ['Latest Jobs', 'Results', 'Admit Card'], status: 'unsubscribed', alertsReceived: 312 },
  { id: '6', name: 'Sunita Yadav', email: 'sunita.yadav@hotmail.com', joinedDate: '22 Mar 2026', preferences: ['Latest Jobs'], status: 'active', alertsReceived: 178 },
  { id: '7', name: 'Mohit Verma', email: 'mohitverma@gmail.com', joinedDate: '20 Mar 2026', preferences: ['Results', 'Answer Key'], status: 'active', alertsReceived: 94 },
  { id: '8', name: 'Kavita Mishra', email: 'kavita.mishra@gmail.com', joinedDate: '18 Mar 2026', preferences: ['Admit Card'], status: 'active', alertsReceived: 47 },
];

const PREFERENCE_COLORS: Record<string, { bg: string; text: string }> = {
  'Latest Jobs': { bg: '#fff4ef', text: '#e65100' },
  Results: { bg: '#f0fff4', text: '#2e7d32' },
  'Admit Card': { bg: '#eff4ff', text: '#1565c0' },
  'Answer Key': { bg: '#f9f0ff', text: '#6a1b9a' },
  Syllabus: { bg: '#fffbef', text: '#f57f17' },
};

export function SubscribersPage() {
  const [subscribers, setSubscribers] = useState(INITIAL_SUBSCRIBERS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'unsubscribed'>('all');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const filtered = useMemo(() => subscribers.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchSearch && matchStatus;
  }), [search, statusFilter, subscribers]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const activeCount = subscribers.filter(item => item.status === 'active').length;
  const unsubscribedCount = subscribers.filter(item => item.status === 'unsubscribed').length;

  function removeSubscriber(id: string) {
    setSubscribers(current => current.filter(item => item.id !== id));
    toast.success('Subscriber removed.');
  }

  function exportCsv() {
    toast.success(`Exporting ${filtered.length} subscribers as CSV...`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#ffd0d0] bg-[#fff0f0]">
            <Users className="h-4.5 w-4.5 text-red-600" />
          </div>
          <div>
            <h2 className="text-[18px] font-extrabold text-gray-800">Subscribers</h2>
            <p className="text-[11px] text-gray-400">{subscribers.length.toLocaleString()} total subscribers</p>
          </div>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-[13px] font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-[22px] border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-[22px] font-extrabold text-gray-800">28,450</div>
          <div className="mt-1 flex items-center gap-1.5">
            <Users className="h-3 w-3 text-blue-500" />
            <span className="text-[11px] text-gray-500">Total Subscribers</span>
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
          <div className="text-[22px] font-extrabold text-red-600">{unsubscribedCount.toLocaleString()}</div>
          <div className="mt-1 flex items-center gap-1.5">
            <XCircle className="h-3 w-3 text-red-500" />
            <span className="text-[11px] text-gray-500">Unsubscribed</span>
          </div>
        </div>
        <div className="rounded-[22px] border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-[22px] font-extrabold text-blue-700">+142</div>
          <div className="mt-1 flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3 text-blue-500" />
            <span className="text-[11px] text-gray-500">Joined Today</span>
          </div>
        </div>
      </div>

      <div className="rounded-[22px] border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-[13px] font-bold text-gray-800">Alert Preferences Breakdown</h3>
        <div className="space-y-2.5">
          {[
            { label: 'Latest Jobs', pct: 78, count: '22,191' },
            { label: 'Results', pct: 54, count: '15,363' },
            { label: 'Admit Card', pct: 41, count: '11,664' },
            { label: 'Answer Key', pct: 28, count: '7,966' },
            { label: 'Syllabus', pct: 19, count: '5,405' },
          ].map(item => {
            const tone = PREFERENCE_COLORS[item.label];
            return (
              <div key={item.label} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-[11px] font-semibold text-gray-600">{item.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full" style={{ width: `${item.pct}%`, background: tone.text }} />
                </div>
                <span className="w-16 shrink-0 text-right text-[11px] font-semibold text-gray-500">{item.count}</span>
                <span className="w-8 shrink-0 text-right text-[11px] font-bold" style={{ color: tone.text }}>{item.pct}%</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-[22px] border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="flex min-w-48 flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <input
              value={search}
              onChange={event => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search by name or email..."
              className="flex-1 bg-transparent text-[13px] text-gray-700 outline-none placeholder:text-gray-400"
            />
          </div>
          <div className="flex rounded-xl bg-gray-100 p-1">
            {(['all', 'active', 'unsubscribed'] as const).map(item => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setStatusFilter(item);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold capitalize transition-all ${statusFilter === item ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[22px] border border-gray-100 bg-white shadow-sm">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-3 border-b border-[#e8ecf8] bg-gradient-to-r from-[#f8f9ff] to-[#f0f4ff] px-4 py-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Subscriber</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Preferences</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Joined</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Alerts</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Status</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Action</span>
        </div>

        {paginated.map((subscriber, index) => (
          <div
            key={subscriber.id}
            className={`grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-3 border-b border-gray-50 px-4 py-3.5 transition-colors hover:bg-blue-50/20 ${index % 2 === 1 ? 'bg-gray-50/20' : ''}`}
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1565c0] to-[#1a237e] text-[11px] font-extrabold text-white">
                {subscriber.name.split(' ').map(part => part[0]).join('').slice(0, 2)}
              </div>
              <div>
                <p className="text-[13px] font-semibold text-gray-800">{subscriber.name}</p>
                <p className="flex items-center gap-1 text-[11px] text-gray-400">
                  <Mail className="h-2.5 w-2.5" />
                  {subscriber.email}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {subscriber.preferences.map(preference => {
                const tone = PREFERENCE_COLORS[preference] ?? { bg: '#f3f4f6', text: '#6b7280' };
                return (
                  <span key={preference} className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background: tone.bg, color: tone.text }}>
                    {preference}
                  </span>
                );
              })}
            </div>
            <div className="text-[12px] text-gray-500">{subscriber.joinedDate}</div>
            <div className="flex items-center justify-center gap-1">
              <Bell className="h-2.5 w-2.5 text-orange-400" />
              <span className="text-[12px] font-bold text-gray-700">{subscriber.alertsReceived}</span>
            </div>
            <div className="text-center">
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${subscriber.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {subscriber.status === 'active' ? 'Active' : 'Unsub'}
              </span>
            </div>
            <div className="text-right">
              <button type="button" onClick={() => removeSubscriber(subscriber.id)} className="rounded-lg bg-red-50 p-2 text-red-500 transition-colors hover:bg-red-100">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <span className="text-[11px] text-gray-400">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, index) => index + 1).map(number => (
                <button
                  key={number}
                  type="button"
                  onClick={() => setPage(number)}
                  className={`h-7 w-7 rounded-lg text-[12px] font-bold ${page === number ? 'text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                  style={page === number ? { background: 'linear-gradient(135deg, #e65100, #bf360c)' } : undefined}
                >
                  {number}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
