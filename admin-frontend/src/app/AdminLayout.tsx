import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { useAdminAuth } from './useAdminAuth';
import { useAdminPreferences } from './useAdminPreferences';
import { useLocalStorageState } from '../lib/useLocalStorageState';
import { getAdminAnnouncements } from '../lib/api/client';
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

type AdminDensity = 'comfortable' | 'compact';

const GROUP_ORDER: ModuleGroupKey[] = ['overview', 'content', 'operations'];

export function AdminLayout() {
    const { user, logout, hasValidStepUp, stepUpExpiresAt } = useAdminAuth();
    const { timeZoneMode, setTimeZoneMode, timeZoneLabel } = useAdminPreferences();
    const { notifyInfo } = useAdminNotifications();

    const location = useLocation();
    const navigate = useNavigate();

    const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorageState<boolean>(SIDEBAR_COLLAPSED_KEY, false);
    const [density, setDensity] = useLocalStorageState<AdminDensity>(DENSITY_KEY, 'comfortable', (raw) => {
        if (raw === '"compact"' || raw === 'compact') return 'compact';
        return 'comfortable';
    });

    const [paletteOpen, setPaletteOpen] = useState(false);
    const [paletteQuery, setPaletteQuery] = useState('');

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

    useEffect(() => {
        document.body.dataset.adminDensity = density;
    }, [density]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const isPaletteShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
            if (isPaletteShortcut) {
                event.preventDefault();
                setPaletteOpen((current) => !current);
                return;
            }
            if (event.key === 'Escape') {
                setPaletteOpen(false);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

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
                id: 'legacy-admin',
                label: 'Open Legacy Admin',
                description: '/admin-legacy rollback route',
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

    return (
        <div className={`admin-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            <aside className="admin-sidebar" aria-label="Admin navigation shell">
                <div className="admin-brand">
                    <h1 className="admin-brand-title">SarkariExams Admin</h1>
                    <span className="admin-brand-subtitle">vNext Ops Console</span>
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
                    {navGroups.map((group) => (
                        <div key={group.key} className="admin-nav-group">
                            <div className="admin-nav-group-title">{group.label}</div>
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
                    ))}
                </nav>

                <div className="admin-sidebar-footer">
                    <a className="admin-nav-link" href="/admin-legacy" target="_blank" rel="noreferrer">
                        <span className="admin-nav-short">LG</span>
                        <span className="admin-nav-label">Open Legacy Admin</span>
                    </a>
                    <span>Rollback path remains active during phased rollout.</span>
                </div>
            </aside>

            <main className="admin-main">
                <header className="admin-topbar">
                    <div className="admin-topbar-info">
                        <div className="admin-topbar-title">{user?.email ?? 'Unknown admin'}</div>
                        <div className="admin-topbar-meta">Role: {user?.role ?? 'none'} | {stepUpLabel}</div>
                    </div>
                    <div className="admin-topbar-actions">
                        <select
                            value={timeZoneMode}
                            onChange={(event) => setTimeZoneMode(event.target.value as 'local' | 'ist' | 'utc')}
                            aria-label="Admin timezone"
                        >
                            <option value="local">Timezone: Local</option>
                            <option value="ist">Timezone: IST</option>
                            <option value="utc">Timezone: UTC</option>
                        </select>
                        <button
                            type="button"
                            className="admin-btn subtle"
                            onClick={() => setDensity((current) => (current === 'comfortable' ? 'compact' : 'comfortable'))}
                        >
                            Density: {density === 'comfortable' ? 'Comfortable' : 'Compact'}
                        </button>
                        <button
                            type="button"
                            className="admin-btn primary"
                            onClick={async () => {
                                await logout();
                                navigate('/login', { replace: true });
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
                    navigate('/announcements');
                    notifyInfo('Announcement selected', `Jumped to announcement ${id}.`);
                }}
            />
        </div>
    );
}
