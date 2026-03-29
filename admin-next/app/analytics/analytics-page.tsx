'use client';

import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingDown, TrendingUp } from 'lucide-react';

const TRAFFIC_DATA_30 = [
  { date: 'Mar 1', views: 28400, users: 18200, sessions: 22100 },
  { date: 'Mar 3', views: 32100, users: 21000, sessions: 25300 },
  { date: 'Mar 5', views: 45200, users: 29800, sessions: 36400 },
  { date: 'Mar 7', views: 38900, users: 25400, sessions: 30700 },
  { date: 'Mar 9', views: 52300, users: 34100, sessions: 41800 },
  { date: 'Mar 11', views: 48700, users: 31900, sessions: 38200 },
  { date: 'Mar 13', views: 61200, users: 40100, sessions: 48700 },
  { date: 'Mar 15', views: 58400, users: 38200, sessions: 46400 },
  { date: 'Mar 17', views: 72800, users: 47600, sessions: 57900 },
  { date: 'Mar 19', views: 69300, users: 45300, sessions: 54800 },
  { date: 'Mar 21', views: 83500, users: 54600, sessions: 66200 },
  { date: 'Mar 23', views: 78900, users: 51600, sessions: 62700 },
  { date: 'Mar 25', views: 91200, users: 59600, sessions: 72400 },
  { date: 'Mar 27', views: 87800, users: 57400, sessions: 69700 },
  { date: 'Mar 29', views: 95400, users: 62400, sessions: 75800 },
];

const CATEGORY_TRAFFIC = [
  { name: 'Latest Jobs', views: 485000, fill: '#e65100' },
  { name: 'Results', views: 198000, fill: '#2e7d32' },
  { name: 'Admit Card', views: 145000, fill: '#6a1b9a' },
  { name: 'Answer Key', views: 89000, fill: '#00695c' },
  { name: 'Syllabus', views: 52000, fill: '#f57f17' },
];

const TOP_PAGES = [
  { title: 'UP Police Constable 2026', path: '/detail/up-police-2026', views: '3,25,670', change: '+12%', up: true },
  { title: 'Railway Group D 2026', path: '/detail/railway-group-d', views: '2,15,000', change: '+8%', up: true },
  { title: 'UPSC CSE Result 2025', path: '/detail/upsc-cse-result', views: '1,98,450', change: '+24%', up: true },
  { title: 'SSC CGL 2026', path: '/detail/ssc-cgl-2026', views: '1,78,900', change: '-3%', up: false },
  { title: 'IBPS PO 2026', path: '/detail/ibps-po-2026', views: '98,540', change: '+5%', up: true },
  { title: 'Bihar Police 2026', path: '/detail/bihar-police-2026', views: '89,540', change: '+18%', up: true },
  { title: 'UPSC NDA 2026', path: '/detail/upsc-nda-2026', views: '67,890', change: '+2%', up: true },
  { title: 'SSC CHSL Syllabus', path: '/detail/ssc-chsl-syllabus', views: '45,230', change: '+9%', up: true },
];

const DEVICE_DATA = [
  { name: 'Mobile', value: 68, fill: '#e65100' },
  { name: 'Desktop', value: 24, fill: '#1565c0' },
  { name: 'Tablet', value: 8, fill: '#2e7d32' },
];

const STATE_DATA = [
  { state: 'Uttar Pradesh', users: 185000, pct: 100 },
  { state: 'Bihar', users: 142000, pct: 77 },
  { state: 'Rajasthan', users: 98000, pct: 53 },
  { state: 'Madhya Pradesh', users: 87000, pct: 47 },
  { state: 'Maharashtra', users: 76000, pct: 41 },
  { state: 'Delhi', users: 65000, pct: 35 },
  { state: 'Haryana', users: 54000, pct: 29 },
  { state: 'Gujarat', users: 43000, pct: 23 },
];

const HOURLY_DATA = [
  { hour: 0, label: '12am', views: 2100 },
  { hour: 1, label: '1am', views: 1800 },
  { hour: 2, label: '2am', views: 1600 },
  { hour: 3, label: '3am', views: 1500 },
  { hour: 4, label: '4am', views: 1700 },
  { hour: 5, label: '5am', views: 2300 },
  { hour: 6, label: '6am', views: 3400 },
  { hour: 7, label: '7am', views: 4700 },
  { hour: 8, label: '8am', views: 6300 },
  { hour: 9, label: '9am', views: 7600 },
  { hour: 10, label: '10am', views: 8100 },
  { hour: 11, label: '11am', views: 8400 },
  { hour: 12, label: '12pm', views: 7800 },
  { hour: 13, label: '1pm', views: 7200 },
  { hour: 14, label: '2pm', views: 6900 },
  { hour: 15, label: '3pm', views: 7600 },
  { hour: 16, label: '4pm', views: 8400 },
  { hour: 17, label: '5pm', views: 9100 },
  { hour: 18, label: '6pm', views: 9800 },
  { hour: 19, label: '7pm', views: 10100 },
  { hour: 20, label: '8pm', views: 9600 },
  { hour: 21, label: '9pm', views: 8700 },
  { hour: 22, label: '10pm', views: 6500 },
  { hour: 23, label: '11pm', views: 3900 },
];

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string; fill?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-[140px] rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-lg">
      <p className="mb-1 text-[11px] font-semibold text-gray-600">{label}</p>
      {payload.map((item, index) => (
        <p key={`${item.name}-${index}`} className="text-[12px] font-bold" style={{ color: item.color || item.fill }}>
          {item.name}: {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
        </p>
      ))}
    </div>
  );
}

export function AnalyticsPage() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [metric, setMetric] = useState<'views' | 'users' | 'sessions'>('views');

  const kpis = useMemo(() => [
    { label: 'Total Page Views', value: '12.4L', change: '+18.3%', up: true, color: '#e65100', bg: '#fff4ef', width: '82%' },
    { label: 'Unique Users', value: '8.1L', change: '+22.1%', up: true, color: '#1565c0', bg: '#eff4ff', width: '77%' },
    { label: 'Avg. Session Duration', value: '3m 42s', change: '+8.4%', up: true, color: '#2e7d32', bg: '#f0fff4', width: '69%' },
    { label: 'Bounce Rate', value: '38.2%', change: '-4.1%', up: true, color: '#6a1b9a', bg: '#f9f0ff', width: '61%' },
    { label: 'New Subscribers', value: '+6,842', change: '+33%', up: true, color: '#c62828', bg: '#fff0f0', width: '72%' },
    { label: 'Avg. Page Depth', value: '2.8 pages', change: '+0.3', up: true, color: '#00695c', bg: '#f0fffe', width: '57%' },
  ], []);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-extrabold text-gray-800">Analytics</h2>
          <p className="text-[11px] text-gray-400">Traffic insights for SarkariExams.me</p>
        </div>
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
          {(['7d', '30d', '90d'] as const).map(item => (
            <button
              key={item}
              type="button"
              onClick={() => setPeriod(item)}
              className={`rounded-lg px-4 py-2 text-[12px] font-semibold transition-all ${
                period === item ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {item === '7d' ? '7 Days' : item === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {kpis.map(item => (
          <div key={item.label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-start justify-between">
              <p className="text-[11px] font-semibold text-gray-500">{item.label}</p>
              <span
                className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                  item.up ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                }`}
              >
                {item.up ? <TrendingUp size={9} /> : <TrendingDown size={9} />} {item.change}
              </span>
            </div>
            <p className="text-[22px] font-extrabold" style={{ color: item.color }}>{item.value}</p>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full" style={{ width: item.width, background: item.color }} />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-[14px] font-bold text-gray-800">Traffic Overview</h3>
            <p className="text-[11px] text-gray-400">Last 30 days daily traffic</p>
          </div>
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
            {(['views', 'users', 'sessions'] as const).map(item => (
              <button
                key={item}
                type="button"
                onClick={() => setMetric(item)}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold capitalize transition-all ${
                  metric === item ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={TRAFFIC_DATA_30} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
            <defs>
              <linearGradient id="analyticsAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#e65100" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#e65100" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" vertical={false} />
            <XAxis axisLine={false} dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} />
            <YAxis
              axisLine={false}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickFormatter={(value: number) => `${(value / 1000).toFixed(0)}K`}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              activeDot={{ r: 5, fill: '#e65100', stroke: '#fff', strokeWidth: 2 }}
              dataKey={metric}
              dot={false}
              fill="url(#analyticsAreaGrad)"
              name={metric.charAt(0).toUpperCase() + metric.slice(1)}
              stroke="#e65100"
              strokeWidth={2.5}
              type="monotone"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="mb-4 text-[14px] font-bold text-gray-800">Views by Category</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={CATEGORY_TRAFFIC} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 60 }}>
              <CartesianGrid horizontal={false} stroke="#f0f0f0" strokeDasharray="3 3" />
              <XAxis
                axisLine={false}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickFormatter={(value: number) => `${(value / 1000).toFixed(0)}K`}
                tickLine={false}
                type="number"
              />
              <YAxis
                axisLine={false}
                dataKey="name"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                type="category"
                width={55}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="views" name="Views" radius={[0, 6, 6, 0]}>
                {CATEGORY_TRAFFIC.map(item => (
                  <Cell key={item.name} fill={item.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-[14px] font-bold text-gray-800">Device Split</h3>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie cx="50%" cy="50%" data={DEVICE_DATA} dataKey="value" innerRadius={40} outerRadius={65} paddingAngle={3}>
                {DEVICE_DATA.map(item => (
                  <Cell key={item.name} fill={item.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-2">
            {DEVICE_DATA.map(item => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.fill }} />
                  <span className="text-[12px] text-gray-600">{item.name}</span>
                </div>
                <span className="text-[12px] font-bold" style={{ color: item.fill }}>{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-[14px] font-bold text-gray-800">Top Pages</h3>
          <div className="space-y-1">
            {TOP_PAGES.map((item, index) => (
              <div key={item.path} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-gray-50">
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[9px] font-extrabold"
                  style={{
                    background: index < 3 ? 'linear-gradient(135deg, #e65100, #bf360c)' : '#e5e7eb',
                    color: index < 3 ? '#fff' : '#6b7280',
                  }}
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-gray-800">{item.title}</p>
                  <p className="truncate text-[10px] text-gray-400">{item.path}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[12px] font-bold text-gray-700">{item.views}</p>
                  <p className={`flex items-center justify-end gap-0.5 text-[10px] font-semibold ${item.up ? 'text-green-600' : 'text-red-500'}`}>
                    {item.up ? <TrendingUp size={9} /> : <TrendingDown size={9} />} {item.change}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-[14px] font-bold text-gray-800">Traffic by State</h3>
          <div className="space-y-3">
            {STATE_DATA.map(item => (
              <div key={item.state}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-gray-700">{item.state}</span>
                  <span className="text-[11px] text-gray-500">{item.users.toLocaleString()}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${item.pct}%`, background: 'linear-gradient(90deg, #e65100, #ff7043)' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-[14px] font-bold text-gray-800">Hourly Traffic Pattern</h3>
          <p className="text-[11px] text-gray-400">Average page views per hour (IST)</p>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={HOURLY_DATA} margin={{ top: 0, right: 0, bottom: 0, left: -25 }}>
            <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" vertical={false} />
            <XAxis axisLine={false} dataKey="label" interval={2} tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} />
            <YAxis
              axisLine={false}
              tick={{ fontSize: 9, fill: '#9ca3af' }}
              tickFormatter={(value: number) => `${(value / 1000).toFixed(0)}K`}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="views" name="Views" radius={[3, 3, 0, 0]}>
              {HOURLY_DATA.map(item => (
                <Cell
                  key={item.hour}
                  fill={item.views > 7000 ? '#e65100' : item.views > 4000 ? '#ff8a65' : '#ffccbc'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-3 flex items-center gap-3">
          <span className="text-[10px] text-gray-400">Peak: 6PM-9PM IST</span>
          <div className="flex items-center gap-2">
            {[
              ['Low', '#ffccbc'],
              ['Medium', '#ff8a65'],
              ['High', '#e65100'],
            ].map(([label, color]) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded" style={{ background: color }} />
                <span className="text-[10px] text-gray-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
