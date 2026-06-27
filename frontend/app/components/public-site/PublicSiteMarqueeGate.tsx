'use client';

import { usePathname } from 'next/navigation';

import { HomePageMarqueeTicker } from '@/app/components/homepage/HomePageMarqueeTicker';

const detailRoutePattern = /^\/(jobs|results|admit-cards|answer-keys|admissions)\/[^/]+$/;

export function PublicSiteMarqueeGate() {
  const pathname = usePathname();
  const isDetailRoute = detailRoutePattern.test(pathname);

  return isDetailRoute ? null : <HomePageMarqueeTicker />;
}
