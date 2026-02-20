import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { useAdminAuth } from './useAdminAuth';
import { useAdminPreferences } from './useAdminPreferences';
import { useLocalStorageState } from '../lib/useLocalStorageState';
import { getAdminAlerts, getAdminAnnouncements, searchAdminEntities } from '../lib/api/client';
import {
    AdminCommandPalette,
    useAdminNotifications,
} from '../components/ops/legacy-port';
import {
    adminModuleNavItems,
    getModuleByPath,
    groupedModuleLabels,
    isAdminModuleEnabled,
    type ModuleGroupKey,
} from '../config/adminModules';

const SIDEBAR_COLLAPSED_KEY = 'admin-vnext-sidebar-collapsed';
const DENSITY_KEY = 'admin-vnext-density';
const GROUP_COLLAPSE_KEY = 'admin-vnext-nav-group-collapsed';

type AdminDensity = 'comfortable' | 'compact';

type GroupCollapseState = Record<ModuleGroupKey, boolean>;

const GROUP_ORDER: ModuleGroupKey[] = [
    'dashboard',
    'content',
    'management',
    'admin',
    'ops'
];

const defaultGroupCollapseState: GroupCollapseState = {
    dashboard: false,
    content: false,
    management: false,
    admin: false,
    ops: false,
};

const parseGroupCollapseState = (raw: string): GroupCollapseState => {
    try {
        const parsed = JSON.parse(raw) as Partial<GroupCollapseState>;
        return {
            dashboard: Boolean(parsed.dashboard),
            content: Boolean(parsed.content),
            management: Boolean(parsed.management),
            admin: Boolean(parsed.admin),
            ops: Boolean(parsed.ops),
        };
    } catch {
        return defaultGroupCollapseState;
    }
};

export function AdminLayout() {
    const { user, logout, hasValidStepUp, stepUpExpiresAt } = useAdminAuth();
    const { timeZoneMode, setTimeZoneMode, timeZoneLabel } = useAdminPreferences();
    const { notifyInfo, notifyError } = useAdminNotifications();

    const location = useLocation();
    const navigate = useNavigate();

    const searchInputRef = useRef<HTMLInputElement | null>(null);

    const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorageState<boolean>(SIDEBAR_COLLAPSED_KEY, false);
    const [density, setDensity] = useLocalStorageState<AdminDensity>(DENSITY_KEY, 'comfortable', (raw) => {
        if (raw === '"compact"' || raw === 'compact') return 'compact';
        return 'comfortable';
    });
    const [collapsedGroups, setCollapsedGroups] = useLocalStorageState<GroupCollapseState>(
        GROUP_COLLAPSE_KEY,
        defaultGroupCollapseState,
        parseGroupCollapseState
    );

    const [paletteOpen, setPaletteOpen] = useState(false);
    const [paletteQuery, setPaletteQuery] = useState('');
    const [alertsOpen, setAlertsOpen] = useState(false);
    const [topSearch, setTopSearch] = useState('');
    const [topSearchFocused, setTopSearchFocused] = useState(false);

    const activeModule = getModuleByPath(location.pathname);

    const enabledNavItems = useMemo(
        () => adminModuleNavItems.filter((item) => isAdminModuleEnabled(item.key)),
        []
    );

    const navGroups = useMemo(
        () => GROUP_ORDER.map((group) => ({
            key: group,
            label: groupedModuleLabels[group],
            items: enabledNavItems.filter((item) => item.group === group),
        })).filter((group) => group.items.length > 0),
        [enabledNavItems]
    );

    const paletteAnnouncementsQuery = useQuery({
        queryKey: ['admin-command-palette-announcements'],
        queryFn: () => getAdminAnnouncements({ limit: 120, status: 'all' }),
        staleTime: 60_000,
    });

    const alertsQuery = useQuery({
        queryKey: ['admin-topbar-alerts'],
        queryFn: () => getAdminAlerts({ status: 'open', limit: 8, offset: 0 }),
        staleTime: 45_000,
        refetchInterval: 90_000,
    });

    const globalSearchQuery = useQuery({
        queryKey: ['admin-global-search', topSearch.trim()],
        queryFn: () => searchAdminEntities({ q: topSearch.trim(), limit: 16 }),
        enabled: topSearch.trim().length >= 2,
        staleTime: 20_000,
    });

    useEffect(() => {
        document.body.dataset.adminDensity = density;
    }, [density]);

    useEffect(() => {
        setAlertsOpen(false);
        setTopSearchFocused(false);
    }, [location.pathname]);

    useEffect(() => {
        const onDocumentClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            if (!target.closest('.admin-topbar-search')) {
                setTopSearchFocused(false);
            }
            if (!target.closest('.admin-topbar-alerts')) {
                setAlertsOpen(false);
            }
        };

        document.addEventListener('click', onDocumentClick);
        return () => document.removeEventListener('click', onDocumentClick);
    }, []);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const isPaletteShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
            if (isPaletteShortcut) {
                event.preventDefault();
                setPaletteOpen((current) => !current);
                return;
            }

            const target = event.target as HTMLElement | null;
            const inTypingContext =
                target?.tagName === 'INPUT'
                || target?.tagName === 'TEXTAREA'
                || target?.tagName === 'SELECT'
                || Boolean(target?.isContentEditable);

            if (
                event.key === '/'
                && !event.ctrlKey
                && !event.metaKey
                && !event.altKey
                && !event.shiftKey
                && !inTypingContext
            ) {
                event.preventDefault();
                searchInputRef.current?.focus();
                setTopSearchFocused(true);
                return;
            }

            if (
                event.key.toLowerCase() === 'n'
                && !event.ctrlKey
                && !event.metaKey
                && !event.altKey
                && !event.shiftKey
                && !inTypingContext
            ) {
                event.preventDefault();
                navigate('/create-post');
                return;
            }

            if (event.key === 'Escape') {
                setPaletteOpen(false);
                setAlertsOpen(false);
                setTopSearchFocused(false);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [navigate]);

    const stepUpLabel = hasValidStepUp
        ? `Step-up active${stepUpExpiresAt ? ` until ${new Date(stepUpExpiresAt).toLocaleTimeString()}` : ''}`
        : 'Step-up required for high-risk actions';

    const commandPaletteCommands = useMemo(() => {
        const moduleCommands = enabledNavItems.map((item) => ({
            id: `nav-${item.key}`,
            label: item.label,
            description: item.summary,
            onSelect: () => navigate(item.to),
        }));

        return [
            ...moduleCommands,
            {
                id: 'create-post',
                label: 'Create New Post',
                description: 'Open unified create post flow',
                onSelect: () => navigate('/create-post'),
            },
            {
                id: 'open-admin',
                label: 'Open Stable Admin',
                description: '/admin legacy default route',
                onSelect: () => {
                    window.location.href = '/admin';
                },
            },
            {
                id: 'open-preview',
                label: 'Open vNext Preview',
                description: '/admin-vnext premium preview route',
                onSelect: () => {
                    window.location.href = '/admin-vnext';
                },
            },
            {
                id: 'open-legacy',
                label: 'Open Legacy Alias',
                description: '/admin-legacy rollback alias',
                onSelect: () => {
                    window.location.href = '/admin-legacy';
                },
            },
            {
                id: 'logout',
                label: 'Logout',
                description: 'Sign out from admin session',
                onSelect: async () => {
                    await logout();
                    navigate('/login', { replace: true });
                },
            },
        ];
    }, [enabledNavItems, logout, navigate]);

    const searchResults = globalSearchQuery.data?.data ?? [];
    const openSearchResults = topSearchFocused && (globalSearchQuery.isFetching || topSearch.trim().length >= 2);
    const alerts = alertsQuery.data?.data ?? [];

    return (
        <div className={`admin-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            <aside className="admin-sidebar" aria-label="Admin navigation shell">
                <div className="admin-brand">
                    <h1 className="admin-brand-title">SarkariExams Admin</h1>
                    <span className="admin-brand-subtitle">Premium Ops Center</span>
                </div>

                <div className="admin-sidebar-controls">
                    <button
                        type="button"
                        className="admin-btn subtle"
                        onClick={() => setSidebarCollapsed((current) => !current)}
                    >
                        {sidebarCollapsed ? 'Expand rail' : 'Collapse rail'}
                    </button>
                    <button
                        type="button"
                        className="admin-btn subtle"
                        onClick={() => setPaletteOpen(true)}
                    >
                        Palette (Ctrl/Cmd + K)
                    </button>
                </div>

                <nav className="admin-nav" aria-label="Admin modules">
                    {navGroups.map((group) => {
                        const isCollapsed = collapsedGroups[group.key];
                        return (
                            <section key={group.key} className={`admin-nav-group${isCollapsed ? ' collapsed' : ''}`}>
                                <button
                                    type="button"
                                    className="admin-nav-group-toggle"
                                    onClick={() => {
                                        setCollapsedGroups((current) => ({
                                            ...current,
                                            [group.key]: !current[group.key],
                                        }));
                                    }}
                                    aria-expanded={!isCollapsed}
                                    aria-controls={`admin-nav-group-${group.key}`}
                                >
                                    <span className="admin-nav-group-title">{group.label}</span>
                                    <span className="admin-nav-group-count">{group.items.length}</span>
                                </button>
                                <div id={`admin-nav-group-${group.key}`} className="admin-nav-group-items">
                                    {group.items.map((item) => (
                                        <NavLink
                                            key={item.key}
                                            to={item.to}
                                            className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`}
                                            title={item.summary}
                                        >
                                            <span className="admin-nav-short">{item.shortLabel}</span>
                                            <span className="admin-nav-label">{item.label}</span>
                                        </NavLink>
                                    ))}
                                </div>
                            </section>
                        );
                    })}
                </nav>

                <div className="admin-sidebar-footer">
                    <a className="admin-nav-link" href="/admin" target="_blank" rel="noreferrer">
                        <span className="admin-nav-short">ST</span>
                        <span className="admin-nav-label">Open Stable Admin</span>
                    </a>
                    <a className="admin-nav-link" href="/admin-vnext" target="_blank" rel="noreferrer">
                        <span className="admin-nav-short">VN</span>
                        <span className="admin-nav-label">Open vNext Preview</span>
                    </a>
                    <a className="admin-nav-link" href="/admin-legacy" target="_blank" rel="noreferrer">
                        <span className="admin-nav-short">LG</span>
                        <span className="admin-nav-label">Open Legacy Alias</span>
                    </a>
                </div>
            </aside>

            <main className="admin-main">
                <header className="admin-topbar">
                    <div className="admin-topbar-left">
                        <div className="admin-topbar-search">
                            <input
                                ref={searchInputRef}
                                type="search"
                                value={topSearch}
                                onChange={(event) => setTopSearch(event.target.value)}
                                onFocus={() => setTopSearchFocused(true)}
                                placeholder="Search posts, links, media, orgs, tags (/)"
                            />
                            {openSearchResults ? (
                                <div className="admin-topbar-search-results" role="listbox" aria-label="Admin global search results">
                                    {globalSearchQuery.isFetching ? (
                                        <div className="ops-inline-muted">Searching...</div>
                                    ) : null}
                                    {!globalSearchQuery.isFetching && searchResults.length === 0 ? (
                                        <div className="ops-inline-muted">No matches for this query.</div>
                                    ) : null}
                                    {searchResults.map((item) => (
                                        <button
                                            key={`${item.entity}:${item.id}`}
                                            type="button"
                                            className="admin-topbar-search-item"
                                            onClick={() => {
                                                if (item.route) {
                                                    navigate(item.route);
                                                } else if (item.entity === 'post') {
                                                    navigate(`/manage-posts?focus=${encodeURIComponent(item.id)}`);
                                                }
                                                setTopSearchFocused(false);
                                                notifyInfo('Search result opened', item.title);
                                            }}
                                        >
                                            <span>{item.title}</span>
                                            <code>{item.entity}</code>
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="admin-topbar-actions">
                        <button
                            type="button"
                            className="admin-btn primary"
                            onClick={() => navigate('/create-post')}
                        >
                            Create
                        </button>
                        <button
                            type="button"
                            className="admin-btn subtle"
                            onClick={() => setPaletteOpen(true)}
                        >
                            Palette
                        </button>
                        <button
                            type="button"
                            className="admin-btn subtle"
                            onClick={() => setDensity((current) => (current === 'comfortable' ? 'compact' : 'comfortable'))}
                        >
                            Density: {density === 'comfortable' ? 'Comfortable' : 'Compact'}
                        </button>
                        <div className="admin-topbar-alerts">
                            <button
                                type="button"
                                className="admin-btn subtle"
                                onClick={() => setAlertsOpen((current) => !current)}
                                aria-expanded={alertsOpen}
                            >
                                Alerts ({alerts.length})
                            </button>
                            {alertsOpen ? (
                                <div className="admin-topbar-alerts-panel" role="dialog" aria-label="Open alerts">
                                    {alertsQuery.isFetching ? <div className="ops-inline-muted">Loading alerts...</div> : null}
                                    {!alertsQuery.isFetching && alerts.length === 0 ? (
                                        <div className="ops-inline-muted">No open alerts.</div>
                                    ) : null}
                                    {alerts.map((alert) => (
                                        <button
                                            key={alert.id}
                                            type="button"
                                            className="admin-topbar-alert-item"
                                            onClick={() => {
                                                navigate('/alerts');
                                                notifyInfo('Opening Alerts module', alert.message);
                                            }}
                                        >
                                            <span>{alert.message}</span>
                                            <code>{alert.severity}</code>
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                        <select
                            value={timeZoneMode}
                            onChange={(event) => setTimeZoneMode(event.target.value as 'local' | 'ist' | 'utc')}
                            aria-label="Admin timezone"
                        >
                            <option value="local">Timezone: Local</option>
                            <option value="ist">Timezone: IST</option>
                            <option value="utc">Timezone: UTC</option>
                        </select>
                        <div className="admin-topbar-profile">
                            <div className="admin-topbar-title">{user?.email ?? 'Unknown admin'}</div>
                            <div className="admin-topbar-meta">Role: {user?.role ?? 'none'} | {stepUpLabel}</div>
                        </div>
                        <button
                            type="button"
                            className="admin-btn"
                            onClick={async () => {
                                try {
                                    await logout();
                                    navigate('/login', { replace: true });
                                } catch (error) {
                                    notifyError('Logout failed', error instanceof Error ? error.message : 'Unable to sign out.');
                                }
                            }}
                        >
                            Logout
                        </button>
                    </div>
                </header>

                <section className="admin-context" aria-live="polite">
                    <div className="admin-context-main">
                        <span className="admin-context-kicker">Operations Workspace</span>
                        <h2 className="admin-context-title">{activeModule?.label ?? 'Dashboard'}</h2>
                        <p className="admin-context-summary">{activeModule?.summary ?? 'Admin workflow and operations control surface.'}</p>
                    </div>
                    <div className="admin-context-pills">
                        <span className="admin-context-pill">Auth Boundary: /api/admin-auth</span>
                        <span className="admin-context-pill">Timezone: {timeZoneLabel}</span>
                        <span className="admin-context-pill">Module: {activeModule ? 'Live' : 'Fallback'}</span>
                    </div>
                </section>

                <div className="admin-shell-content">
                    <Outlet />
                </div>
            </main>

            <AdminCommandPalette
                open={paletteOpen}
                query={paletteQuery}
                onQueryChange={setPaletteQuery}
                onClose={() => setPaletteOpen(false)}
                commands={commandPaletteCommands}
                announcements={paletteAnnouncementsQuery.data ?? []}
                onOpenAnnouncement={(id) => {
                    navigate(`/manage-posts?focus=${encodeURIComponent(id)}`);
                    notifyInfo('Announcement selected', `Jumped to announcement ${id}.`);
                }}
            />
        </div>
    );
}
