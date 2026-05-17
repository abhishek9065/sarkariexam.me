'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { homePageLinks } from './links';

const updates = [
  'SSC CGL 2026 Notification Out - Apply Before 30 May!',
  'UPSC CSE Prelims 2026 Admit Card Released',
  'Railway Group D Admit Card Released - 32,000 Posts',
  'IBPS PO 2026 Online Form Started - 4,500 Vacancies',
  'NDA 2026 Written Exam Result Out',
  'Bihar Police 21,391 Posts - Apply Now',
  'UPPSC PCS 2026 Application Started',
  'SBI Clerk 2026 - 8,773 Vacancies Open',
  'CTET 2026 Registration Begins',
  'MP Police Constable 2026 - 7,090 Posts',
];

export function HomePageMarqueeTicker() {
  return (
    <div className="overflow-hidden border-b border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0d1321]">
      <div className="mx-auto flex h-9 max-w-6xl items-center">
        <div className="flex self-stretch shrink-0 items-center gap-1.5 bg-[linear-gradient(135deg,#e65100,#bf360c)] px-3">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-300 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-200" />
          </span>
          <span className="whitespace-nowrap text-[9.5px] font-extrabold tracking-[0.12em] text-white">LIVE</span>
        </div>

        <div className="relative flex-1 overflow-hidden">
          <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-8 bg-gradient-to-r from-white to-transparent dark:from-[#0d1321]" />
          <div className="flex h-9 animate-[homepage-marquee_45s_linear_infinite] items-center whitespace-nowrap">
            {[...updates, ...updates].map((update, index) => (
              <Link
                key={`${update}-${index}`}
                href={homePageLinks.jobs}
                className="inline-flex items-center gap-1 px-5 text-[12.5px] font-medium text-gray-600 transition-colors hover:text-[#e65100] dark:text-gray-300 dark:hover:text-orange-400"
              >
                {update}
                <span className="mx-1 text-[8px] text-orange-200 dark:text-orange-800">◆</span>
              </Link>
            ))}
          </div>
          <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-8 bg-gradient-to-l from-white to-transparent dark:from-[#0d1321]" />
        </div>

        <Link
          href={homePageLinks.jobs}
          className="hidden self-stretch shrink-0 items-center gap-0.5 border-l border-gray-100 px-3 text-[11px] font-bold tracking-normal text-orange-600 transition hover:bg-orange-50 dark:border-white/10 dark:text-orange-400 dark:hover:bg-orange-950/30 sm:flex"
        >
          All Updates <ChevronRight size={11} />
        </Link>
      </div>
      <style jsx>{`
        @keyframes homepage-marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
