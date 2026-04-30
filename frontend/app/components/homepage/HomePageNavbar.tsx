'use client';

import {
  Award,
  Bell,
  BookOpen,
  Briefcase,
  ClipboardList,
  FileCheck,
  GraduationCap,
  Home,
  LayoutGrid,
  LogIn,
  LogOut,
  Menu,
  School,
  Search,
  Settings,
  Shield,
  User,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SafeLink } from '@/app/components/public-site/SafeLink';
import { buildJobsPath } from '@/app/lib/public-content';
import { HomePageLoginModal } from './HomePageLoginModal';
import { getAdminUrl, homePageLinks } from './links';
import { useCurrentUser } from '@/hooks/useCurrentUser';

const navLinks = [
  { label: 'Home', icon: Home, badge: null, href: homePageLinks.home },
  { label: 'Latest Jobs', icon: Briefcase, badge: 'HOT', href: homePageLinks.jobs },
  { label: 'Results', icon: ClipboardList, badge: null, href: homePageLinks.results },
  { label: 'Admit Card', icon: FileCheck, badge: 'NEW', href: homePageLinks.admitCards },
  { label: 'Answer Key', icon: BookOpen, badge: null, href: homePageLinks.answerKey },
  { label: 'Syllabus', icon: LayoutGrid, badge: null, href: homePageLinks.syllabus },
  { label: 'Admission', icon: GraduationCap, badge: 'NEW', href: homePageLinks.admissions },
  { label: 'Board Result', icon: Award, badge: null, href: homePageLinks.boardResults },
  { label: 'Scholarship', icon: School, badge: null, href: homePageLinks.scholarship },
] as const;

const notifications = [
  'SSC CGL 2026 Notification Out!',
  'UPSC CSE Prelims Result Declared',
  'IBPS PO 2026 Apply Now',
];

export function HomePageNavbar() {
  const router = useRouter();
  const { user, isAdmin, isLoggedIn, logout } = useCurrentUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const ADMIN_URL = getAdminUrl();

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!(event.target instanceof Element)) {
        return;
      }

      const target = event.target;
      // Don't close if clicking inside any menu
      if (target.closest('[data-user-menu]') || 
          target.closest('[data-notification-menu]') ||
          target.closest('[data-mobile-menu]')) {
        return;
      }
      setIsUserMenuOpen(false);
      setIsNotificationOpen(false);
    }

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuery = searchQuery.trim();
    router.push(buildJobsPath({ search: trimmedQuery || undefined }));
    setIsMenuOpen(false);
  }

  return (
    <>
      <HomePageLoginModal 
        open={isLoginOpen} 
        onClose={() => setIsLoginOpen(false)} 
        onLoginSuccess={() => {
          setIsLoginOpen(false);
          // The useCurrentUser hook will automatically re-fetch user data
          window.location.reload();
        }}
      />
      <header className="sticky top-0 z-50">
        <div
          className="relative overflow-x-hidden text-white shadow-2xl"
          style={{ background: 'linear-gradient(120deg, #060d2e 0%, #0d1b6e 30%, #1a237e 60%, #0a3880 100%)' }}
        >
          <div
            className="pointer-events-none absolute left-0 top-0 h-full w-64 opacity-20"
            style={{ background: 'radial-gradient(ellipse at 20% 50%, #4f8ef7 0%, transparent 70%)' }}
          />
          <div
            className="absolute inset-x-0 top-0 h-px"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.35) 40%, rgba(253,216,53,0.5) 60%, transparent)',
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-px"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(253,216,53,0.4) 40%, rgba(255,255,255,0.15) 70%, transparent)',
            }}
          />

          <div className="mx-auto flex h-[60px] max-w-6xl items-center justify-between gap-2 px-3 md:gap-3">
            <Link href={homePageLinks.home} className="flex min-w-0 flex-1 items-center gap-2 md:flex-none md:shrink-0 md:gap-3">
              <div className="relative shrink-0">
                <div
                  className="relative flex h-10 w-10 items-center justify-center rounded-2xl md:h-11 md:w-11"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 100%)',
                    border: '1.5px solid rgba(255,255,255,0.25)',
                    boxShadow:
                      '0 0 0 3px rgba(253,216,53,0.15), inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 16px rgba(0,0,0,0.4)',
                  }}
                >
                  <div
                    className="absolute inset-0 rounded-2xl opacity-60"
                    style={{ background: 'radial-gradient(circle at 35% 35%, rgba(253,216,53,0.25), transparent 65%)' }}
                  />
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="relative z-10">
                    <path d="M12 2L4 6v5c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V6L12 2z" fill="url(#shieldGrad)" opacity="0.9" />
                    <path d="M12 8l-5 2.5 5 2.5 5-2.5L12 8z" fill="#fdd835" />
                    <path d="M9 11.5v2.5c0 1 1.3 2 3 2s3-1 3-2v-2.5L12 13l-3-1.5z" fill="#fdd835" opacity="0.85" />
                    <line x1="17" y1="10.5" x2="17" y2="14" stroke="#fdd835" strokeWidth="1.2" strokeLinecap="round" />
                    <circle cx="17" cy="14.3" r="0.7" fill="#fdd835" />
                    <defs>
                      <linearGradient id="shieldGrad" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#4f8ef7" />
                        <stop offset="100%" stopColor="#1a237e" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <span
                  className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0d1b6e]"
                  style={{ background: 'linear-gradient(135deg, #fdd835, #f57f17)' }}
                />
              </div>
              <div className="min-w-0 leading-none">
                <div className="flex items-baseline gap-0 text-[18px] font-black md:text-[20px]">
                  <span
                    style={{
                      background: 'linear-gradient(90deg, #ffffff 0%, #dce8ff 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    Sarkari
                  </span>
                  <span
                    style={{
                      background: 'linear-gradient(90deg, #fdd835 0%, #ffb300 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    Exam
                  </span>
                  <span
                    className="text-[14px] font-medium md:text-[16px]"
                    style={{
                      background: 'linear-gradient(90deg, #90caf9 0%, #64b5f6 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    .me
                  </span>
                </div>
                <div className="mt-1 hidden items-center gap-1.5 sm:flex">
                  <span className="h-px w-3 bg-gradient-to-r from-[#fdd835] to-transparent" />
                  <span className="whitespace-nowrap text-[8.5px] font-semibold uppercase tracking-[0.14em] text-blue-200">
                    Sarkari Results · Latest Online Form
                  </span>
                  <span className="h-px w-3 bg-gradient-to-r from-transparent to-[#fdd835]" />
                </div>
              </div>
            </Link>

            {/* Desktop Search and Buttons */}
            <div className="hidden flex-1 items-center justify-end gap-2.5 md:flex">
              <form
                onSubmit={handleSearchSubmit}
                className="flex w-56 items-center rounded-[10px] border border-white/16 bg-white/8 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all focus-within:border-white/30"
              >
                <Search size={13} className="mr-2 shrink-0 text-blue-300" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search jobs, results..."
                  className="flex-1 bg-transparent text-[12px] text-white outline-none placeholder:text-blue-300/70"
                />
              </form>

              <div className="relative" data-notification-menu>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsNotificationOpen((current) => !current);
                  }}
                  className="relative flex h-9 w-9 items-center justify-center rounded-[9px] border border-white/16 bg-white/9 transition-all hover:bg-white/14 hover:scale-105 active:scale-95"
                  aria-label="Toggle notifications"
                  title="Notifications"
                >
                  <Bell size={15} />
                  <span
                    className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border border-[#0d1b6e] animate-pulse"
                    style={{ background: 'linear-gradient(135deg,#ff5252,#c62828)' }}
                  />
                </button>
                {isNotificationOpen && (
                  <div
                    className="absolute right-0 top-12 z-[9999] w-[272px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl ring-1 ring-black/5"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-center justify-between bg-gradient-to-r from-[#0d1b6e] to-[#1565c0] px-3.5 py-2.5">
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
                        onClick={() => {
                          setIsNotificationOpen(false);
                        }}
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                        <span className="text-[12px] text-gray-700">{notification}</span>
                      </Link>
                    ))}
                    <div className="bg-gray-50 px-3.5 py-2.5 text-center">
                      <Link
                        href={homePageLinks.results}
                        className="text-[11px] font-semibold text-[#1a237e] hover:underline"
                        onClick={() => {
                          setIsNotificationOpen(false);
                        }}
                      >
                        View all notifications →
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* User Authentication Section */}
              {isLoggedIn ? (
                <div className="relative" data-user-menu>
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 rounded-[10px] border border-[rgba(100,200,100,0.45)] bg-[linear-gradient(135deg,rgba(100,200,100,0.18)_0%,rgba(150,200,100,0.1)_100%)] px-4 py-[7px] text-[12px] font-bold text-white shadow-[0_2px_12px_rgba(100,200,100,0.1),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all hover:-translate-y-px hover:bg-[linear-gradient(135deg,#64c864_0%,#96c864_100%)] hover:text-[#0d1b6e] hover:shadow-[0_4px_20px_rgba(100,200,100,0.35)]"
                  >
                    {isAdmin ? <Shield size={13} /> : <User size={13} />}
                    {isAdmin ? 'Admin' : user?.name || 'Profile'}
                  </button>

                  {/* User Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 top-11 z-[9999] w-[200px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg ring-1 ring-black/5">
                      <div className="border-b border-gray-100 px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                        {isAdmin && (
                          <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            <Shield size={12} />
                            Admin
                          </span>
                        )}
                      </div>
                      
                      {isAdmin && (
                        <>
                          <SafeLink
                            href={ADMIN_URL}
                            target="_blank"
                            className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 border-b border-gray-100"
                          >
                            <Settings size={16} />
                            Admin Dashboard
                          </SafeLink>
                        </>
                      )}
                      
                      <button
                        onClick={() => {
                          logout();
                          setIsUserMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-red-50"
                      >
                        <LogOut size={16} />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsLoginOpen(true)}
                  className="flex items-center gap-2 rounded-[10px] border border-[rgba(253,216,53,0.45)] bg-[linear-gradient(135deg,rgba(253,216,53,0.18)_0%,rgba(255,179,0,0.1)_100%)] px-4 py-[7px] text-[12px] font-bold text-white shadow-[0_2px_12px_rgba(253,216,53,0.1),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all hover:-translate-y-px hover:bg-[linear-gradient(135deg,#fdd835_0%,#ffb300_100%)] hover:text-[#0d1b6e] hover:shadow-[0_4px_20px_rgba(253,216,53,0.35)]"
                >
                  <LogIn size={13} />
                  Login / Register
                </button>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1.5 md:hidden" data-mobile-menu>
              {/* Mobile Notification Bell */}
              <div data-notification-menu>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsNotificationOpen((current) => !current);
                  }}
                  className="relative flex h-9 w-9 items-center justify-center rounded-[9px] border border-white/16 bg-white/9 transition-all hover:bg-white/14"
                  aria-label="Toggle notifications"
                  title="Notifications"
                >
                  <Bell size={14} />
                  <span
                    className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border border-[#0d1b6e] animate-pulse"
                    style={{ background: 'linear-gradient(135deg,#ff5252,#c62828)' }}
                  />
                </button>
              </div>

              {isLoggedIn ? (
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-[rgba(100,200,100,0.4)] bg-[rgba(100,200,100,0.2)] text-white"
                  aria-label={isAdmin ? 'Admin menu' : 'Profile menu'}
                >
                  {isAdmin ? <Shield size={12} /> : <User size={12} />}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsLoginOpen(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-[rgba(253,216,53,0.45)] bg-[rgba(253,216,53,0.2)] text-white"
                  aria-label="Login or register"
                >
                  <LogIn size={12} />
                </button>
              )}
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-[9px] transition-colors hover:bg-white/15"
                onClick={() => setIsMenuOpen((current) => !current)}
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        <div
          className="relative hidden md:block"
          style={{
            background: 'linear-gradient(90deg, #060d1f 0%, #0a1428 40%, #0d1a30 60%, #060d1f 100%)',
            boxShadow: '0 6px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(230,81,0,0.5) 20%, rgba(253,216,53,0.7) 50%, rgba(230,81,0,0.5) 80%, transparent 100%)',
            }}
          />
          <div
            className="pointer-events-none absolute left-0 top-0 h-full w-48"
            style={{ background: 'radial-gradient(at 0% 50%, rgba(230,81,0,0.07) 0%, transparent 70%)' }}
          />
          <div
            className="pointer-events-none absolute right-0 top-0 h-full w-48"
            style={{ background: 'radial-gradient(at 100% 50%, rgba(253,216,53,0.05) 0%, transparent 70%)' }}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-black/50" />
          <div className="mx-auto max-w-6xl px-3">
            <div className="flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {navLinks.map(({ label, icon: Icon, badge, href }, index) => (
                <Link
                  key={label}
                  href={href}
                  className="group relative flex h-11 items-center gap-1.5 whitespace-nowrap px-3.5 py-0 transition-all duration-200 select-none"
                  style={{ fontSize: '11.5px', fontWeight: index === 0 ? 700 : 500 }}
                >
                  <span
                    className="absolute inset-x-1 inset-y-1.5 rounded-lg opacity-0 transition-all duration-200 group-hover:opacity-100"
                    style={
                      index === 0
                        ? {
                            opacity: 1,
                            background: 'linear-gradient(160deg, rgba(230,81,0,0.22) 0%, rgba(230,81,0,0.09) 100%)',
                            border: '1px solid rgba(230,81,0,0.25)',
                          }
                        : {
                            background: 'linear-gradient(160deg, rgba(230,81,0,0.18) 0%, rgba(230,81,0,0.07) 100%)',
                            border: '1px solid rgba(230,81,0,0.15)',
                          }
                    }
                  />
                  {index < navLinks.length - 1 ? (
                    <span
                      className="pointer-events-none absolute right-0 top-3 bottom-3 w-px"
                      style={{ background: 'rgba(255,255,255,0.05)' }}
                    />
                  ) : null}
                  <Icon
                    size={13}
                    className="relative z-10 shrink-0 transition-all duration-200 group-hover:scale-110 group-hover:rotate-[-4deg]"
                    style={
                      index === 0
                        ? { color: '#ff7043', filter: 'drop-shadow(0 0 4px rgba(230,81,0,0.6))' }
                        : { color: 'rgba(255,255,255,0.38)' }
                    }
                  />
                  <span
                    className="relative z-10 transition-colors duration-200 group-hover:text-white"
                    style={
                      index === 0
                        ? { color: '#ffffff', textShadow: '0 0 12px rgba(230,81,0,0.4)' }
                        : { color: 'rgba(255,255,255,0.5)' }
                    }
                  >
                    {label}
                  </span>
                  {badge && (
                    <span
                      className="relative z-10 shrink-0 rounded-full animate-pulse text-white"
                      style={{
                        fontSize: '7.5px',
                        fontWeight: 800,
                        letterSpacing: '0.08em',
                        padding: '1.5px 5px',
                        background:
                          badge === 'HOT'
                            ? 'linear-gradient(135deg, #c62828, #e53935)'
                            : 'linear-gradient(135deg, #1b5e20, #2e7d32)',
                        boxShadow:
                          badge === 'HOT'
                            ? '0 0 8px rgba(198,40,40,0.6), inset 0 1px 0 rgba(255,255,255,0.15)'
                            : '0 0 8px rgba(27,94,32,0.6), inset 0 1px 0 rgba(255,255,255,0.15)',
                      }}
                    >
                      {badge}
                    </span>
                  )}
                  <span
                    className="absolute bottom-0 left-2 right-2 rounded-t-full transition-all duration-300"
                    style={
                      index === 0
                        ? {
                            height: '2.5px',
                            background: 'linear-gradient(90deg, #e65100, #fdd835, #e65100)',
                            boxShadow: '0 0 10px rgba(230,81,0,0.8), 0 0 20px rgba(230,81,0,0.3)',
                            opacity: 1,
                            transform: 'scaleX(1)',
                            transformOrigin: 'center',
                          }
                        : {
                            height: '2.5px',
                            background: 'linear-gradient(90deg, #e65100, #fdd835, #e65100)',
                            boxShadow: '0 0 10px rgba(230,81,0,0.8), 0 0 20px rgba(230,81,0,0.3)',
                            opacity: 0,
                            transform: 'scaleX(0.3)',
                            transformOrigin: 'center',
                          }
                    }
                  />
                  {index !== 0 ? (
                    <span
                      className="absolute bottom-0 left-2 right-2 rounded-t-full opacity-0 transition-all duration-200 group-hover:opacity-100"
                      style={{
                        height: '2px',
                        background: 'linear-gradient(90deg, #e65100, #ff7043)',
                        boxShadow: '0 0 6px rgba(230,81,0,0.5)',
                        transform: 'scaleX(0.6)',
                        transformOrigin: 'center',
                      }}
                    />
                  ) : null}
                </Link>
              ))}
              <div className="flex-1" />
              <div className="flex h-11 shrink-0 items-center gap-2 border-l border-white/5 px-4">
                <span className="relative flex h-2 w-2 items-center justify-center">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-green-400 opacity-40" />
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                </span>
                <span
                  className="text-[9.5px] font-bold tracking-[0.1em]"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  LIVE
                </span>
              </div>
            </div>
          </div>
        </div>

        {isMenuOpen && (
          <div className="border-b bg-white shadow-xl md:hidden">
            <div className="p-3">
              <form
                onSubmit={handleSearchSubmit}
                className="mb-3 flex items-center rounded-xl border border-gray-200 bg-gray-100 px-3 py-2"
              >
                <Search size={14} className="mr-2 text-gray-400" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
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

              {/* Mobile User Menu Section */}
              {isLoggedIn && (
                <div className="mt-3 border-t border-gray-200 pt-3">
                  <div className="mb-3 rounded-lg bg-gray-50 px-3 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      {isAdmin ? <Shield size={16} className="text-green-600" /> : <User size={16} className="text-gray-600" />}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                      </div>
                    </div>
                    {isAdmin && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                        <Shield size={12} />
                        Admin Access
                      </span>
                    )}
                  </div>
                  
                  {isAdmin && (
                    <Link
                      href={ADMIN_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-orange-50 hover:text-orange-700 border border-orange-200 mb-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Settings size={16} />
                      Admin Dashboard
                    </Link>
                  )}
                  
                  <button
                    onClick={() => {
                      logout();
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 border border-red-200"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile Notification Dropdown - positioned outside hamburger menu */}
        {isNotificationOpen && (
          <div
            className="absolute right-4 top-20 z-[9999] w-[272px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl ring-1 ring-black/5 md:hidden"
            data-notification-menu
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between bg-gradient-to-r from-[#0d1b6e] to-[#1565c0] px-3.5 py-2.5">
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
                onClick={() => {
                  setIsNotificationOpen(false);
                }}
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                <span className="text-[12px] text-gray-700">{notification}</span>
              </Link>
            ))}
            <div className="bg-gray-50 px-3.5 py-2.5 text-center">
              <Link 
                href={homePageLinks.results} 
                className="text-[11px] font-semibold text-[#1a237e] hover:underline"
                onClick={() => setIsNotificationOpen(false)}
              >
                View all notifications →
              </Link>
            </div>
          </div>
        )}

        {/* Mobile User Dropdown - positioned outside hamburger menu */}
        {isUserMenuOpen && isLoggedIn && (
          <div className="absolute right-4 top-20 z-[9999] w-[200px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg ring-1 ring-black/5 md:hidden">
            <div className="border-b border-gray-100 px-4 py-3">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
              {isAdmin && (
                <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                  <Shield size={12} />
                  Admin
                </span>
              )}
            </div>
            
            {isAdmin && (
              <>
                <SafeLink
                  href={ADMIN_URL}
                  target="_blank"
                  className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 border-b border-gray-100"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <Settings size={16} />
                  Admin Dashboard
                </SafeLink>
              </>
            )}
            
            <button
              onClick={() => {
                logout();
                setIsUserMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-red-50"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        )}

      </header>
    </>
  );
}
