'use client';

import Link from 'next/link';
import {
  usePathname,
  useRouter,
  useSearchParams,
  type ReadonlyURLSearchParams,
} from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ComponentType } from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Command,
  CreditCard,
  ExternalLink,
  FileText,
  Hash,
  Info,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  Radio,
  Search,
  Settings,
  Shield,
  TriangleAlert,
  Trophy,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './theme-toggle';

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  badge?: string | number;
  sub?: boolean;
  match?: (pathname: string, searchParams: ReadonlyURLSearchParams) => boolean;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

type NotificationItem = {
  id: number;
  text: string;
  time: string;
  type: 'info' | 'warning' | 'success';
  read: boolean;
};

const NAV_SECTIONS: NavSection[] = [
  {
    label: '',
    items: [{ href: '/', label: 'Dashboard', icon: LayoutDashboard, match: pathname => pathname === '/' }],
  },
  {
    label: 'Content',
    items: [
      {
        href: '/announcements',
        label: 'All Posts',
        icon: Hash,
        badge: 16,
        match: (pathname, searchParams) => pathname === '/announcements' && !searchParams.get('type'),
      },
      {
        href: '/announcements?type=job',
        label: 'Latest Jobs',
        icon: Briefcase,
        badge: 9,
        sub: true,
        match: (pathname, searchParams) => pathname === '/announcements' && searchParams.get('type') === 'job',
      },
      {
        href: '/announcements?type=result',
        label: 'Results',
        icon: Trophy,
        badge: 3,
        sub: true,
        match: (pathname, searchParams) => pathname === '/announcements' && searchParams.get('type') === 'result',
      },
      {
        href: '/announcements?type=admit-card',
        label: 'Admit Cards',
        icon: CreditCard,
        sub: true,
        match: (pathname, searchParams) => pathname === '/announcements' && searchParams.get('type') === 'admit-card',
      },
      {
        href: '/announcements?type=answer-key',
        label: 'Answer Keys',
        icon: FileText,
        sub: true,
        match: (pathname, searchParams) => pathname === '/announcements' && searchParams.get('type') === 'answer-key',
      },
      {
        href: '/announcements?type=syllabus',
        label: 'Syllabus',
        icon: BookOpen,
        sub: true,
        match: (pathname, searchParams) => pathname === '/announcements' && searchParams.get('type') === 'syllabus',
      },
    ],
  },
  {
    label: 'Community',
    items: [
      { href: '/community', label: 'Q&A Moderation', icon: MessageSquare, badge: 5 },
    ],
  },
  {
    label: 'Insights',
    items: [
      { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Site',
    items: [
      { href: '/notifications', label: 'Ticker & Links', icon: Radio },
      { href: '/subscribers', label: 'Subscribers', icon: Users, badge: '28K' },
      { href: '/audit-log', label: 'Activity Log', icon: Activity },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

const NOTIFICATIONS: NotificationItem[] = [
  { id: 1, text: 'SSC CGL 2026 - 5 new Q&A questions pending review', time: '2 min ago', type: 'warning', read: false },
  { id: 2, text: '142 new subscribers joined today', time: '18 min ago', type: 'success', read: false },
  { id: 3, text: 'Railway Admit Card last date is tomorrow', time: '1 hr ago', type: 'info', read: false },
  { id: 4, text: 'Monthly analytics report is ready', time: '3 hr ago', type: 'info', read: true },
  { id: 5, text: 'UPSC NDA 2026 - last date alert firing', time: '5 hr ago', type: 'warning', read: true },
];

function matchesNavItem(item: NavItem, pathname: string, searchParams: ReadonlyURLSearchParams) {
  if (item.match) return item.match(pathname, searchParams);
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function formatSegment(segment: string) {
  return segment.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function getPageTitle(pathname: string, searchParams: ReadonlyURLSearchParams, currentItem?: NavItem) {
  if (pathname === '/announcements/new') return 'New Post';
  if (pathname.startsWith('/announcements/') && pathname !== '/announcements/new') return 'Edit Post';
  if (currentItem) return currentItem.label;
  if (pathname === '/announcements' && searchParams.get('type')) {
    return formatSegment(searchParams.get('type') ?? 'announcements');
  }

  const segments = pathname.split('/').filter(Boolean);
  return segments.length === 0 ? 'Dashboard' : formatSegment(segments[segments.length - 1]);
}

function getInitials(name?: string | null) {
  if (!name) return 'AD';
  const parts = name.split(/[\s._-]+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return 'AD';
  return parts.map(part => part[0]?.toUpperCase() ?? '').join('');
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(NOTIFICATIONS);
  const paletteRef = useRef<HTMLInputElement>(null);

  const flatItems = useMemo(() => NAV_SECTIONS.flatMap(section => section.items), []);
  const currentItem = useMemo(
    () => flatItems.find(item => matchesNavItem(item, pathname, searchParams)),
    [flatItems, pathname, searchParams]
  );
  const pageTitle = getPageTitle(pathname, searchParams, currentItem);
  const userLabel = user?.username || user?.email || 'Admin';
  const unreadCount = notifications.filter(item => !item.read).length;
  const liveSiteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      toast.success('Logged out from admin console.');
      router.refresh();
    } catch {
      toast.error('Unable to log out right now.');
    }
  }, [logout, router]);

  const commandItems = useMemo(
    () => [
      { id: 'new-post', label: 'New Post', icon: Plus, description: 'Create a new job / result post', run: () => router.push('/announcements/new') },
      { id: 'dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, description: 'Overview & metrics', run: () => router.push('/') },
      { id: 'all-posts', label: 'All Posts', icon: Hash, description: 'Browse all content', run: () => router.push('/announcements') },
      { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Traffic & insights', run: () => router.push('/analytics') },
      { id: 'qa', label: 'Q&A Moderation', icon: MessageSquare, description: 'Review pending questions', run: () => router.push('/community') },
      { id: 'ticker', label: 'Ticker & Links', icon: Radio, description: 'Manage scrolling ticker', run: () => router.push('/notifications') },
      { id: 'users', label: 'Subscribers', icon: Users, description: 'Manage subscriber list', run: () => router.push('/subscribers') },
      { id: 'activity', label: 'Activity Log', icon: Activity, description: 'Audit trail', run: () => router.push('/audit-log') },
      { id: 'settings', label: 'Settings', icon: Settings, description: 'Site configuration', run: () => router.push('/settings') },
      { id: 'view-site', label: 'View Live Site', icon: ExternalLink, description: 'Open homepage', run: () => window.open(liveSiteUrl, '_blank', 'noopener,noreferrer') },
      { id: 'logout', label: 'Logout', icon: LogOut, description: 'End admin session', run: () => void handleLogout() },
    ],
    [handleLogout, liveSiteUrl, router]
  );

  const filteredCommands = useMemo(() => {
    const query = paletteQuery.trim().toLowerCase();
    if (!query) return commandItems;
    return commandItems.filter(item =>
      item.label.toLowerCase().includes(query) || item.description.toLowerCase().includes(query)
    );
  }, [commandItems, paletteQuery]);

  useEffect(() => {
    setSidebarOpen(false);
    setPaletteOpen(false);
    setNotifOpen(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(open => !open);
      }

      if (event.key === 'Escape') {
        setPaletteOpen(false);
        setNotifOpen(false);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!paletteOpen) return;
    const timer = window.setTimeout(() => paletteRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [paletteOpen]);

  function markAllRead() {
    setNotifications(items => items.map(item => ({ ...item, read: true })));
  }

  function markRead(id: number) {
    setNotifications(items => items.map(item => item.id === id ? { ...item, read: true } : item));
  }

  function openLiveSite() {
    window.open(liveSiteUrl, '_blank', 'noopener,noreferrer');
  }

  const editorMode =
    pathname.startsWith('/announcements/new') ||
    (pathname.startsWith('/announcements/') && pathname !== '/announcements');

  return (
    <div className="flex h-screen overflow-hidden bg-admin-shell" style={{ fontFamily: "var(--font-sans), 'Inter', sans-serif" }}>
      {(sidebarOpen || paletteOpen) && (
        <div
          className={cn(
            'fixed inset-0 z-40 transition-opacity duration-200',
            sidebarOpen ? 'bg-black/60 lg:hidden' : 'bg-[rgba(10,20,60,0.65)] backdrop-blur-[6px]'
          )}
          onClick={() => {
            setSidebarOpen(false);
            setPaletteOpen(false);
          }}
        />
      )}

      {paletteOpen && (
        <div className="fixed inset-x-0 top-[15vh] z-50 mx-auto w-full max-w-xl px-4">
          <div className="overflow-hidden rounded-[22px] border border-border bg-card shadow-2xl">
            <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={paletteRef}
                value={paletteQuery}
                onChange={event => setPaletteQuery(event.target.value)}
                placeholder="Type a command or search..."
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
              />
              <button
                type="button"
                onClick={() => setPaletteOpen(false)}
                className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto py-2">
              {filteredCommands.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">No commands found.</div>
              ) : (
                filteredCommands.map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        item.run();
                        setPaletteOpen(false);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-orange-50"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-gray-500">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-gray-800">{item.label}</p>
                        <p className="truncate text-[11px] text-gray-400">{item.description}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    </button>
                  );
                })
              )}
            </div>
            <div className="flex items-center gap-4 border-t border-gray-100 bg-gray-50/60 px-4 py-2 text-[10px] text-gray-400">
              <span>Ctrl/Cmd + K</span>
              <span>Search</span>
              <span className="ml-auto">Esc to close</span>
            </div>
          </div>
        </div>
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col transition-[width,transform] duration-200 ease-out lg:relative lg:translate-x-0',
          collapsed ? 'w-[60px]' : 'w-60',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        style={{
          background: 'linear-gradient(165deg, #060d2e 0%, #0d1b6e 50%, #0a1428 100%)',
          boxShadow: '4px 0 28px rgba(0,0,0,0.45)',
        }}
      >
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="absolute right-3 top-4 rounded-full p-1.5 text-white/60 transition-colors hover:bg-white/15 hover:text-white lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>

        <div className={cn('flex items-center border-b border-white/10', collapsed ? 'justify-center px-2 py-4' : 'gap-3 px-4 py-4')}>
          {collapsed ? (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#fdd83559]"
              style={{ background: 'linear-gradient(135deg, rgba(253,216,53,0.25), rgba(253,216,53,0.08))' }}
            >
              <Shield className="h-4 w-4 text-yellow-400" />
            </button>
          ) : (
            <>
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[#fdd83559]"
                style={{ background: 'linear-gradient(135deg, rgba(253,216,53,0.25), rgba(253,216,53,0.08))' }}
              >
                <Shield className="h-4 w-4 text-yellow-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-black tracking-[-0.01em] text-white">Admin Console</div>
                <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#fdd83599]">SarkariExams.me</div>
              </div>
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/40 transition-colors hover:bg-white/20 hover:text-white"
              >
                <ChevronLeft className="h-3 w-3" />
              </button>
            </>
          )}
        </div>

        {!collapsed && (
          <div className="px-3 py-2.5">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="flex w-full items-center gap-2.5 rounded-2xl border border-white/10 bg-white/6 px-3 py-2 text-left transition-colors hover:bg-white/10"
            >
              <Search className="h-3.5 w-3.5 text-white/30" />
              <span className="flex-1 text-[11px] text-white/30">Quick search...</span>
              <span className="flex items-center gap-0.5 rounded-md bg-white/8 px-1.5 py-0.5 text-[8px] font-bold text-white/25">
                <Command className="h-2 w-2" />K
              </span>
            </button>
          </div>
        )}

        {!collapsed && (
          <div className="px-3 pb-2">
            <button
              type="button"
              onClick={() => router.push('/announcements/new')}
              className="flex w-full items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-white transition-transform hover:opacity-95 active:scale-[0.99]"
              style={{ background: 'linear-gradient(135deg, #e65100, #bf360c)', boxShadow: '0 3px 14px rgba(230,81,0,0.35)' }}
            >
              <Plus className="h-4 w-4" />
              <span className="text-[12.5px] font-bold">New Post</span>
              <Zap className="ml-auto h-3 w-3 text-yellow-300" />
            </button>
          </div>
        )}

        <nav className="scrollbar-none flex-1 overflow-y-auto px-2 py-1">
          {NAV_SECTIONS.map(section => (
            <div key={section.label}>
              {section.label && !collapsed && (
                <div className="px-2 pb-1 pt-4">
                  <span className="text-[8px] font-extrabold uppercase tracking-[0.16em] text-white/20">{section.label}</span>
                </div>
              )}
              {section.items.map(item => {
                const Icon = item.icon;
                const active = matchesNavItem(item, pathname, searchParams);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'group relative mb-0.5 flex w-full items-center rounded-xl transition-all duration-150',
                      collapsed ? 'justify-center px-2.5 py-2.5' : item.sub ? 'gap-2.5 py-2 pl-6 pr-3' : 'gap-2.5 px-3 py-2.5'
                    )}
                    style={{
                      background: active ? 'linear-gradient(135deg, rgba(230,81,0,0.3), rgba(230,81,0,0.15))' : undefined,
                      border: active ? '1px solid rgba(230,81,0,0.25)' : '1px solid transparent',
                      boxShadow: active ? '0 2px 16px rgba(230,81,0,0.12)' : undefined,
                    }}
                  >
                    {active && (
                      <span
                        className="absolute bottom-2 left-0 top-2 w-0.5 rounded-r-full"
                        style={{ background: 'linear-gradient(180deg, #ff7043, #e65100)', boxShadow: '0 0 8px rgba(230,81,0,0.8)' }}
                      />
                    )}
                    <Icon
                      className={cn('shrink-0', item.sub ? 'h-[13px] w-[13px]' : 'h-[14px] w-[14px]')}
                      style={{
                        color: active ? '#ff7043' : item.sub ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.45)',
                        filter: active ? 'drop-shadow(0 0 4px rgba(230,81,0,0.5))' : undefined,
                      }}
                    />
                    {!collapsed && (
                      <>
                        <span
                          className="min-w-0 flex-1 truncate text-left"
                          style={{
                            fontSize: item.sub ? 11.5 : 12.5,
                            fontWeight: active ? 700 : item.sub ? 400 : 500,
                            color: active ? '#fff' : item.sub ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.55)',
                          }}
                        >
                          {item.label}
                        </span>
                        {item.badge !== undefined && (
                          <span
                            className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold text-white"
                            style={{ background: active ? 'rgba(255,255,255,0.2)' : 'rgba(230,81,0,0.6)' }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                    {collapsed && item.badge !== undefined && (
                      <span className="absolute right-0 top-0 h-3 w-3 rounded-full border border-[#060d2e] bg-orange-500" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="shrink-0 space-y-1 border-t border-white/10 p-2.5">
          {!collapsed && (
            <div className="mb-1 flex items-center gap-2.5 rounded-2xl border border-white/8 bg-white/5 px-3 py-2.5">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold text-white"
                style={{ background: 'linear-gradient(135deg, #e65100, #bf360c)', boxShadow: '0 2px 8px rgba(230,81,0,0.4)' }}
              >
                {getInitials(userLabel)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-bold text-white">{userLabel}</div>
                <div className="text-[9px] font-semibold text-[#fdd83599]">Super Admin</div>
              </div>
              <div className="h-2 w-2 shrink-0 rounded-full bg-green-400" title="Online" />
            </div>
          )}

          <div className={cn('flex gap-1', collapsed ? 'flex-col' : 'flex-row')}>
            <button
              type="button"
              onClick={openLiveSite}
              className={cn(
                'flex items-center gap-2 rounded-xl py-2 text-[11px] text-white/35 transition-colors hover:bg-white/5 hover:text-white/70',
                collapsed ? 'w-full justify-center' : 'flex-1 px-3'
              )}
              title="View Site"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {!collapsed && 'View Site'}
            </button>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className={cn(
                'flex items-center gap-2 rounded-xl py-2 text-[11px] text-red-400/55 transition-colors hover:bg-red-500/10 hover:text-red-400',
                collapsed ? 'w-full justify-center' : 'flex-1 px-3'
              )}
              title="Logout"
            >
              <LogOut className="h-3.5 w-3.5" />
              {!collapsed && 'Logout'}
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-30 shrink-0 border-b border-border bg-card shadow-sm" style={{ height: 52 }}>
          <div className="flex h-full items-center gap-3 px-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-accent lg:hidden"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>

            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="hidden text-[11px] text-muted-foreground sm:block">Admin</span>
              <ChevronRight className="hidden h-3 w-3 text-muted-foreground/50 sm:block" />
              <span className="truncate text-sm font-bold text-foreground">{pageTitle}</span>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className="hidden items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent lg:flex"
              >
                <Search className="h-3 w-3" />
                Search
                <span className="ml-1 flex items-center gap-0.5 rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                  <Command className="h-2 w-2" />K
                </span>
              </button>

              <ThemeToggle />

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotifOpen(open => !open)}
                  className="relative rounded-xl p-2 text-muted-foreground transition-colors hover:bg-accent"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-red-500 text-[8px] font-extrabold text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-[22px] border border-gray-100 bg-white shadow-2xl">
                    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3" style={{ background: 'linear-gradient(90deg, #060d2e, #1a237e)' }}>
                      <div className="flex items-center gap-2">
                        <Bell className="h-3.5 w-3.5 text-white" />
                        <span className="text-[13px] font-bold text-white">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-extrabold text-white">{unreadCount}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={markAllRead}
                        className="text-[10px] font-semibold text-blue-300 transition-colors hover:text-white"
                      >
                        Mark all read
                      </button>
                    </div>

                    <div>
                      {notifications.map(item => {
                        const tone =
                          item.type === 'warning'
                            ? { icon: TriangleAlert, color: '#f57f17' }
                            : item.type === 'success'
                              ? { icon: CheckCircle, color: '#2e7d32' }
                              : { icon: Info, color: '#1565c0' };
                        const Icon = tone.icon;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => markRead(item.id)}
                            className={cn(
                              'flex w-full items-start gap-3 border-b border-gray-50 px-4 py-3 text-left transition-colors hover:bg-gray-50',
                              !item.read && 'bg-blue-50/30'
                            )}
                          >
                            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: tone.color }} />
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] text-gray-700" style={{ fontWeight: item.read ? 400 : 600 }}>{item.text}</p>
                              <p className="mt-0.5 text-[10px] text-gray-400">{item.time}</p>
                            </div>
                            {!item.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                          </button>
                        );
                      })}
                    </div>

                    <div className="bg-gray-50 px-4 py-2.5 text-center">
                      <button type="button" className="text-[11px] font-semibold text-blue-600 transition-colors hover:underline">
                        View all notifications
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={openLiveSite}
                className="hidden items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100 sm:flex"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Live Site
              </button>

              <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
                <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 px-2.5 py-1.5">
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-extrabold text-white"
                    style={{ background: 'linear-gradient(135deg, #e65100, #bf360c)' }}
                  >
                    {getInitials(userLabel)}
                  </div>
                  <span className="hidden text-xs font-bold text-gray-700 sm:block">{userLabel}</span>
                  <span className="rounded-full bg-orange-500 px-1.5 py-0.5 text-[7px] font-black tracking-[0.08em] text-white">ADMIN</span>
                </div>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="rounded-xl p-2 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  title="Logout"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className={cn('flex-1 overflow-y-auto', editorMode ? 'flex flex-col' : 'p-4 lg:p-6')}>
          {children}
        </main>
      </div>
    </div>
  );
}
