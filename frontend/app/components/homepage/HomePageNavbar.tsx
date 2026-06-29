import Link from 'next/link';
import type { AuthTab } from './HomePageNavbarData';
import { navLinks } from './HomePageNavbarData';
import { homePageLinks } from './links';
import type { ReactNode } from 'react';

interface HomePageNavbarProps {
  initialAuthTab?: AuthTab;
  activeHref?: string;
}

function SearchIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="m21 21-4.35-4.35m1.35-5.15a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function NavIcon({ icon, active }: { icon: (typeof navLinks)[number]['icon']; active: boolean }) {
  const commonProps = {
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: '2',
  };

  const paths: Record<(typeof navLinks)[number]['icon'], ReactNode> = {
    home: <path {...commonProps} d="m3 11 9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9Z" />,
    briefcase: <path {...commonProps} d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-9 0h12v12H4V7h4Zm0 5h8" />,
    clipboard: <path {...commonProps} d="M9 4h6l1 2h3v15H5V6h3l1-2Zm0 6h6m-6 4h6" />,
    file: <path {...commonProps} d="M6 3h8l4 4v14H6V3Zm8 0v5h5M9 13h6m-6 4h4" />,
    book: <path {...commonProps} d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 1 4 16.5v-11Zm0 11A2.5 2.5 0 0 1 6.5 14H20" />,
    grid: <path {...commonProps} d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" />,
    cap: <path {...commonProps} d="m3 9 9-5 9 5-9 5-9-5Zm4 3v4c0 1.5 2.5 3 5 3s5-1.5 5-3v-4" />,
    award: <path {...commonProps} d="M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm-3 0-1 6 4-2 4 2-1-6" />,
    school: <path {...commonProps} d="m4 10 8-5 8 5-8 5-8-5Zm3 3v4l5 2 5-2v-4" />,
  };

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="relative z-10 h-3.5 w-3.5 shrink-0 transition-all duration-200 group-hover:scale-110 group-hover:rotate-[-4deg]"
      style={
        active
          ? { color: '#ff7043', filter: 'drop-shadow(0 0 4px rgba(230,81,0,0.6))' }
          : { color: 'rgba(255,255,255,0.38)' }
      }
    >
      {paths[icon]}
    </svg>
  );
}

function NavbarActions() {
  return (
    <>
      <div className="hidden items-center gap-2 md:flex">
        <Link
          href={homePageLinks.results}
          className="relative flex h-9 items-center rounded-[9px] border border-white/15 bg-white/10 px-3 text-[12px] font-bold text-white transition-all hover:bg-white/15"
        >
          Alerts
          <span
            className="ml-2 h-2 w-2 rounded-full border border-[#0d1b6e]"
            style={{ background: 'linear-gradient(135deg,#ff5252,#c62828)' }}
            aria-hidden
          />
        </Link>
        <Link
          href="/login"
          className="flex items-center rounded-[10px] border border-[rgba(253,216,53,0.45)] bg-[linear-gradient(135deg,rgba(253,216,53,0.18)_0%,rgba(255,179,0,0.1)_100%)] px-4 py-2 text-[12px] font-bold text-white shadow-[0_2px_12px_rgba(253,216,53,0.1),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all hover:bg-[linear-gradient(135deg,#fdd835_0%,#ffb300_100%)] hover:text-[#0d1b6e]"
        >
          Login / Register
        </Link>
      </div>

      <details className="relative md:hidden">
        <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-[9px] text-white transition-colors hover:bg-white/15 [&::-webkit-details-marker]:hidden">
          <span className="sr-only">Toggle menu</span>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
            <path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
          </svg>
        </summary>
        <div className="fixed left-0 right-0 top-[60px] z-40 border-b bg-white p-3 shadow-xl">
          <form action={homePageLinks.jobs} method="get" className="mb-3 flex items-center rounded-xl border border-gray-200 bg-gray-100 px-3 py-2">
            <SearchIcon className="mr-2 h-3.5 w-3.5 text-gray-400" />
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
              >
                <span className="h-1 w-1 shrink-0 rounded-full bg-orange-400" aria-hidden />
                {label}
              </Link>
            ))}
            <Link
              href="/login"
              className="col-span-2 mt-1 rounded-lg border border-orange-200 px-3 py-2.5 text-center text-[13px] font-bold text-orange-700 transition-colors hover:bg-orange-50"
            >
              Login / Register
            </Link>
          </div>
        </div>
      </details>
    </>
  );
}

export function HomePageNavbar({ initialAuthTab, activeHref }: HomePageNavbarProps) {
  return (
    <header className="sticky top-0 z-50">
      <div
        className="relative z-20 overflow-visible text-white shadow-2xl"
        style={{ background: 'linear-gradient(120deg, #060d2e 0%, #0d1b6e 30%, #1a237e 60%, #0a3880 100%)' }}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full w-64 opacity-20"
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
        </div>

        <div className="relative z-10 mx-auto flex h-15 max-w-6xl items-center justify-between gap-2 px-3 md:gap-3">
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
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="relative z-10" aria-hidden="true">
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
                  Exams
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
                <span className="h-px w-3 bg-linear-to-r from-[#fdd835] to-transparent" />
                <span className="whitespace-nowrap text-[8.5px] font-semibold uppercase tracking-[0.14em] text-blue-200">
                  Sarkari Results · Latest Online Form
                </span>
                <span className="h-px w-3 bg-linear-to-r from-transparent to-[#fdd835]" />
              </div>
            </div>
          </Link>

          <div className="hidden flex-1 items-center justify-end md:flex">
            <form
              action={homePageLinks.jobs}
              method="get"
              className="flex w-56 items-center rounded-[10px] border border-white/15 bg-white/10 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all focus-within:border-white/30"
            >
              <SearchIcon className="mr-2 h-3.5 w-3.5 shrink-0 text-blue-300" />
              <input
                name="search"
                placeholder="Search jobs, results..."
                className="flex-1 bg-transparent text-[12px] text-white outline-none placeholder:text-blue-300/70"
              />
            </form>
          </div>

          <NavbarActions />
        </div>
      </div>

      <div
        className="relative z-10 hidden md:block"
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
          <div className="flex items-center overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden">
            {navLinks.map(({ label, icon, badge, href }, index) => {
              const active = href === activeHref;

              return (
                <Link
                  key={label}
                  href={href}
                  className="group relative flex h-11 items-center gap-1.5 whitespace-nowrap px-3.5 py-0 transition-all duration-200"
                  style={{ fontSize: '11.5px', fontWeight: active ? 700 : 500 }}
                >
                  <span
                    className="absolute inset-x-1 inset-y-1.5 rounded-lg opacity-0 transition-all duration-200 group-hover:opacity-100"
                    style={
                      active
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
                      className="pointer-events-none absolute bottom-3 right-0 top-3 w-px"
                      style={{ background: 'rgba(255,255,255,0.05)' }}
                    />
                  ) : null}
                  <NavIcon icon={icon} active={active} />
                  <span
                    className="relative z-10 transition-colors duration-200 group-hover:text-white"
                    style={
                      active
                        ? { color: '#ffffff', textShadow: '0 0 12px rgba(230,81,0,0.4)' }
                        : { color: 'rgba(255,255,255,0.5)' }
                    }
                  >
                    {label}
                  </span>
                  {badge && (
                    <span
                      className="relative z-10 shrink-0 animate-pulse rounded-full text-white"
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
                      active
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
                  {!active ? (
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
              );
            })}
            <div className="flex-1" />
            <div className="flex h-11 shrink-0 items-center gap-2 border-l border-white/5 px-4">
              <span className="relative flex h-2 w-2 items-center justify-center">
                <span className="absolute h-full w-full animate-ping rounded-full bg-green-400 opacity-40" />
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              </span>
              <span
                className="text-[9.5px] font-bold tracking-widest"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                LIVE
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
