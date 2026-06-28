'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { FormEvent, MouseEvent as ReactMouseEvent } from 'react';
import { useTheme } from '@/components/theme-provider';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import type { AuthTab } from './HomePageNavbarData';
import { navLinks, notifications } from './HomePageNavbarData';
import { getAdminUrl, homePageLinks } from './links';

const HomePageLoginModal = dynamic(
  () => import('./HomePageLoginModal').then((mod) => mod.HomePageLoginModal),
  { ssr: false, loading: () => null }
);

interface HomePageNavbarClientProps {
  initialAuthTab?: AuthTab;
}

function subscribeToClientMount(onStoreChange: () => void) {
  const timeout = window.setTimeout(onStoreChange, 0);
  return () => window.clearTimeout(timeout);
}

function getClientMountSnapshot() {
  return true;
}

function getServerMountSnapshot() {
  return false;
}

function Icon({ name, className = '' }: { name: 'bell' | 'login' | 'logout' | 'menu' | 'moon' | 'search' | 'settings' | 'shield' | 'sun' | 'user' | 'x'; className?: string }) {
  const commonProps = {
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: '2',
  };

  const paths = {
    bell: <path {...commonProps} d="M15 17H9m8-3V9a5 5 0 0 0-10 0v5l-2 3h14l-2-3Zm-5 7a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2Z" />,
    login: <path {...commonProps} d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5m5 5H3" />,
    logout: <path {...commonProps} d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9" />,
    menu: <path {...commonProps} d="M4 6h16M4 12h16M4 18h16" />,
    moon: <path {...commonProps} d="M21 12.8A8.5 8.5 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />,
    search: <path {...commonProps} d="m21 21-4.35-4.35m1.35-5.15a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />,
    settings: <path {...commonProps} d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0-12v3m0 11v3m8.5-8.5h-3m-11 0h-3m14.5-6-2.1 2.1m-7.8 7.8L6 18m12 0-2.1-2.1M8.1 8.1 6 6" />,
    shield: <path {...commonProps} d="M12 3 5 6v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V6l-7-3Z" />,
    sun: <path {...commonProps} d="M12 4V2m0 20v-2m8-8h2M2 12h2m14.4-6.4 1.4-1.4M4.2 19.8l1.4-1.4m12.8 0 1.4 1.4M4.2 4.2l1.4 1.4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />,
    user: <path {...commonProps} d="M20 21a8 8 0 0 0-16 0m12-13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />,
    x: <path {...commonProps} d="M18 6 6 18M6 6l12 12" />,
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      {paths[name]}
    </svg>
  );
}

function HomePageThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const hasMounted = useSyncExternalStore(
    subscribeToClientMount,
    getClientMountSnapshot,
    getServerMountSnapshot
  );
  const currentTheme = hasMounted ? resolvedTheme : 'light';
  const isDark = currentTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      aria-pressed={isDark}
      title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      className="group relative flex h-9 w-9 shrink-0 items-center overflow-hidden rounded-full border border-white/20 p-1 text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:border-white/35 active:translate-y-0 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80 md:w-19.5 md:gap-2 md:pr-3"
      style={{
        background: isDark
          ? 'linear-gradient(135deg,#050816 0%,#111a3f 52%,#312e81 100%)'
          : 'linear-gradient(135deg,#fffdf5 0%,#ffe7b8 50%,#fb923c 100%)',
        boxShadow: isDark
          ? 'inset 0 1px 0 rgba(255,255,255,0.12), inset 0 0 18px rgba(129,140,248,0.32), 0 8px 22px rgba(0,0,0,0.28)'
          : 'inset 0 1px 0 rgba(255,255,255,0.75), inset 0 0 16px rgba(251,146,60,0.35), 0 8px 20px rgba(251,146,60,0.18)',
      }}
    >
      <span
        className="pointer-events-none absolute inset-0 opacity-70 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: isDark
            ? 'radial-gradient(circle at 72% 35%, rgba(165,180,252,0.42), transparent 35%)'
            : 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.86), transparent 42%)',
        }}
      />
      <span
        className="pointer-events-none absolute left-7 top-2 h-1 w-1 rounded-full bg-white/80 transition-all duration-300 md:left-12"
        style={{ opacity: isDark ? 1 : 0, transform: isDark ? 'scale(1)' : 'scale(0.4)' }}
      />
      <span
        className="pointer-events-none absolute right-4 bottom-2.5 h-0.5 w-0.5 rounded-full bg-indigo-100/80 transition-all duration-300"
        style={{ opacity: isDark ? 1 : 0, transform: isDark ? 'scale(1)' : 'scale(0.4)' }}
      />
      <span
        className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-300 group-hover:scale-105 group-active:scale-95"
        style={{
          background: isDark
            ? 'linear-gradient(135deg,#eef2ff 0%,#a5b4fc 100%)'
            : 'linear-gradient(135deg,#ffffff 0%,#fed7aa 100%)',
          boxShadow: isDark
            ? '0 0 18px rgba(165,180,252,0.8), 0 3px 10px rgba(0,0,0,0.28)'
            : '0 0 18px rgba(253,186,116,0.8), 0 3px 10px rgba(154,52,18,0.18)',
        }}
      >
        <Icon
          name="sun"
          className={`absolute h-4 w-4 text-orange-600 transition-all duration-300 ${
            isDark ? '-rotate-90 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100'
          }`}
        />
        <Icon
          name="moon"
          className={`absolute h-3.5 w-3.5 text-indigo-800 transition-all duration-300 ${
            isDark ? 'rotate-0 scale-100 opacity-100' : 'rotate-90 scale-50 opacity-0'
          }`}
        />
      </span>
      <span
        className={`relative z-10 hidden text-[12px] font-extrabold leading-none transition-all duration-300 md:inline ${
          isDark ? 'text-indigo-50 drop-shadow-[0_1px_4px_rgba(0,0,0,0.35)]' : 'text-orange-900'
        }`}
      >
        {isDark ? 'Dark' : 'Light'}
      </span>
    </button>
  );
}

function NotificationDropdown({ mobile, onClose }: { mobile?: boolean; onClose: () => void }) {
  return (
    <div
      className={
        mobile
          ? 'fixed right-4 top-20 z-9999 w-68 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl ring-1 ring-black/5 md:hidden'
          : 'absolute right-0 top-12 z-9999 w-68 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl ring-1 ring-black/5'
      }
      data-notification-menu
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-center justify-between bg-linear-to-r from-[#0d1b6e] to-[#1565c0] px-3.5 py-2.5">
        <span className="text-[12px] font-bold text-white">Notifications</span>
        <span className="rounded-full bg-[#e53935] px-1.5 py-0.5 text-[9px] font-extrabold text-white">
          3 NEW
        </span>
      </div>
      {notifications.map((notification) => (
        <Link
          key={notification}
          href={homePageLinks.results}
          className="flex cursor-pointer items-start gap-2.5 border-b border-gray-50 px-3.5 py-2.5 transition-colors hover:bg-blue-50"
          onClick={onClose}
        >
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
          <span className="text-[12px] text-gray-700">{notification}</span>
        </Link>
      ))}
      <div className="bg-gray-50 px-3.5 py-2.5 text-center">
        <Link href={homePageLinks.results} className="text-[11px] font-semibold text-[#1a237e] hover:underline" onClick={onClose}>
          View all notifications →
        </Link>
      </div>
    </div>
  );
}

export function HomePageNavbarClient({ initialAuthTab }: HomePageNavbarClientProps) {
  const router = useRouter();
  const { user, isAdmin, isLoggedIn, logout } = useCurrentUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(() => Boolean(initialAuthTab));
  const [loginTab, setLoginTab] = useState<AuthTab>(initialAuthTab ?? 'login');
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const ADMIN_URL = getAdminUrl();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!(event.target instanceof Element)) {
        return;
      }

      const target = event.target;
      if (
        target.closest('[data-user-menu]') ||
        target.closest('[data-notification-menu]') ||
        target.closest('[data-mobile-menu]')
      ) {
        return;
      }

      setIsUserMenuOpen(false);
      setIsNotificationOpen(false);
    }

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  function handleCloseLoginModal() {
    setIsLoginOpen(false);

    if (initialAuthTab) {
      router.replace(homePageLinks.home);
    }
  }

  function handleLoginSuccess() {
    setIsLoginOpen(false);

    if (initialAuthTab) {
      window.location.replace(homePageLinks.home);
      return;
    }

    window.location.reload();
  }

  function handleMobileSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = String(formData.get('search') || '').trim();
    const params = new URLSearchParams();

    if (query) {
      params.set('search', query);
    }

    router.push(params.size ? `${homePageLinks.jobs}?${params.toString()}` : homePageLinks.jobs);
    setIsMenuOpen(false);
  }

  function openLogin(tab: AuthTab = 'login') {
    setLoginTab(tab);
    setIsLoginOpen(true);
  }

  function toggleNotifications(event: ReactMouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    setIsNotificationOpen((current) => {
      if (!current) {
        setIsUserMenuOpen(false);
      }

      return !current;
    });
  }

  function toggleUserMenu(event: ReactMouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    setIsUserMenuOpen((current) => {
      if (!current) {
        setIsNotificationOpen(false);
      }

      return !current;
    });
  }

  const modal = isLoginOpen ? (
    <HomePageLoginModal
      open={isLoginOpen}
      initialTab={loginTab}
      onClose={handleCloseLoginModal}
      onLoginSuccess={handleLoginSuccess}
    />
  ) : null;

  return (
    <>
      {modal}

      <div className="hidden items-center gap-2.5 md:flex">
        <HomePageThemeToggle />

        <div className="relative" data-notification-menu>
          <button
            type="button"
            onClick={toggleNotifications}
            className="relative flex h-9 w-9 items-center justify-center rounded-[9px] border border-white/15 bg-white/10 transition-all hover:scale-105 hover:bg-white/15 active:scale-95"
            aria-label="Toggle notifications"
            title="Notifications"
          >
            <Icon name="bell" className="h-4 w-4" />
            <span
              className="absolute right-1.5 top-1.5 h-2 w-2 animate-pulse rounded-full border border-[#0d1b6e]"
              style={{ background: 'linear-gradient(135deg,#ff5252,#c62828)' }}
            />
          </button>
          {isNotificationOpen && <NotificationDropdown onClose={() => setIsNotificationOpen(false)} />}
        </div>

        {isLoggedIn ? (
          <div className="relative" data-user-menu>
            <button
              type="button"
              onClick={toggleUserMenu}
              className="flex items-center gap-2 rounded-[10px] border border-[rgba(100,200,100,0.45)] bg-[linear-gradient(135deg,rgba(100,200,100,0.18)_0%,rgba(150,200,100,0.1)_100%)] px-4 py-1.75 text-[12px] font-bold text-white shadow-[0_2px_12px_rgba(100,200,100,0.1),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all hover:-translate-y-px hover:bg-[linear-gradient(135deg,#64c864_0%,#96c864_100%)] hover:text-[#0d1b6e] hover:shadow-[0_4px_20px_rgba(100,200,100,0.35)]"
            >
              <Icon name={isAdmin ? 'shield' : 'user'} className="h-3.5 w-3.5" />
              {isAdmin ? 'Admin' : user?.name || 'Profile'}
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 top-11 z-9999 w-50 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg ring-1 ring-black/5">
                <div className="border-b border-gray-100 px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                  {isAdmin && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      <Icon name="shield" className="h-3 w-3" />
                      Admin
                    </span>
                  )}
                </div>

                {isAdmin && (
                  <a
                    href={ADMIN_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 text-sm text-gray-700 hover:bg-orange-50"
                  >
                    <Icon name="settings" className="h-4 w-4" />
                    Admin Dashboard
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setIsUserMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-red-50"
                >
                  <Icon name="logout" className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => openLogin('login')}
            className="flex items-center gap-2 rounded-[10px] border border-[rgba(253,216,53,0.45)] bg-[linear-gradient(135deg,rgba(253,216,53,0.18)_0%,rgba(255,179,0,0.1)_100%)] px-4 py-1.75 text-[12px] font-bold text-white shadow-[0_2px_12px_rgba(253,216,53,0.1),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all hover:-translate-y-px hover:bg-[linear-gradient(135deg,#fdd835_0%,#ffb300_100%)] hover:text-[#0d1b6e] hover:shadow-[0_4px_20px_rgba(253,216,53,0.35)]"
          >
            <Icon name="login" className="h-3.5 w-3.5" />
            Login / Register
          </button>
        )}
      </div>

      <div className="md:hidden">
        <div className="flex shrink-0 items-center gap-1.5" data-mobile-menu>
          <HomePageThemeToggle />

          <button
            type="button"
            onClick={toggleNotifications}
            className="relative flex h-9 w-9 items-center justify-center rounded-[9px] border border-white/15 bg-white/10 transition-all hover:bg-white/15"
            aria-label="Toggle notifications"
            title="Notifications"
          >
            <Icon name="bell" className="h-3.5 w-3.5" />
            <span
              className="absolute right-1.5 top-1.5 h-2 w-2 animate-pulse rounded-full border border-[#0d1b6e]"
              style={{ background: 'linear-gradient(135deg,#ff5252,#c62828)' }}
            />
          </button>

          {isLoggedIn ? (
            <button
              type="button"
              onClick={toggleUserMenu}
              className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-[rgba(100,200,100,0.4)] bg-[rgba(100,200,100,0.2)] text-white"
              aria-label={isAdmin ? 'Admin menu' : 'Profile menu'}
            >
              <Icon name={isAdmin ? 'shield' : 'user'} className="h-3 w-3" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openLogin('login')}
              className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-[rgba(253,216,53,0.45)] bg-[rgba(253,216,53,0.2)] text-white"
              aria-label="Login or register"
            >
              <Icon name="login" className="h-3 w-3" />
            </button>
          )}

          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-[9px] transition-colors hover:bg-white/15"
            onClick={() => setIsMenuOpen((current) => !current)}
            aria-label="Toggle menu"
          >
            <Icon name={isMenuOpen ? 'x' : 'menu'} className="h-5 w-5" />
          </button>
        </div>

      </div>

      {isMenuOpen && (
          <div className="fixed left-0 right-0 top-[60px] z-40 border-b bg-white shadow-xl md:hidden">
            <div className="p-3">
              <form
                onSubmit={handleMobileSearchSubmit}
                className="mb-3 flex items-center rounded-xl border border-gray-200 bg-gray-100 px-3 py-2"
              >
                <Icon name="search" className="mr-2 h-3.5 w-3.5 text-gray-400" />
                <input
                  name="search"
                  placeholder="Search jobs, results..."
                  className="flex-1 bg-transparent text-[13px] text-gray-700 outline-none placeholder:text-gray-400"
                />
              </form>
              <div className="grid grid-cols-2 gap-1">
                {navLinks.map(({ label, href }) => (
                  <Link
                    key={label}
                    href={href}
                    className="flex items-center gap-2 rounded-lg border border-transparent px-3 py-2.5 text-[13px] font-medium text-gray-700 transition-colors hover:border-orange-100 hover:bg-orange-50 hover:text-orange-700"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span className="h-1 w-1 shrink-0 rounded-full bg-orange-400" />
                    {label}
                  </Link>
                ))}
              </div>

              {isLoggedIn && (
                <div className="mt-3 border-t border-gray-200 pt-3">
                  <div className="mb-3 rounded-lg bg-gray-50 px-3 py-3">
                    <div className="mb-2 flex items-center gap-2">
                      <Icon name={isAdmin ? 'shield' : 'user'} className={isAdmin ? 'h-4 w-4 text-green-600' : 'h-4 w-4 text-gray-600'} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                      </div>
                    </div>
                    {isAdmin && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                        <Icon name="shield" className="h-3 w-3" />
                        Admin Access
                      </span>
                    )}
                  </div>

                  {isAdmin && (
                    <a
                      href={ADMIN_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-2 flex items-center gap-2 rounded-lg border border-orange-200 px-3 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-orange-50 hover:text-orange-700"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Icon name="settings" className="h-4 w-4" />
                      Admin Dashboard
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg border border-red-200 px-3 py-3 text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
                  >
                    <Icon name="logout" className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
      )}

      {isNotificationOpen && <NotificationDropdown mobile onClose={() => setIsNotificationOpen(false)} />}

      {isUserMenuOpen && isLoggedIn && (
          <div
            className="fixed right-4 top-20 z-9999 w-55 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg ring-1 ring-black/5 md:hidden"
            data-user-menu
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-gray-100 px-4 py-3">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
              {isAdmin && (
                <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                  <Icon name="shield" className="h-3 w-3" />
                  Admin
                </span>
              )}
            </div>

            <Link
              href={homePageLinks.profile}
              className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 text-sm text-gray-700 hover:bg-blue-50"
              onClick={() => {
                setIsUserMenuOpen(false);
                setIsMenuOpen(false);
              }}
            >
              <Icon name="user" className="h-4 w-4" />
              Profile
            </Link>

            {isAdmin && (
              <a
                href={ADMIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 text-sm text-gray-700 hover:bg-orange-50"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  setIsMenuOpen(false);
                }}
              >
                <Icon name="settings" className="h-4 w-4" />
                Admin Dashboard
              </a>
            )}

            <button
              type="button"
              onClick={() => {
                logout();
                setIsUserMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-red-50"
            >
              <Icon name="logout" className="h-4 w-4" />
              Sign Out
            </button>
          </div>
      )}
    </>
  );
}
