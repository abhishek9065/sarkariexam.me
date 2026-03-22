import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { useAdminAuth } from './useAdminAuth';
import { searchAdminEntities } from '../lib/api/client';
import { hasAdminPermission } from '../lib/adminRbac';
import { useAdminNotifications } from '../components/ops/legacy-port';
import { PermissionState } from '../components/workspace';
import {
    adminModuleNavItems,
    getModuleByPath,
    getModuleRequiredPermission,
    groupedModuleLabels,
    isAdminModuleEnabled,
    MODULE_GROUP_ORDER,
    type AdminModuleKey,
} from '../config/adminModules';

export function AdminLayout() {
    const { user, permissions, logout } = useAdminAuth();
    const { notifyError } = useAdminNotifications();
    const location = useLocation();
    const navigate = useNavigate();

    const [profileOpen, setProfileOpen] = useState(false);
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
            .filter((item) => item.showInNavigation !== false)
            .filter((item) => isAdminModuleEnabled(item.key) && canAccessModule(item.key))
            .sort((a, b) => a.priority - b.priority),
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

    const globalSearchQuery = useQuery({
        queryKey: ['admin-global-search', topSearch.trim()],
        queryFn: () => searchAdminEntities({ q: topSearch.trim(), limit: 16 }),
        enabled: topSearch.trim().length >= 2,
        staleTime: 20_000,
    });

    useEffect(() => {
        document.body.dataset.theme = 'light';
        document.body.dataset.adminDensity = 'comfortable';
    }, []);

    useEffect(() => {
        setTopSearchFocused(false);
    }, [location.pathname]);

    useEffect(() => {
        const onDocumentClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            if (!target.closest('.admin-topbar-search')) {
                setTopSearchFocused(false);
            }
            if (!target.closest('.admin-topbar-profile')) {
                setProfileOpen(false);
            }
        };

        document.addEventListener('click', onDocumentClick);
        return () => document.removeEventListener('click', onDocumentClick);
    }, []);

    const searchResults = globalSearchQuery.data?.data ?? [];
    const openSearchResults = topSearchFocused && (globalSearchQuery.isFetching || topSearch.trim().length >= 2);
    const canCreatePosts = canAccessModule('create-post');
    const canManagePosts = canAccessModule('manage-posts');

    return (
        <div className="admin-layout editorial-shell admin-layout-simple">
            <aside className="admin-sidebar" aria-label="Admin navigation">
                <div className="admin-brand">
                    <div className="admin-brand-mark">SE</div>
                    <div className="admin-brand-text">
                        <h1 className="admin-brand-title">SarkariExams</h1>
                        <span className="admin-brand-subtitle">Simple Admin Panel</span>
                    </div>
                </div>

                <nav className="admin-nav admin-nav-simple" aria-label="Admin modules">
                    {navGroups.map((group) => (
                        <section key={group.key} className="admin-nav-group simple">
                            <div className="admin-nav-group-heading">{group.label}</div>
                            <div className="admin-nav-group-items">
                                {group.items.map((item) => (
                                    <NavLink
                                        key={item.key}
                                        to={item.to}
                                        className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`}
                                        title={item.summary}
                                    >
                                        <span className="admin-nav-label">{item.label}</span>
                                    </NavLink>
                                ))}
                            </div>
                        </section>
                    ))}
                </nav>

                <div className="admin-sidebar-footer">
                    <a className="admin-nav-link" href="/" target="_blank" rel="noreferrer">
                        <span className="admin-nav-label">View Live Site</span>
                    </a>
                    <a className="admin-nav-link" href="/admin-legacy">
                        <span className="admin-nav-label">Open Legacy Admin</span>
                    </a>
                </div>
            </aside>

            <main className="admin-main">
                <header className="admin-topbar admin-topbar-simple">
                    <div className="admin-topbar-left">
                        <div className="admin-topbar-heading">
                            <span className="admin-topbar-kicker">Admin</span>
                            <strong>{activeModule?.label ?? 'Dashboard'}</strong>
                            <span className="ops-inline-muted">
                                {activeModule?.summary ?? 'Manage posts, pages, users, and settings for SarkariExams.'}
                            </span>
                        </div>
                        <div className="admin-topbar-search">
                            <input
                                type="search"
                                value={topSearch}
                                onChange={(event) => setTopSearch(event.target.value)}
                                onFocus={() => setTopSearchFocused(true)}
                                placeholder="Search posts and admin pages"
                            />
                            {openSearchResults ? (
                                <div className="admin-topbar-search-results" role="listbox" aria-label="Admin global search results">
                                    {globalSearchQuery.isFetching ? (
                                        <div className="ops-inline-muted">Searching...</div>
                                    ) : null}
                                    {!globalSearchQuery.isFetching && searchResults.length === 0 ? (
                                        <div className="ops-inline-muted">No results found.</div>
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
                        {canManagePosts ? (
                            <button
                                type="button"
                                className="admin-btn subtle"
                                onClick={() => navigate('/manage-posts')}
                            >
                                All Posts
                            </button>
                        ) : null}
                        {canCreatePosts ? (
                            <button
                                type="button"
                                className="admin-btn primary"
                                onClick={() => navigate('/create-post')}
                            >
                                New Post
                            </button>
                        ) : null}
                        <a className="admin-btn subtle" href="/" target="_blank" rel="noreferrer">
                            View Site
                        </a>
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
                                    </div>
                                </div>
                            </button>
                            {profileOpen ? (
                                <div className="admin-profile-dropdown" onClick={(event) => event.stopPropagation()}>
                                    <div className="admin-profile-dropdown-header">
                                        <div className="admin-profile-dropdown-name">{user?.email?.split('@')[0] ?? 'Admin'}</div>
                                        <div className="admin-profile-dropdown-email">{user?.email ?? ''}</div>
                                    </div>
                                    <button
                                        type="button"
                                        className="admin-profile-dropdown-item"
                                        onClick={() => {
                                            navigate('/settings');
                                            setProfileOpen(false);
                                        }}
                                    >
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

                <section className="admin-page-shell">
                    {moduleAccessDenied && activeModule ? (
                        <PermissionState
                            title="You do not have access to this page."
                            description="Your current role does not include the permission required to open this route."
                            detail={<>Required permission: <code>{activeModuleRequiredPermission}</code>.</>}
                        />
                    ) : (
                        <div key={location.pathname} className="admin-page-transition">
                            <Outlet />
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
