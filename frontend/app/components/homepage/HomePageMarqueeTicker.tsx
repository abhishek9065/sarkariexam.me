'use client';

import { Zap } from 'lucide-react';

const updates = [
  'SSC CGL 2026 Notification Out — Apply Before 30 April!',
  'UPSC CSE Prelims 2026 Result Declared!',
  'Railway Group D Admit Card Released',
  'IBPS PO 2026 Online Form Started',
  'NDA 2026 Written Exam Result Out',
  'Bihar Police 21,391 Posts — Apply Now',
  'UPPSC PCS Application Started',
  'SBI Clerk 2026 — 8,773 Vacancies Open',
  'CTET 2026 Registration Begins',
];

export function HomePageMarqueeTicker() {
  return (
    <div className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center">
        <div className="flex shrink-0 items-center gap-1.5 bg-[#e65100] px-2.5 py-2 sm:px-3">
          <Zap size={12} className="fill-yellow-200 text-yellow-200" />
          <span className="whitespace-nowrap text-[10px] font-extrabold tracking-[0.08em] text-white sm:tracking-[0.16em]">
            LIVE UPDATES
          </span>
        </div>
        <div className="h-8 w-px shrink-0 bg-orange-200" />
        <div className="relative flex-1 overflow-hidden">
          <div className="flex whitespace-nowrap py-2 [animation:homepage-marquee_40s_linear_infinite]">
            {[...updates, ...updates].map((update, index) => (
              <span
                key={`${update}-${index}`}
                className="mx-4 cursor-pointer text-[12px] font-semibold text-slate-900 transition-colors hover:text-[#e65100] sm:mx-5"
              >
                {update}
                <span className="mx-4 text-orange-300">◆</span>
              </span>
            ))}
          </div>
        </div>
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
