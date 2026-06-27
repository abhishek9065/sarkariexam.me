import type { ReactNode } from 'react';
import { HomePageFooter } from '@/app/components/homepage/HomePageFooter';
import { HomePageNavbar } from '@/app/components/homepage/HomePageNavbar';
import { PublicSiteMarqueeGate } from '@/app/components/public-site/PublicSiteMarqueeGate';

type AuthTab = 'login' | 'register';

interface PublicSiteShellProps {
  children: ReactNode;
  initialAuthTab?: AuthTab;
}

export function PublicSiteShell({ children, initialAuthTab }: PublicSiteShellProps) {
  return (
    <div className="min-h-screen bg-[#f0f2f7] text-gray-900 font-[family-name:var(--font-inter)] dark:bg-[#070819]">
      <HomePageNavbar initialAuthTab={initialAuthTab} />
      <PublicSiteMarqueeGate />
      <main className="pb-8">{children}</main>
      <HomePageFooter />
    </div>
  );
}
