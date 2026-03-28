import type { ReactNode } from 'react';
import { HomePageFooter } from '@/app/components/homepage/HomePageFooter';
import { HomePageMarqueeTicker } from '@/app/components/homepage/HomePageMarqueeTicker';
import { HomePageNavbar } from '@/app/components/homepage/HomePageNavbar';

export function PublicSiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f0f2f7] text-gray-900 font-[family-name:var(--font-inter)]">
      <HomePageNavbar />
      <HomePageMarqueeTicker />
      <main className="pb-8">{children}</main>
      <HomePageFooter />
    </div>
  );
}
