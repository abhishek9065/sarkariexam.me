import type { ReactNode } from 'react';
import { HomePageFooter } from '@/app/components/homepage/HomePageFooter';
import { HomePageNavbar } from '@/app/components/homepage/HomePageNavbar';

type AuthTab = 'login' | 'register';

interface PublicSiteShellProps {
  children: ReactNode;
  initialAuthTab?: AuthTab;
  activeHref?: string;
}

export function PublicSiteShell({ children, initialAuthTab, activeHref }: PublicSiteShellProps) {
  return (
    <div className="min-h-screen bg-[#f0f2f7] text-gray-900 font-[family-name:var(--font-inter)] dark:bg-[#070819]">
      <HomePageNavbar initialAuthTab={initialAuthTab} activeHref={activeHref} />
      <main className="pb-8">{children}</main>
      <HomePageFooter />
    </div>
  );
}
