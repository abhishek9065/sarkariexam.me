import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { useAdminAuth } from './useAdminAuth';
import { useAdminPreferences } from './useAdminPreferences';
import { useLocalStorageState } from '../lib/useLocalStorageState';
import { getAdminAlerts, getAdminAnnouncements, searchAdminEntities } from '../lib/api/client';
import { hasAdminPermission } from '../lib/adminRbac';
import { KeyboardShortcutsOverlay, OpsBreadcrumb } from '../components/ops';
import { useAdminNotifications } from '../components/ops/legacy-port';
import {
    AdminCommandSurface,
    InspectorDrawer,
    PermissionState,
    WorkspaceHeader,
} from '../components/workspace';
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

const SIDEBAR_COLLAPSED_KEY = 'admin-v3-sidebar-collapsed';
const DENSITY_KEY = 'admin-v3-density';
const GROUP_COLLAPSE_KEY = 'admin-v3-nav-group-collapsed';

type AdminDensity = 'comfortable' | 'compact';
type GroupCollapseState = Record<ModuleGroupKey, boolean>;

const defaultGroupCollapseState: GroupCollapseState = {
    today: false,
    'content-desk': false,
    'review-pipeline': false,
    publishing: false,
    'site-ops': false,
    'audience-seo': false,
    governance: false,
    monitoring: false,
    system: false,
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

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 21) return 'Good evening';
    return 'Good night';
}

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
    const [profileOpen, setProfileOpen] = useState(false);
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
        () => adminModuleNavItems
            .filter((item) => isAdminModuleEnabled(item.key) && canAccessModule(item.key))
            .sort((a, b) => a.priority - b.priority),
        [canAccessModule]
    );

    const navGroups = useMemo(
        () => MODULE_GROUP_ORDER.map((group) => ({
            key: group,
            label: groupedModuleLabels[group],
            icon: groupedModuleIcons[group],
            items: enabledNavItems.filter((item) => item.group === group),
        })).filter((group) => group.items.length > 0),
        [enabledNavItems]
    );

    const paletteAnnouncementsQuery = useQuery({
        queryKey: ['admin-command-surface-announcements'],
        queryFn: () => getAdminAnnouncements({ limit: 120, status: 'all' }),
        staleTime: 60_000,
    });

    const alertsQuery = useQuery({
        queryKey: ['admin-shell-alerts'],
        queryFn: () => getAdminAlerts({ status: 'open', limit: 6, offset: 0 }),
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
        document.body.dataset.theme = 'light';
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
            if (!target.closest('.admin-topbar-profile')) {
                setProfileOpen(false);
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
                setPaletteQuery('');
                setAlertsOpen(false);
                setTopSearchFocused(false);
                setProfileOpen(false);
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
                label: 'Create new post',
                description: 'Open the unified editorial create flow.',
                onSelect: () => navigate('/create-post'),
            },
            {
                id: 'open-live-site',
                label: 'Open live site',
                description: 'View the public site in a new tab.',
                onSelect: () => window.open('/', '_blank', 'noreferrer'),
            },
            {
                id: 'open-admin-alias',
                label: 'Open /admin-vnext alias',
                description: 'Open the compatibility alias for the rebuilt console.',
                onSelect: () => {
                    window.location.href = '/admin-vnext';
                },
            },
            {
                id: 'open-legacy',
                label: 'Open /admin-legacy rollback',
                description: 'Use the legacy admin for rollback scenarios.',
                onSelect: () => {
                    window.location.href = '/admin-legacy';
                },
            },
            {
                id: 'toggle-density',
                label: density === 'comfortable' ? 'Switch to compact density' : 'Switch to comfortable density',
                description: 'Change table and control density for editorial work.',
                onSelect: () => setDensity((current) => (current === 'comfortable' ? 'compact' : 'comfortable')),
            },
            {
                id: 'logout',
                label: 'Sign out',
                description: 'End the current admin session.',
                onSelect: async () => {
                    await logout();
                    navigate('/login', { replace: true });
                },
            },
        ];
    }, [density, enabledNavItems, logout, navigate, setDensity]);

    const searchResults = globalSearchQuery.data?.data ?? [];
    const openSearchResults = topSearchFocused && (globalSearchQuery.isFetching || topSearch.trim().length >= 2);
    const alerts = alertsQuery.data?.data ?? [];
    const activeGroupLabel = activeModule ? groupedModuleLabels[activeModule.group] : 'Today';
    const primaryAction = activeModule?.defaultPrimaryAction;

    return (
        <div className={`admin-layout editorial-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            <aside className="admin-sidebar" aria-label="Admin navigation shell">
                <div className="admin-brand">
                    <div className="admin-brand-mark">SE</div>
                    <div className="admin-brand-text">
                        <h1 className="admin-brand-title">SarkariExams</h1>
                        <span className="admin-brand-subtitle">Editorial Operations Console</span>
                    </div>
                </div>

                <div className="admin-sidebar-controls">
                    <button
                        type="button"
                        className="admin-btn subtle icon-only small"
                        onClick={() => setSidebarCollapsed((current) => !current)}
                        aria-label={sidebarCollapsed ? 'Expand navigation rail' : 'Collapse navigation rail'}
                    >
                        {sidebarCollapsed ? '▸' : '◂'}
                    </button>
                    <button
                        type="button"
                        className="admin-btn subtle icon-only small"
                        onClick={() => setPaletteOpen(true)}
                        aria-label="Open command surface"
                    >
                        ⌘
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
                                    <span className="admin-nav-icon">{group.icon}</span>
                                    <span className="admin-nav-group-title">{group.label}</span>
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
                    <div className="admin-sidebar-stats">
                        <div className="admin-sidebar-stat">
                            <span className="ops-live-dot" /> {enabledNavItems.length} active modules
                        </div>
                        <div className="admin-sidebar-stat">{density === 'compact' ? 'Compact density' : 'Comfortable density'}</div>
                    </div>
                    <a className="admin-nav-link" href="/" target="_blank" rel="noreferrer">
                        <span className="admin-nav-icon">↗</span>
                        <span className="admin-nav-label">View live site</span>
                    </a>
                    <a className="admin-nav-link" href="/admin-legacy">
                        <span className="admin-nav-icon">↺</span>
                        <span className="admin-nav-label">Open legacy rollback</span>
                    </a>
                </div>
            </aside>

            <main className="admin-main">
                <header className="admin-topbar">
                    <div className="admin-topbar-left">
                        <div className="admin-topbar-heading">
                            <span className="admin-topbar-kicker">{getGreeting()}</span>
                            <strong>{user?.email ?? 'Unknown admin'}</strong>
                        </div>
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
                            New post
                        </button>
                        <button
                            type="button"
                            className="admin-btn subtle"
                            onClick={() => setPaletteOpen(true)}
                        >
                            Command
                        </button>
                        <div className="admin-topbar-alerts">
                            <button
                                type="button"
                                className="admin-btn subtle admin-topbar-alerts-btn"
                                onClick={() => setAlertsOpen((current) => !current)}
                                aria-expanded={alertsOpen}
                            >
                                Alerts{alerts.length > 0 ? ` ${alerts.length}` : ''}
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
                            title="Change how dates and times are displayed"
                        >
                            <option value="local">Local</option>
                            <option value="ist">IST</option>
                            <option value="utc">UTC</option>
                        </select>
                        <div className="admin-topbar-profile">
                            <button
                                type="button"
                                className="admin-profile-trigger"
                                onClick={() => setProfileOpen((current) => !current)}
                                aria-expanded={profileOpen}
                            >
                                <div className="admin-topbar-avatar">
                                    {(user?.email ?? 'A').charAt(0).toUpperCase()}
                                </div>
                                <div className="admin-topbar-identity">
                                    <div className="admin-topbar-title">{user?.email ?? 'Unknown admin'}</div>
                                    <div className="admin-topbar-meta">
                                        <span className="admin-topbar-role">{user?.role ?? 'none'}</span>
                                        {hasValidStepUp ? (
                                            <span className="admin-chiplet success">Sensitive actions unlocked</span>
                                        ) : (
                                            <span className="admin-chiplet warning">Sensitive actions locked</span>
                                        )}
                                    </div>
                                </div>
                            </button>
                            {profileOpen ? (
                                <div className="admin-profile-dropdown" onClick={(event) => event.stopPropagation()}>
                                    <div className="admin-profile-dropdown-header">
                                        <div className="admin-profile-dropdown-name">{user?.email?.split('@')[0] ?? 'Admin'}</div>
                                        <div className="admin-profile-dropdown-email">{user?.email ?? ''}</div>
                                    </div>
                                    <button type="button" className="admin-profile-dropdown-item" onClick={() => { setDensity((current) => current === 'comfortable' ? 'compact' : 'comfortable'); setProfileOpen(false); }}>
                                        {density === 'comfortable' ? 'Switch to compact density' : 'Switch to comfortable density'}
                                    </button>
                                    <button type="button" className="admin-profile-dropdown-item" onClick={() => { navigate('/settings'); setProfileOpen(false); }}>
                                        Open settings
                                    </button>
                                    <div className="admin-profile-dropdown-divider" />
                                    <button
                                        type="button"
                                        className="admin-profile-dropdown-item danger"
                                        onClick={async () => {
                                            try {
                                                await logout();
                                                navigate('/login', { replace: true });
                                            } catch (error) {
                                                notifyError('Logout failed', error instanceof Error ? error.message : 'Unable to sign out.');
                                            }
                                        }}
                                    >
                                        Sign out
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </header>

                <OpsBreadcrumb />

                <WorkspaceHeader
                    eyebrow={activeGroupLabel}
                    title={activeModule?.label ?? 'Today'}
                    description={activeModule?.summary ?? 'Run the editorial, publishing, governance, and monitoring workflow from one console.'}
                    meta={(
                        <>
                            <span className="workspace-meta-pill">{timeZoneLabel}</span>
                            <span className="workspace-meta-pill">{activeModule?.layoutMode ?? 'dashboard'} layout</span>
                            <span className="workspace-meta-pill">{activeModule?.pageArchetype ?? 'dashboard'} archetype</span>
                        </>
                    )}
                    actions={(
                        <>
                            {primaryAction && primaryAction.to !== location.pathname ? (
                                <button
                                    type="button"
                                    className="admin-btn subtle"
                                    onClick={() => navigate(primaryAction.to)}
                                >
                                    {primaryAction.label}
                                </button>
                            ) : null}
                            <button
                                type="button"
                                className="admin-btn primary"
                                onClick={() => navigate('/manage-posts')}
                            >
                                Open workbench
                            </button>
                        </>
                    )}
                />

                <div className="admin-shell-grid">
                    <section className="admin-shell-content">
                        {moduleAccessDenied && activeModule ? (
                            <PermissionState
                                title="You do not have access to this workspace."
                                description="The route is active, but the current role does not include the permission required to open it."
                                detail={<>Required permission: <code>{activeModuleRequiredPermission}</code>.</>}
                            />
                        ) : (
                            <div key={location.pathname} className="admin-page-transition">
                                <Outlet />
                            </div>
                        )}
                    </section>

                    <aside className="admin-shell-rail">
                        <InspectorDrawer title="Session" description="Current operator context and safety state.">
                            <dl className="workspace-definition-list">
                                <div>
                                    <dt>Role</dt>
                                    <dd>{user?.role ?? 'none'}</dd>
                                </div>
                                <div>
                                    <dt>Timezone</dt>
                                    <dd>{timeZoneLabel}</dd>
                                </div>
                                <div>
                                    <dt>Density</dt>
                                    <dd>{density}</dd>
                                </div>
                                <div>
                                    <dt>Sensitive actions</dt>
                                    <dd>{hasValidStepUp ? 'Unlocked' : 'Locked'}</dd>
                                </div>
                            </dl>
                        </InspectorDrawer>

                        <InspectorDrawer title="Open Alerts" description="Immediate operational issues from the alert feed.">
                            {alerts.length > 0 ? (
                                <div className="workspace-stack">
                                    {alerts.map((alert) => (
                                        <button
                                            key={alert.id}
                                            type="button"
                                            className="workspace-list-button"
                                            onClick={() => navigate('/alerts')}
                                        >
                                            <strong>{alert.message}</strong>
                                            <span>{alert.severity}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <p className="ops-inline-muted">No open alerts right now.</p>
                            )}
                        </InspectorDrawer>

                        <InspectorDrawer title="Command Hints" description="Keyboard shortcuts and route compatibility.">
                            <div className="workspace-stack">
                                <div className="workspace-shortcut-item"><strong>Ctrl/Cmd + K</strong><span>Open command surface</span></div>
                                <div className="workspace-shortcut-item"><strong>/</strong><span>Focus global search</span></div>
                                <div className="workspace-shortcut-item"><strong>N</strong><span>Open create-post</span></div>
                                <div className="workspace-shortcut-item"><strong>/admin-vnext</strong><span>Compatibility alias remains active</span></div>
                            </div>
                        </InspectorDrawer>
                    </aside>
                </div>
            </main>

            <AdminCommandSurface
                open={paletteOpen}
                query={paletteQuery}
                onQueryChange={setPaletteQuery}
                onClose={() => {
                    setPaletteOpen(false);
                    setPaletteQuery('');
                }}
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
