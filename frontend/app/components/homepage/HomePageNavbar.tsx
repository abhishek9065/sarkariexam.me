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
  Menu,
  School,
  Search,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { buildJobsPath } from '@/app/lib/public-content';
import { HomePageLoginModal } from './HomePageLoginModal';
import { homePageLinks } from './links';

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuery = searchQuery.trim();
    router.push(buildJobsPath({ search: trimmedQuery || undefined }));
    setIsMenuOpen(false);
  }

  return (
    <>
      <HomePageLoginModal open={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
      <header className="sticky top-0 z-50">
        <div
          className="relative overflow-hidden text-white shadow-2xl"
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

          <div className="mx-auto flex h-[60px] max-w-6xl items-center justify-between gap-3 px-3">
            <Link href={homePageLinks.home} className="flex shrink-0 items-center gap-3">
              <div className="relative shrink-0">
                <div
                  className="relative flex h-11 w-11 items-center justify-center rounded-2xl"
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
              <div className="leading-none">
                <div className="flex items-baseline gap-0 tracking-tight text-[20px] font-black">
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
                    Exams
                  </span>
                  <span
                    className="text-[16px] font-medium"
                    style={{
                      background: 'linear-gradient(90deg, #90caf9 0%, #64b5f6 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    .me
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="h-px w-3 bg-gradient-to-r from-[#fdd835] to-transparent" />
                  <span className="whitespace-nowrap text-[8.5px] font-semibold uppercase tracking-[0.14em] text-blue-200">
                    Sarkari Results · Latest Online Form
                  </span>
                  <span className="h-px w-3 bg-gradient-to-r from-transparent to-[#fdd835]" />
                </div>
              </div>
            </Link>

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

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsNotificationOpen((current) => !current)}
                  className="relative flex h-9 w-9 items-center justify-center rounded-[9px] border border-white/16 bg-white/9 transition-all hover:bg-white/14"
                >
                  <Bell size={15} />
                  <span
                    className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border border-[#0d1b6e]"
                    style={{ background: 'linear-gradient(135deg,#ff5252,#c62828)' }}
                  />
                </button>
                {isNotificationOpen && (
                  <div className="absolute right-0 top-11 z-50 w-[272px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
                    <div className="flex items-center justify-between bg-gradient-to-r from-[#0d1b6e] to-[#1565c0] px-3.5 py-2.5">
                      <span className="text-[12px] font-bold text-white">Notifications</span>
                      <span className="rounded-full bg-[#e53935] px-1.5 py-0.5 text-[9px] font-extrabold text-white">
                        3 NEW
                      </span>
                    </div>
                    {notifications.map((notification) => (
                      <div
                        key={notification}
                        className="flex cursor-pointer items-start gap-2.5 border-b border-gray-50 px-3.5 py-2.5 transition-colors hover:bg-blue-50"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                        <span className="text-[12px] text-gray-700">{notification}</span>
                      </div>
                    ))}
                    <div className="bg-gray-50 px-3.5 py-2.5 text-center">
                      <Link href={homePageLinks.results} className="text-[11px] font-semibold text-[#1a237e] hover:underline">
                        View all notifications →
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsLoginOpen(true)}
                className="flex items-center gap-2 rounded-[10px] border border-[rgba(253,216,53,0.45)] bg-[linear-gradient(135deg,rgba(253,216,53,0.18)_0%,rgba(255,179,0,0.1)_100%)] px-4 py-[7px] text-[12px] font-bold text-white shadow-[0_2px_12px_rgba(253,216,53,0.1),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all hover:-translate-y-px hover:bg-[linear-gradient(135deg,#fdd835_0%,#ffb300_100%)] hover:text-[#0d1b6e] hover:shadow-[0_4px_20px_rgba(253,216,53,0.35)]"
              >
                <LogIn size={13} />
                Login / Register
              </button>
            </div>

            <div className="flex items-center gap-2 md:hidden">
              <button
                type="button"
                onClick={() => setIsLoginOpen(true)}
                className="flex items-center gap-1 rounded-xl border border-[rgba(253,216,53,0.4)] bg-[rgba(253,216,53,0.2)] px-3 py-1.5 text-[11px] font-bold text-white"
              >
                <LogIn size={12} />
                Login
              </button>
              <button
                type="button"
                className="rounded-lg p-2 transition-colors hover:bg-white/15"
                onClick={() => setIsMenuOpen((current) => !current)}
              >
                {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        <div className="relative shadow-lg" style={{ background: 'linear-gradient(90deg, #bf360c 0%, #e65100 40%, #d84315 100%)' }}>
          <div className="absolute inset-x-0 top-0 h-px bg-white/20" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-black/20" />
          <div className="mx-auto max-w-6xl px-3">
            <div className="hidden items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex">
              {navLinks.map(({ label, icon: Icon, badge, href }, index) => (
                <Link
                  key={label}
                  href={href}
                  className={`group relative flex h-10 items-center gap-1.5 whitespace-nowrap px-3.5 py-0 text-[12px] font-semibold transition-all duration-200 ${
                    index === 0 ? 'text-white' : 'text-white/80 hover:text-white'
                  }`}
                >
                  <span
                    className={`absolute inset-y-1.5 inset-x-1 rounded-md transition-all duration-200 ${
                      index === 0 ? 'bg-white/20' : 'bg-transparent group-hover:bg-white/15'
                    }`}
                  />
                  <span
                    className={`absolute bottom-0 left-2 right-2 h-0.5 rounded-full transition-all duration-200 ${
                      index === 0 ? 'bg-yellow-300' : 'bg-transparent group-hover:bg-white/50'
                    }`}
                  />
                  <Icon
                    size={13}
                    className={`relative z-10 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                      index === 0 ? 'text-yellow-300' : ''
                    }`}
                  />
                  <span className="relative z-10">{label}</span>
                  {badge && (
                    <span
                      className={`relative z-10 shrink-0 rounded px-1 py-px text-[8px] font-extrabold tracking-[0.05em] text-white ${
                        badge === 'HOT' ? 'bg-red-500' : 'bg-green-500'
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </Link>
              ))}
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
            </div>
          </div>
        )}
      </header>
    </>
  );
}
