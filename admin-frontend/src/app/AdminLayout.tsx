import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { useAdminAuth } from './useAdminAuth';
import { useAdminPreferences } from './useAdminPreferences';
import { useLocalStorageState } from '../lib/useLocalStorageState';
import { getAdminAlerts, getAdminAnnouncements, searchAdminEntities } from '../lib/api/client';
import { hasAdminPermission } from '../lib/adminRbac';
import { OpsCard, KeyboardShortcutsOverlay } from '../components/ops';
import { OpsBreadcrumb } from '../components/ops/OpsBreadcrumb';
import {
    AdminCommandPalette,
    useAdminNotifications,
} from '../components/ops/legacy-port';
import {
    adminModuleNavItems,
    getModuleByPath,
    getModuleRequiredPermission,
    groupedModuleIcons,
    groupedModuleLabels,
    isAdminModuleEnabled,
    MODULE_GROUP_ORDER,
    type AdminModuleKey,
    type ModuleGroupKey,
} from '../config/adminModules';

const SIDEBAR_COLLAPSED_KEY = 'admin-vnext-sidebar-collapsed';
const DENSITY_KEY = 'admin-vnext-density';
const GROUP_COLLAPSE_KEY = 'admin-vnext-nav-group-collapsed';

type AdminDensity = 'comfortable' | 'compact';

type GroupCollapseState = Record<ModuleGroupKey, boolean>;

const defaultGroupCollapseState: GroupCollapseState = {
    dashboard: false,
    posts: false,
    review: false,
    homepage: false,
    links: false,
    media: false,
    users: false,
    logs: false,
    settings: false,
};

const parseGroupCollapseState = (raw: string): GroupCollapseState => {
    try {
        const parsed = JSON.parse(raw) as Partial<GroupCollapseState>;
        const result: GroupCollapseState = { ...defaultGroupCollapseState };
        for (const key of MODULE_GROUP_ORDER) {
            if (key in parsed) result[key] = Boolean(parsed[key]);
        }
        return result;
    } catch {
        return defaultGroupCollapseState;
    }
};

export function AdminLayout() {
    const { user, permissions, logout, hasValidStepUp } = useAdminAuth();
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
    const [theme, setTheme] = useLocalStorageState<'dark' | 'light'>('admin-vnext-theme', 'dark');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const [paletteOpen, setPaletteOpen] = useState(false);
    const [paletteQuery, setPaletteQuery] = useState('');
    const [alertsOpen, setAlertsOpen] = useState(false);
    const [topSearch, setTopSearch] = useState('');
    const [topSearchFocused, setTopSearchFocused] = useState(false);

    const activeModule = getModuleByPath(location.pathname);
    const canAccessModule = useCallback((moduleKey: AdminModuleKey): boolean => {
        const requiredPermission = getModuleRequiredPermission(moduleKey);
        return hasAdminPermission(permissions, user?.role, requiredPermission);
    }, [permissions, user?.role]);
    const moduleAccessDenied = Boolean(activeModule && !canAccessModule(activeModule.key));
    const activeModuleRequiredPermission = activeModule
        ? getModuleRequiredPermission(activeModule.key)
        : null;

    const enabledNavItems = useMemo(
        () => adminModuleNavItems.filter((item) => isAdminModuleEnabled(item.key) && canAccessModule(item.key)),
        [canAccessModule]
    );

    const navGroups = useMemo(
        () => MODULE_GROUP_ORDER.map((group) => ({
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
        document.body.dataset.theme = theme;
    }, [theme]);

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
            if (mobileMenuOpen && !target.closest('.admin-sidebar') && !target.closest('.admin-mobile-menu-btn')) {
                setMobileMenuOpen(false);
            }
        };

        document.addEventListener('click', onDocumentClick);
        return () => document.removeEventListener('click', onDocumentClick);
    }, [mobileMenuOpen]);

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
            {
                id: 'toggle-density',
                label: 'Toggle Density',
                description: density === 'comfortable' ? 'Switch to compact' : 'Switch to comfortable',
                onSelect: () => setDensity((current) => (current === 'comfortable' ? 'compact' : 'comfortable')),
            },
        ];
    }, [enabledNavItems, logout, navigate, density, setDensity]);

    const searchResults = globalSearchQuery.data?.data ?? [];
    const openSearchResults = topSearchFocused && (globalSearchQuery.isFetching || topSearch.trim().length >= 2);
    const alerts = alertsQuery.data?.data ?? [];

    return (
        <div className={`admin-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${mobileMenuOpen ? 'mobile-menu-open' : ''}`}>
            <aside className="admin-sidebar" aria-label="Admin navigation shell">
                <div className="admin-brand">
                    <div className="admin-brand-mark">SE</div>
                    <div className="admin-brand-text">
                        <h1 className="admin-brand-title">SarkariExams</h1>
                        <span className="admin-brand-subtitle">Admin Console</span>
                    </div>
                </div>

                <div className="admin-sidebar-controls">
                    <button
                        type="button"
                        className="admin-btn subtle"
                        onClick={() => setSidebarCollapsed((current) => !current)}
                        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {sidebarCollapsed ? '\u25B8' : '\u25C2'}
                    </button>
                    <button
                        type="button"
                        className="admin-btn subtle"
                        onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
                        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    >
                        {theme === 'dark' ? '\u263C' : '\u263E'}
                    </button>
                    <button
                        type="button"
                        className="admin-btn subtle"
                        onClick={() => setPaletteOpen(true)}
                        aria-label="Command palette"
                    >
                        {'\u2318'}K
                    </button>
                </div>

                <nav className="admin-nav" aria-label="Admin modules">
                    {navGroups.map((group) => {
                        /* Single-item groups render as a direct link (no collapsible wrapper) */
                        if (group.items.length === 1) {
                            const item = group.items[0];
                            return (
                                <NavLink
                                    key={group.key}
                                    to={item.to}
                                    className={({ isActive }) => `admin-nav-link admin-nav-solo${isActive ? ' active' : ''}`}
                                    title={item.summary}
                                >
                                    <span className="admin-nav-icon">{item.icon}</span>
                                    <span className="admin-nav-label">{group.label}</span>
                                </NavLink>
                            );
                        }

                        /* Multi-item groups render with a collapsible toggle */
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
                                    <span className="admin-nav-icon">{groupedModuleIcons[group.key]}</span>
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
                                            <span className="admin-nav-icon">{item.icon}</span>
                                            <span className="admin-nav-label">{item.label}</span>
                                        </NavLink>
                                    ))}
                                </div>
                            </section>
                        );
                    })}
                </nav>

                <div className="admin-sidebar-footer">
                    <a className="admin-nav-link" href="/" target="_blank" rel="noreferrer">
                        <span className="admin-nav-icon">{'\u2197'}</span>
                        <span className="admin-nav-label">View Live Site</span>
                    </a>
                </div>
            </aside>

            <main className="admin-main">
                <header className="admin-topbar">
                    <div className="admin-topbar-left">
                        <button
                            type="button"
                            className="admin-btn subtle admin-mobile-menu-btn"
                            onClick={() => setMobileMenuOpen((current) => !current)}
                            aria-label="Toggle mobile menu"
                        >
                            ☰
                        </button>
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
                            + New Post
                        </button>
                        <div className="admin-topbar-alerts">
                            <button
                                type="button"
                                className="admin-btn subtle admin-topbar-alerts-btn"
                                onClick={() => setAlertsOpen((current) => !current)}
                                aria-expanded={alertsOpen}
                            >
                                {'\uD83D\uDD14'}{alerts.length > 0 ? ` ${alerts.length}` : ''}
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
                            className="admin-topbar-tz"
                            value={timeZoneMode}
                            onChange={(event) => setTimeZoneMode(event.target.value as 'local' | 'ist' | 'utc')}
                            aria-label="Admin timezone"
                        >
                            <option value="local">Local</option>
                            <option value="ist">IST</option>
                            <option value="utc">UTC</option>
                        </select>
                        <div className="admin-topbar-profile">
                            <div className="admin-topbar-avatar">
                                {(user?.email ?? 'A').charAt(0).toUpperCase()}
                            </div>
                            <div className="admin-topbar-identity">
                                <div className="admin-topbar-title">{user?.email ?? 'Unknown admin'}</div>
                                <div className="admin-topbar-meta">
                                    <span className="admin-topbar-role">{user?.role ?? 'none'}</span>
                                    {hasValidStepUp ? (
                                        <span className="admin-chiplet success">{'\u2713'} Step-up</span>
                                    ) : (
                                        <span className="admin-chiplet warning">{'\u26A0'} No step-up</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="admin-btn subtle"
                            onClick={async () => {
                                try {
                                    await logout();
                                    navigate('/login', { replace: true });
                                } catch (error) {
                                    notifyError('Logout failed', error instanceof Error ? error.message : 'Unable to sign out.');
                                }
                            }}
                        >
                            Sign Out
                        </button>
                    </div>
                </header>

                <OpsBreadcrumb />

                <section className="admin-context" aria-live="polite">
                    <div className="admin-context-main">
                        <span className="admin-context-kicker">Admin Console</span>
                        <h2 className="admin-context-title">{activeModule?.label ?? 'Dashboard'}</h2>
                        <p className="admin-context-summary">{activeModule?.summary ?? 'Overview of activity, traffic, and operations.'}</p>
                    </div>
                    <div className="admin-context-pills">
                        <span className="admin-context-pill">{'\u23F1'} {timeZoneLabel}</span>
                        <span className="admin-context-pill">{activeModule ? '\u2713 Live' : '\u2302 Home'}</span>
                    </div>
                </section>

                <div className="admin-shell-content">
                    {moduleAccessDenied && activeModule ? (
                        <OpsCard
                            title="Access Restricted"
                            description="You do not have access to this module."
                            tone="danger"
                        >
                            <div className="admin-alert warning">
                                You do not have access. Required permission: <code>{activeModuleRequiredPermission}</code>.
                            </div>
                        </OpsCard>
                    ) : (
                        <div key={location.pathname} className="admin-page-transition">
                            <Outlet />
                        </div>
                    )}
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
            <KeyboardShortcutsOverlay />
        </div>
    );
}
