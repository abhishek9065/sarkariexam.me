import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useAdminAuth } from './useAdminAuth';
import { useLocalStorageState } from '../lib/useLocalStorageState';

const links = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/announcements', label: 'Announcements' },
    { to: '/review', label: 'Review' },
    { to: '/create', label: 'Quick Add' },
    { to: '/detailed', label: 'Detailed Post' },
    { to: '/bulk', label: 'Bulk' },
    { to: '/queue', label: 'Queue' },
    { to: '/security', label: 'Security' },
    { to: '/sessions', label: 'Sessions' },
    { to: '/audit', label: 'Audit' },
    { to: '/community', label: 'Community' },
    { to: '/errors', label: 'Errors' },
    { to: '/approvals', label: 'Approvals' },
];

type AdminDensity = 'comfortable' | 'compact';

const SIDEBAR_COLLAPSED_KEY = 'admin-vnext-sidebar-collapsed';
const DENSITY_KEY = 'admin-vnext-density';

export function AdminLayout() {
    const { user, logout, hasValidStepUp, stepUpExpiresAt } = useAdminAuth();
    const navigate = useNavigate();
    const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorageState<boolean>(SIDEBAR_COLLAPSED_KEY, false);
    const [density, setDensity] = useLocalStorageState<AdminDensity>(DENSITY_KEY, 'comfortable', (raw) => {
        if (raw === '"compact"' || raw === 'compact') return 'compact';
        return 'comfortable';
    });
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [paletteQuery, setPaletteQuery] = useState('');

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

    const filteredLinks = useMemo(() => {
        const query = paletteQuery.trim().toLowerCase();
        if (!query) return links;
        return links.filter((link) => link.label.toLowerCase().includes(query) || link.to.toLowerCase().includes(query));
    }, [paletteQuery]);

    return (
        <div className={`admin-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            <aside className="admin-sidebar">
                <div className="admin-brand">SarkariExams Admin vNext</div>
                <div className="admin-sidebar-controls">
                    <button
                        type="button"
                        className="admin-btn admin-btn-subtle"
                        onClick={() => setSidebarCollapsed((current) => !current)}
                    >
                        {sidebarCollapsed ? 'Expand' : 'Collapse'}
                    </button>
                    <button
                        type="button"
                        className="admin-btn admin-btn-subtle"
                        onClick={() => setPaletteOpen(true)}
                    >
                        Palette (Ctrl/Cmd + K)
                    </button>
                </div>
                <nav className="admin-nav" aria-label="Admin navigation">
                    {links.map((link) => (
                        <NavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? 'active' : '')}>
                            {link.label}
                        </NavLink>
                    ))}
                    <a href="/admin-legacy" target="_blank" rel="noreferrer">Open Legacy Admin</a>
                </nav>
            </aside>
            <main className="admin-main">
                <header className="admin-header">
                    <div>
                        <strong>{user?.email ?? 'Unknown admin'}</strong>
                        <div className="admin-muted">Role: {user?.role ?? 'none'}</div>
                        <div className="admin-muted">
                            Step-up: {hasValidStepUp ? `active until ${stepUpExpiresAt ? new Date(stepUpExpiresAt).toLocaleTimeString() : 'valid window'}` : 'required for risky actions'}
                        </div>
                    </div>
                    <div className="admin-header-actions">
                        <button
                            type="button"
                            className="admin-btn admin-btn-subtle"
                            onClick={() => setDensity((current) => (current === 'comfortable' ? 'compact' : 'comfortable'))}
                        >
                            Density: {density === 'comfortable' ? 'Comfortable' : 'Compact'}
                        </button>
                        <button
                            type="button"
                            className="admin-btn"
                            onClick={async () => {
                                await logout();
                                navigate('/login', { replace: true });
                            }}
                        >
                            Logout
                        </button>
                    </div>
                </header>
                <Outlet />
            </main>

            {paletteOpen ? (
                <div
                    className="admin-palette-backdrop"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Command palette"
                    onClick={() => setPaletteOpen(false)}
                >
                    <div className="admin-palette" onClick={(event) => event.stopPropagation()}>
                        <input
                            className="admin-palette-input"
                            placeholder="Jump to module..."
                            value={paletteQuery}
                            autoFocus
                            onChange={(event) => setPaletteQuery(event.target.value)}
                        />
                        <div className="admin-palette-list">
                            {filteredLinks.map((link) => (
                                <button
                                    key={link.to}
                                    type="button"
                                    className="admin-palette-item"
                                    onClick={() => {
                                        navigate(link.to);
                                        setPaletteOpen(false);
                                        setPaletteQuery('');
                                    }}
                                >
                                    <span>{link.label}</span>
                                    <code>{link.to}</code>
                                </button>
                            ))}
                            <button
                                type="button"
                                className="admin-palette-item"
                                onClick={() => {
                                    window.location.href = '/admin-legacy';
                                }}
                            >
                                <span>Open Legacy Admin</span>
                                <code>/admin-legacy</code>
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
