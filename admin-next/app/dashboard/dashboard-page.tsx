'use client';

import Link from 'next/link';
import { useState, type ComponentType, type CSSProperties } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Bell,
  Briefcase,
  Clock,
  CreditCard,
  Eye,
  Hash,
  MessageCircle,
  Radio,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const WEEKLY_DATA = [
  { day: 'Mon', views: 42500, pub: 3 },
  { day: 'Tue', views: 58900, pub: 5 },
  { day: 'Wed', views: 45200, pub: 2 },
  { day: 'Thu', views: 69800, pub: 7 },
  { day: 'Fri', views: 81200, pub: 4 },
  { day: 'Sat', views: 35400, pub: 1 },
  { day: 'Sun', views: 29800, pub: 2 },
];

const SUB_GROWTH = [
  { m: 'Oct', v: 2100 },
  { m: 'Nov', v: 3400 },
  { m: 'Dec', v: 2800 },
  { m: 'Jan', v: 4200 },
  { m: 'Feb', v: 5100 },
  { m: 'Mar', v: 6800 },
];

const CATEGORY_DATA = [
  { name: 'Jobs', v: 234, fill: '#e65100' },
  { name: 'Results', v: 89, fill: '#2e7d32' },
  { name: 'Admit', v: 45, fill: '#6a1b9a' },
  { name: 'Ans Key', v: 32, fill: '#00695c' },
  { name: 'Syllabus', v: 21, fill: '#f57f17' },
];

const ACTIVITY = [
  { text: 'SSC CGL 2026 published', time: '2m ago', color: '#e65100', icon: Briefcase },
  { text: 'UPSC CSE Result posted', time: '18m ago', color: '#2e7d32', icon: Trophy },
  { text: '47 new subscribers joined', time: '1h ago', color: '#1565c0', icon: Users },
  { text: '3 Q&A questions pending', time: '2h ago', color: '#6a1b9a', icon: MessageCircle },
  { text: 'Railway Admit Card updated', time: '3h ago', color: '#00695c', icon: CreditCard },
  { text: 'Ticker item added', time: '5h ago', color: '#b71c1c', icon: Bell },
];

type IconComponent = ComponentType<{ className?: string; style?: CSSProperties; size?: string | number }>;

const TOP_POSTS = [
  { title: 'UP Police Constable 2026', views: '3,25,670', change: '+12%', up: true },
  { title: 'Railway Group D 2026', views: '2,15,000', change: '+8%', up: true },
  { title: 'SSC CGL 2026 Notification', views: '1,28,450', change: '+24%', up: true },
  { title: 'UPSC NDA 2026', views: '89,540', change: '+5%', up: true },
  { title: 'RRB NTPC 2026', views: '67,890', change: '-3%', up: false },
];

const STAT_CARDS = [
  { label: 'Total Posts', value: '421', icon: Hash, color: '#1565c0', bg: '#eff4ff', delta: '+24 this month' },
  { label: 'Total Views', value: '12.4L', icon: Eye, color: '#e65100', bg: '#fff4ef', delta: '+18% this week' },
  { label: 'Subscribers', value: '28,450', icon: Users, color: '#2e7d32', bg: '#f0fff4', delta: '+142 today' },
  { label: 'Pending Q&A', value: '17', icon: MessageCircle, color: '#6a1b9a', bg: '#f9f0ff', delta: 'Needs review' },
  { label: 'Drafts', value: '8', icon: Clock, color: '#f57f17', bg: '#fffbef', delta: 'Unpublished' },
  { label: 'Active Ticker', value: '7', icon: Radio, color: '#00695c', bg: '#f0fffe', delta: 'Live now' },
  { label: 'Latest Jobs', value: '234', icon: Briefcase, color: '#e65100', bg: '#fff4ef', delta: '+12 this week' },
  { label: 'Avg. Session', value: '3m 42s', icon: Activity, color: '#c62828', bg: '#fff0f0', delta: '+8.4%' },
];

const ALERTS = [
  { text: '5 Q&A questions pending approval', type: 'warning', action: 'Review Now', href: '/community' },
  { text: 'Bihar Police last date is in 3 days', type: 'danger', action: 'Update Post', href: '/announcements' },
  { text: 'Monthly analytics report ready', type: 'info', action: 'View Report', href: '/analytics' },
];

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number; color?: string; fill?: string; dataKey?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-lg">
      <p className="mb-1 text-[10px] font-semibold text-gray-500">{label}</p>
      {payload.map((item, index) => (
        <p key={`${item.name || item.dataKey}-${index}`} className="text-[12px] font-bold" style={{ color: item.color || item.fill || '#e65100' }}>
          {item.name || item.dataKey}: {Number(item.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const [viewMetric, setViewMetric] = useState<'views' | 'pub'>('views');

  return (
    <div className="space-y-5">
      <div
        className="relative overflow-hidden rounded-2xl px-6 py-5"
        style={{ background: 'linear-gradient(125deg, #060d2e 0%, #0d1b6e 40%, #1a237e 70%, #0a3880 100%)' }}
      >
        <div className="absolute -right-10 -top-10 h-52 w-52 rounded-full opacity-[0.08]" style={{ background: 'radial-gradient(circle, #fdd835, transparent)' }} />
        <div className="absolute bottom-0 right-10 h-32 w-32 rounded-full opacity-[0.05]" style={{ background: '#e65100' }} />
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(253,216,53,0.4), transparent)' }} />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
              <span className="text-[9px] font-extrabold tracking-[0.14em] text-green-300">LIVE ADMIN DASHBOARD</span>
            </div>
            <h1 className="text-[22px] font-black tracking-[-0.01em] text-white">Welcome back, Super Admin</h1>
            <p className="mt-1 text-[12px] text-blue-300">SarkariExams.me · Sunday, 29 March 2026 · All systems operational</p>
          </div>
          <div className="flex items-center gap-2.5">
            {[
              { label: 'This Week', value: '362.8K', sub: 'Page views', color: '#fdd835' },
              { label: 'Published', value: '+24', sub: 'Posts today', color: '#4ade80' },
              { label: 'Live Alerts', value: '4.2K', sub: 'Subscribers firing', color: '#60a5fa' },
            ].map(item => (
              <div key={item.label} className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 backdrop-blur-sm">
                <div className="text-[18px] font-extrabold" style={{ color: item.color }}>{item.value}</div>
                <div className="text-[9px] font-semibold text-white/60">{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {ALERTS.map((item, index) => {
          const color = item.type === 'warning' ? '#f57f17' : item.type === 'danger' ? '#c62828' : '#1565c0';
          const bg = item.type === 'warning' ? '#fffbef' : item.type === 'danger' ? '#fff0f0' : '#eff4ff';
          const border = item.type === 'warning' ? '#ffe4a0' : item.type === 'danger' ? '#ffd0d0' : '#c2d9ff';
          const Icon = item.type === 'info' ? Bell : AlertCircle;

          return (
            <div key={index} className="flex items-center gap-3 rounded-xl border px-4 py-2.5" style={{ background: bg, borderColor: border }}>
              <Icon size={13} style={{ color, flexShrink: 0 }} />
              <p className="flex-1 text-[12px] font-medium text-gray-700">{item.text}</p>
              <Link href={item.href} className="shrink-0 rounded-lg px-3 py-1 text-[11px] font-bold text-white" style={{ background: color }}>
                {item.action}
              </Link>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STAT_CARDS.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="group cursor-default rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: item.bg }}>
                  <Icon size={16} style={{ color: item.color }} />
                </div>
                <ArrowUpRight size={13} className="mt-0.5 text-gray-200 transition-colors group-hover:text-gray-400" />
              </div>
              <div className="text-[21px] font-black text-gray-800">{item.value}</div>
              <div className="mt-0.5 text-[11px] font-semibold text-gray-500">{item.label}</div>
              <div className="mt-2 flex items-center gap-1.5">
                <Zap size={9} style={{ color: item.color }} />
                <span className="text-[10px] font-semibold" style={{ color: item.color }}>{item.delta}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-[14px] font-bold text-gray-800">Weekly Traffic</h3>
              <p className="text-[11px] text-gray-400">Last 7 days page views & posts published</p>
            </div>
            <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
              {(['views', 'pub'] as const).map(metric => (
                <button
                  key={metric}
                  type="button"
                  onClick={() => setViewMetric(metric)}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${viewMetric === metric ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {metric === 'views' ? 'Page Views' : 'Posts Published'}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={WEEKLY_DATA} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="dashMainGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e65100" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#e65100" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" vertical={false} />
              <XAxis axisLine={false} dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} />
              <YAxis axisLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={value => viewMetric === 'views' ? `${(Number(value) / 1000).toFixed(0)}K` : `${value}`} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area activeDot={{ r: 5, fill: '#e65100', stroke: '#fff', strokeWidth: 2 }} dataKey={viewMetric} dot={{ r: 3, fill: '#e65100', strokeWidth: 0 }} fill="url(#dashMainGrad)" name={viewMetric === 'views' ? 'Views' : 'Posts'} stroke="#e65100" strokeWidth={2.5} type="monotone" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-1 text-[14px] font-bold text-gray-800">Posts by Category</h3>
          <p className="mb-4 text-[11px] text-gray-400">Content distribution</p>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={CATEGORY_DATA} margin={{ top: 0, right: 0, bottom: 0, left: -25 }}>
              <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" vertical={false} />
              <XAxis axisLine={false} dataKey="name" tick={{ fontSize: 9.5, fill: '#9ca3af' }} tickLine={false} />
              <YAxis axisLine={false} tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="v" name="Posts" radius={[5, 5, 0, 0]}>
                {CATEGORY_DATA.map((item, index) => <Cell key={index} fill={item.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1.5">
            {CATEGORY_DATA.map(item => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.fill }} />
                <span className="flex-1 text-[11px] text-gray-600">{item.name}</span>
                <span className="text-[11px] font-bold" style={{ color: item.fill }}>{item.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-gray-800">Recent Activity</h3>
            <span className="flex items-center gap-1.5 rounded-full border border-green-100 bg-green-50 px-2.5 py-1">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
              <span className="text-[9px] font-bold text-green-700">LIVE</span>
            </span>
          </div>
          <div className="relative space-y-3">
            <div className="absolute bottom-0 left-4 top-0 w-px bg-gray-100" />
            {ACTIVITY.map((item, index) => {
              const Icon = item.icon as IconComponent;
              return (
                <div key={index} className="flex items-start gap-3">
                  <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ background: `${item.color}18`, border: `1.5px solid ${item.color}30` }}>
                    <Icon size={13} style={{ color: item.color }} />
                  </div>
                  <div className="min-w-0 flex-1 pt-1.5">
                    <p className="text-[12px] font-medium text-gray-700">{item.text}</p>
                    <p className="text-[10px] text-gray-400">{item.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-gray-800">Top Performing Posts</h3>
            <BarChart3 size={15} className="text-gray-300" />
          </div>
          <div className="space-y-1.5">
            {TOP_POSTS.map((item, index) => (
              <div key={index} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-gray-50">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-extrabold text-white" style={{ background: index === 0 ? 'linear-gradient(135deg, #e65100, #bf360c)' : index === 1 ? 'linear-gradient(135deg, #1565c0, #1a237e)' : '#e5e7eb', color: index < 2 ? '#fff' : '#6b7280' }}>
                  {index + 1}
                </span>
                <p className="flex-1 truncate text-[12px] font-semibold text-gray-700">{item.title}</p>
                <div className="shrink-0 text-right">
                  <div className="text-[12px] font-bold text-gray-700">{item.views}</div>
                  <div className={`flex items-center justify-end gap-0.5 text-[10px] font-semibold ${item.up ? 'text-green-600' : 'text-red-500'}`}>
                    {item.up ? <TrendingUp size={9} /> : <TrendingDown size={9} />} {item.change}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-[14px] font-bold text-gray-800">Subscriber Growth (6 Months)</h3>
            <p className="text-[11px] text-gray-400">New email subscribers per month</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 px-4 py-2">
            <TrendingUp size={14} className="text-green-600" />
            <div>
              <div className="text-[13px] font-extrabold text-green-800">+33% MoM growth</div>
              <div className="text-[9px] text-green-600">Month over month</div>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={SUB_GROWTH} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" vertical={false} />
            <XAxis axisLine={false} dataKey="m" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} />
            <YAxis axisLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="v" fill="#1565c0" name="Subscribers" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-[14px] font-bold text-gray-800">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'New Job Post', icon: Briefcase, color: '#e65100', bg: '#fff4ef', href: '/announcements/new' },
            { label: 'Post Result', icon: Trophy, color: '#2e7d32', bg: '#f0fff4', href: '/announcements/new' },
            { label: 'Upload Admit Card', icon: CreditCard, color: '#6a1b9a', bg: '#f9f0ff', href: '/announcements/new' },
            { label: 'Add Ticker Item', icon: Bell, color: '#1565c0', bg: '#eff4ff', href: '/notifications' },
          ].map(item => {
            const Icon = item.icon;
            return (
              <Link key={item.label} href={item.href} className="flex flex-col items-center gap-2.5 rounded-xl border-2 border-dashed px-3 py-4 transition-all hover:scale-105 hover:shadow-md active:scale-95" style={{ borderColor: `${item.color}30`, background: item.bg }}>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `${item.color}22` }}>
                  <Icon size={20} style={{ color: item.color }} />
                </div>
                <span className="text-[12px] font-bold" style={{ color: item.color }}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
