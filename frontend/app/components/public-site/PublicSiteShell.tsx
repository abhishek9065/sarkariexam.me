import type { ReactNode } from 'react';
import { HomePageFooter } from '@/app/components/homepage/HomePageFooter';
import { HomePageNavbar } from '@/app/components/homepage/HomePageNavbar';

type AuthTab = 'login' | 'register';

interface PublicSiteShellProps {
  children: ReactNode;
  initialAuthTab?: AuthTab;
  activeHref?: string;
}

const maintenanceEnabled =
  process.env.NEXT_PUBLIC_SITE_MAINTENANCE_MODE === 'true' ||
  process.env.SITE_MAINTENANCE_MODE === 'true';

export function PublicSiteShell({ children, initialAuthTab, activeHref }: PublicSiteShellProps) {
  if (maintenanceEnabled) {
    return (
      <div className="min-h-screen bg-slate-950 px-6 py-16 text-white">
        <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-sm">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">
            Maintenance
          </p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            SarkariExams.me is temporarily offline
          </h1>
          <p className="mt-4 text-base text-slate-200">
            The public website is currently unavailable while maintenance work is underway.
            Please check back later.
          </p>
          <div className="mt-8 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
            Admin access remains available separately from the public site.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f2f7] text-gray-900 font-[family-name:var(--font-inter)] dark:bg-[#070819]">
      <HomePageNavbar initialAuthTab={initialAuthTab} activeHref={activeHref} />
      <main className="pb-8">{children}</main>
      <HomePageFooter />
    </div>
  );
}
