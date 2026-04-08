'use client';

import { useMemo, useState } from 'react';
import { Activity, AlertCircle, CheckCircle, Download, Edit2, LogIn, LogOut, Plus, Search, Settings, Shield, Trash2, X } from 'lucide-react';

type ActionType = 'create' | 'update' | 'delete' | 'publish' | 'login' | 'logout' | 'approve' | 'setting' | 'bulk';
type Severity = 'info' | 'warning' | 'success' | 'danger';

interface LogEntry {
  id: string;
  time: string;
  user: string;
  userInitials: string;
  action: ActionType;
  entity: string;
  detail: string;
  ip: string;
  severity: Severity;
  changes?: Array<{ field: string; old: string; new: string }>;
}

const LOG_DATA: LogEntry[] = [
  { id: '1', time: '2026-03-29 14:32:05', user: 'Super Admin', userInitials: 'SA', action: 'publish', entity: 'SSC CGL 2026 Notification', detail: 'Post published with 14,582 vacancies', ip: '192.168.1.1', severity: 'success' },
  { id: '2', time: '2026-03-29 14:28:11', user: 'Super Admin', userInitials: 'SA', action: 'approve', entity: 'Q&A: Final year eligibility question', detail: 'Question approved and made public', ip: '192.168.1.1', severity: 'success' },
  { id: '3', time: '2026-03-29 14:15:42', user: 'Super Admin', userInitials: 'SA', action: 'create', entity: 'UPSC CSE Prelims Admit Card 2026', detail: 'New admit card post created (draft)', ip: '192.168.1.1', severity: 'info' },
  { id: '4', time: '2026-03-29 13:55:03', user: 'Super Admin', userInitials: 'SA', action: 'setting', entity: 'Site SEO Settings', detail: 'Meta title and description updated', ip: '192.168.1.1', severity: 'info', changes: [{ field: 'metaTitle', old: 'SarkariExams - India Jobs', new: 'SarkariExams.me - Latest Govt Jobs' }, { field: 'metaDescription', old: 'Find all govt jobs.', new: 'Get the latest Sarkari Results, Admit Cards, and Jobs.' }] },
  { id: '5', time: '2026-03-29 13:30:29', user: 'Super Admin', userInitials: 'SA', action: 'login', entity: 'Admin Console', detail: 'Successful admin login from browser', ip: '192.168.1.1', severity: 'success' },
  { id: '6', time: '2026-03-29 12:44:17', user: 'Super Admin', userInitials: 'SA', action: 'update', entity: 'Railway Group D 2026', detail: 'Last date updated to 15 May 2026', ip: '192.168.1.1', severity: 'info', changes: [{ field: 'lastDate', old: '2026-04-30', new: '2026-05-15' }] },
  { id: '7', time: '2026-03-29 12:10:08', user: 'Super Admin', userInitials: 'SA', action: 'delete', entity: 'Q&A: Spam question #4821', detail: 'Spam question deleted from UP Police post', ip: '192.168.1.1', severity: 'danger' },
  { id: '8', time: '2026-03-29 11:55:33', user: 'Super Admin', userInitials: 'SA', action: 'create', entity: 'Ticker: Bihar Police alert', detail: 'New ticker item added - Bihar Police 21,391 posts', ip: '192.168.1.1', severity: 'info' },
  { id: '9', time: '2026-03-29 11:30:51', user: 'Super Admin', userInitials: 'SA', action: 'bulk', entity: '3 expired posts', detail: 'Bulk status change: 3 posts marked as expired', ip: '192.168.1.1', severity: 'warning' },
  { id: '10', time: '2026-03-29 10:45:22', user: 'Super Admin', userInitials: 'SA', action: 'approve', entity: 'Q&A Answer: OBC relaxation', detail: 'Answer marked as Best Answer', ip: '192.168.1.1', severity: 'success' },
  { id: '11', time: '2026-03-29 10:18:09', user: 'Super Admin', userInitials: 'SA', action: 'publish', entity: 'SSC CGL Tier-I Result 2025', detail: 'Result post published successfully', ip: '192.168.1.1', severity: 'success' },
  { id: '12', time: '2026-03-29 09:55:44', user: 'Super Admin', userInitials: 'SA', action: 'update', entity: 'IBPS PO 2026', detail: 'Application fee details corrected', ip: '192.168.1.1', severity: 'info', changes: [{ field: 'applicationFee.general', old: '850 INR', new: '850 INR + 18% GST' }, { field: 'applicationFee.scst', old: '175 INR', new: '175 INR + 18% GST' }] },
  { id: '13', time: '2026-03-28 22:30:15', user: 'Super Admin', userInitials: 'SA', action: 'logout', entity: 'Admin Console', detail: 'Session ended - logged out', ip: '192.168.1.1', severity: 'info' },
  { id: '14', time: '2026-03-28 21:00:08', user: 'Super Admin', userInitials: 'SA', action: 'setting', entity: 'Feature Toggles', detail: 'Maintenance mode disabled', ip: '192.168.1.1', severity: 'warning' },
  { id: '15', time: '2026-03-28 19:45:33', user: 'Super Admin', userInitials: 'SA', action: 'create', entity: 'UPSC NDA 2026 Notification', detail: 'New post created with 400 vacancies', ip: '192.168.1.1', severity: 'info' },
  { id: '16', time: '2026-03-28 18:22:11', user: 'Super Admin', userInitials: 'SA', action: 'delete', entity: 'Duplicate: SSC CGL Draft v2', detail: 'Duplicate draft deleted', ip: '192.168.1.1', severity: 'danger' },
  { id: '17', time: '2026-03-28 17:10:59', user: 'Super Admin', userInitials: 'SA', action: 'login', entity: 'Admin Console', detail: 'Admin login - session started', ip: '192.168.1.1', severity: 'success' },
  { id: '18', time: '2026-03-27 14:30:00', user: 'Super Admin', userInitials: 'SA', action: 'bulk', entity: '5 posts', detail: 'Bulk publish - 5 posts published simultaneously', ip: '192.168.1.1', severity: 'success' },
];

const ACTION_CONFIG = {
  create: { label: 'Created', icon: Plus, color: '#1565c0', bg: '#eff4ff' },
  update: { label: 'Updated', icon: Edit2, color: '#f57f17', bg: '#fffbef' },
  delete: { label: 'Deleted', icon: Trash2, color: '#c62828', bg: '#fff0f0' },
  publish: { label: 'Published', icon: CheckCircle, color: '#2e7d32', bg: '#f0fff4' },
  login: { label: 'Login', icon: LogIn, color: '#00695c', bg: '#f0fffe' },
  logout: { label: 'Logout', icon: LogOut, color: '#6b7280', bg: '#f9fafb' },
  approve: { label: 'Approved', icon: Shield, color: '#6a1b9a', bg: '#f9f0ff' },
  setting: { label: 'Settings', icon: Settings, color: '#37474f', bg: '#f5f5f5' },
  bulk: { label: 'Bulk Action', icon: Activity, color: '#e65100', bg: '#fff4ef' },
} satisfies Record<ActionType, { label: string; icon: typeof Plus; color: string; bg: string }>;

const SEVERITY_CONFIG = {
  info: { color: '#1565c0', bg: '#eff4ff', label: 'Info' },
  success: { color: '#2e7d32', bg: '#f0fff4', label: 'Success' },
  warning: { color: '#f57f17', bg: '#fffbef', label: 'Warning' },
  danger: { color: '#c62828', bg: '#fff0f0', label: 'Danger' },
} satisfies Record<Severity, { color: string; bg: string; label: string }>;

export function AuditLogPage() {
  const [logs] = useState<LogEntry[]>(LOG_DATA);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<ActionType | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  const pageSize = 10;

  const filtered = useMemo(() => logs.filter(log => {
    const matchSearch =
      log.entity.toLowerCase().includes(search.toLowerCase()) ||
      log.detail.toLowerCase().includes(search.toLowerCase()) ||
      log.user.toLowerCase().includes(search.toLowerCase());
    const matchAction = actionFilter === 'all' || log.action === actionFilter;
    const matchSeverity = severityFilter === 'all' || log.severity === severityFilter;
    return matchSearch && matchAction && matchSeverity;
  }), [actionFilter, logs, search, severityFilter]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const stats = useMemo(() => ({
    total: logs.length,
    today: logs.filter(log => log.time.startsWith('2026-03-29')).length,
    warnings: logs.filter(log => log.severity === 'warning' || log.severity === 'danger').length,
    creates: logs.filter(log => log.action === 'create' || log.action === 'publish').length,
  }), [logs]);

  function handleExport() {
    const csv = [
      'Time,User,Action,Entity,Detail,IP,Severity',
      ...filtered.map(log => `"${log.time}","${log.user}","${log.action}","${log.entity}","${log.detail}","${log.ip}","${log.severity}"`),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'activity-log.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-extrabold text-gray-800">Activity Log</h2>
          <p className="text-[11px] text-gray-400">Complete audit trail of all admin actions</p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-[13px] font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Actions', value: stats.total, color: '#1565c0' },
          { label: 'Today', value: stats.today, color: '#2e7d32' },
          { label: 'Content Published', value: stats.creates, color: '#e65100' },
          { label: 'Alerts / Deletions', value: stats.warnings, color: '#c62828' },
        ].map(item => (
          <div key={item.label} className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
            <div className="text-[22px] font-extrabold" style={{ color: item.color }}>{item.value}</div>
            <div className="mt-0.5 text-[11px] text-gray-500">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="flex min-w-44 flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
            <Search size={14} className="shrink-0 text-gray-400" />
            <input
              value={search}
              onChange={event => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search actions, entities..."
              className="flex-1 bg-transparent text-[13px] text-gray-700 outline-none placeholder:text-gray-400"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')}>
                <X size={13} className="text-gray-400" />
              </button>
            )}
          </div>

          <select
            value={actionFilter}
            onChange={event => {
              setActionFilter(event.target.value as ActionType | 'all');
              setPage(1);
            }}
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[12px] font-semibold text-gray-700 outline-none"
          >
            <option value="all">All Actions</option>
            {(Object.keys(ACTION_CONFIG) as ActionType[]).map(action => (
              <option key={action} value={action}>{ACTION_CONFIG[action].label}</option>
            ))}
          </select>

          <select
            value={severityFilter}
            onChange={event => {
              setSeverityFilter(event.target.value as Severity | 'all');
              setPage(1);
            }}
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[12px] font-semibold text-gray-700 outline-none"
          >
            <option value="all">All Severity</option>
            <option value="success">Success</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="danger">Danger</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'linear-gradient(90deg, #f8f9ff, #f0f4ff)', borderBottom: '1.5px solid #e8ecf8' }}>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Time</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Action</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Entity / Post</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Detail</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Severity</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[13px] text-gray-400">
                    No log entries match your filters.
                  </td>
                </tr>
              )}
              {paginated.map((log, index) => {
                const action = ACTION_CONFIG[log.action];
                const severity = SEVERITY_CONFIG[log.severity];
                const Icon = action.icon;

                return (
                  <tr
                    key={log.id}
                    className={`border-b border-gray-50 transition-colors hover:bg-gray-50/50 ${index % 2 === 1 ? 'bg-gray-50/20' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-[11px] font-semibold text-gray-700">{log.time.split(' ')[0]}</p>
                        <p className="text-[10px] text-gray-400">{log.time.split(' ')[1]}</p>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="flex w-fit items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-bold" style={{ background: action.bg, color: action.color }}>
                        <Icon size={11} /> {action.label}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <p className="max-w-[220px] text-[12px] font-semibold text-gray-800">
                        {log.entity.length > 35 ? `${log.entity.slice(0, 35)}...` : log.entity}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1.5 items-start">
                        <p className="text-[12px] text-gray-500">{log.detail}</p>
                        {log.changes && log.changes.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            className="rounded-lg bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
                          >
                            Inspect Changes
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className="rounded-full px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.07em]"
                        style={{ background: severity.bg, color: severity.color }}
                      >
                        {severity.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/30 px-4 py-3">
            <span className="text-[11px] text-gray-400">
              {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filtered.length)} of {filtered.length}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setPage(current => Math.max(1, current - 1))}
                disabled={page === 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] text-gray-500 hover:bg-gray-100 disabled:opacity-40"
              >
                ← Prev
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, index) => index + 1).map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPage(item)}
                  className={`h-8 w-8 rounded-lg text-[12px] font-bold ${page === item ? 'text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                  style={{ background: page === item ? 'linear-gradient(135deg, #e65100, #bf360c)' : undefined }}
                >
                  {item}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage(current => Math.min(totalPages, current + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] text-gray-500 hover:bg-gray-100 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-900/50 dark:bg-amber-500/10">
        <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-500" />
        <div>
          <p className="text-[12px] font-bold text-amber-800 dark:text-amber-500">Audit Trail Notice</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-amber-700 dark:text-amber-600/90">
            All admin actions are logged with timestamps and IP addresses. This log is retained for 90 days and cannot be modified. Export regularly for compliance.
          </p>
        </div>
      </div>

      {selectedLog && selectedLog.changes && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[rgba(10,20,60,0.55)] p-4 backdrop-blur-[4px]">
          <div className="w-full max-w-3xl overflow-hidden rounded-[22px] bg-white dark:bg-card shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-border bg-muted/50 px-6 py-4">
              <div className="flex flex-col">
                <span className="text-[15px] font-extrabold text-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" /> Visual Diff Inspector
                </span>
                <span className="text-[12px] text-muted-foreground mt-0.5">
                  Action performed by {selectedLog.user} on {selectedLog.time}
                </span>
              </div>
              <button type="button" onClick={() => setSelectedLog(null)} className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 space-y-6">
              <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 border-l-4 border-l-blue-500">
                <p className="text-[12px] font-bold uppercase text-muted-foreground tracking-wider mb-1">Target Entity</p>
                <p className="text-[14px] font-semibold text-foreground">{selectedLog.entity}</p>
                <p className="text-[13px] text-muted-foreground mt-1">{selectedLog.detail}</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-[14px] font-extrabold text-foreground border-b border-border pb-2">Fields Changed</h3>
                
                <div className="grid grid-cols-[minmax(120px,1fr)_2fr_2fr] gap-4">
                  <div className="text-[11px] font-bold uppercase text-muted-foreground px-2">Field / Key</div>
                  <div className="text-[11px] font-bold uppercase text-red-500 bg-red-500/10 rounded-md px-3 py-1 w-fit">Removed / Old</div>
                  <div className="text-[11px] font-bold uppercase text-green-500 bg-green-500/10 rounded-md px-3 py-1 w-fit">Added / New</div>
                </div>

                <div className="space-y-2">
                  {selectedLog.changes.map((change, idx) => (
                    <div key={idx} className="grid grid-cols-[minmax(120px,1fr)_2fr_2fr] gap-4 items-start border-t border-border/50 pt-2">
                      <div className="px-2 pt-1 font-mono text-[12px] font-bold text-foreground overflow-hidden text-ellipsis whitespace-nowrap" title={change.field}>
                        {change.field}
                      </div>
                      <div className="rounded-lg bg-[#ffebe9] dark:bg-[#ffebe9]/10 p-3 relative group">
                        <span className="text-[13px] font-mono whitespace-pre-wrap break-all text-[#cf222e] dark:text-[#ff7b72]">{change.old}</span>
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#cf222e]/10 dark:bg-[#ff7b72]/20 rounded px-1.5 py-0.5 text-[10px] text-[#cf222e] dark:text-[#ff7b72] font-bold">- Old</div>
                      </div>
                      <div className="rounded-lg bg-[#e6ffec] dark:bg-[#e6ffec]/10 p-3 relative group">
                        <span className="text-[13px] font-mono whitespace-pre-wrap break-all text-[#1a7f37] dark:text-[#3fb950]">{change.new}</span>
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#1a7f37]/10 dark:bg-[#3fb950]/20 rounded px-1.5 py-0.5 text-[10px] text-[#1a7f37] dark:text-[#3fb950] font-bold">+ New</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 border-t border-border bg-muted/30 px-6 py-4 mt-auto">
              <button type="button" onClick={() => setSelectedLog(null)} className="rounded-xl bg-primary px-5 py-2.5 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
