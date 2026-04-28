import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { SafeLink } from '@/app/components/public-site/SafeLink';

interface HomePageSectionBoxProps {
  id?: string;
  title: string;
  headerColor: string;
  children: ReactNode;
  viewAllLink: string;
}

interface HomePageLinkItemProps {
  href: string;
  title: string;
  org: string;
  date: string;
  tag?: 'new' | 'hot' | 'update' | 'last-date';
  postCount?: string;
  qualification?: string;
}

const tagStyles: Record<NonNullable<HomePageLinkItemProps['tag']>, { bg: string; text: string; border: string; label: string }> = {
  new: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', label: 'NEW' },
  hot: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', label: 'HOT' },
  update: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'UPDATE' },
  'last-date': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'LAST DATE' },
};

export function HomePageSectionBox({ id, title, headerColor, children, viewAllLink }: HomePageSectionBoxProps) {
  return (
    <div id={id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className={`${headerColor} flex items-center justify-between gap-3 px-4 py-3`}>
        <h2 className="flex min-w-0 items-center gap-2 text-white">
          <span className="h-4 w-1 rounded-full bg-white/50" />
          <span className="truncate text-[12px] font-bold uppercase tracking-[0.08em]">{title}</span>
        </h2>
        <SafeLink
          href={viewAllLink}
          className="flex shrink-0 items-center gap-0.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/80 transition-all hover:bg-white/20 hover:text-white"
        >
          View All <ChevronRight size={11} />
        </SafeLink>
      </div>
      <div className="divide-y divide-gray-100">{children}</div>
    </div>
  );
}

export function HomePageLinkItem({ href, title, org, date, tag, postCount, qualification }: HomePageLinkItemProps) {
  const tagStyle = tag ? tagStyles[tag] : null;

  return (
    <SafeLink
      href={href}
      className="group flex cursor-pointer items-start gap-2.5 px-4 py-3 transition-colors hover:bg-orange-50/60"
    >
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400 transition-transform group-hover:scale-125" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="leading-snug text-[13px] font-semibold text-gray-800 transition-colors group-hover:text-[#e65100]">
            {title}
          </span>
          {tagStyle && (
            <span
              className={`${tagStyle.bg} ${tagStyle.text} ${tagStyle.border} rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-[0.02em]`}
            >
              {tagStyle.label}
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-400">
          <span className="max-w-[12rem] truncate">{org}</span>
          {postCount && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
              {postCount} Posts
            </span>
          )}
          {qualification && (
            <span className="inline-flex items-center rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
              {qualification}
            </span>
          )}
        </div>
      </div>
      <span className="mt-0.5 shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500 transition-colors group-hover:bg-orange-100 group-hover:text-orange-500">
        {date}
      </span>
    </SafeLink>
  );
}
