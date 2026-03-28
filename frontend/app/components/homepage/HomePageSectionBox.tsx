import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

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

function isExternalLink(href: string) {
  return href.startsWith('http://') || href.startsWith('https://');
}

function SmartLink({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: ReactNode;
}) {
  if (isExternalLink(href)) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function HomePageSectionBox({ id, title, headerColor, children, viewAllLink }: HomePageSectionBoxProps) {
  return (
    <div id={id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className={`${headerColor} flex items-center justify-between px-4 py-2.5`}>
        <h2 className="flex items-center gap-2 text-white">
          <span className="h-4 w-1 rounded-full bg-white/50" />
          <span className="text-[12px] font-bold uppercase tracking-wide">{title}</span>
        </h2>
        <SmartLink
          href={viewAllLink}
          className="flex items-center gap-0.5 rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/75 transition-all hover:bg-white/20 hover:text-white"
        >
          View All <ChevronRight size={11} />
        </SmartLink>
      </div>
      <div className="divide-y divide-gray-100">{children}</div>
    </div>
  );
}

export function HomePageLinkItem({ href, title, org, date, tag, postCount, qualification }: HomePageLinkItemProps) {
  const tagStyle = tag ? tagStyles[tag] : null;

  return (
    <SmartLink
      href={href}
      className="group flex cursor-pointer items-start gap-2.5 px-4 py-2.5 transition-colors hover:bg-orange-50/60"
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
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0 text-[11px] text-gray-400">
          <span>{org}</span>
          {postCount && (
            <span className="flex items-center gap-1">
              <span className="text-gray-300">·</span>
              {postCount} Posts
            </span>
          )}
          {qualification && (
            <span className="flex items-center gap-1">
              <span className="text-gray-300">·</span>
              {qualification}
            </span>
          )}
        </div>
      </div>
      <span className="mt-0.5 shrink-0 text-[11px] text-gray-400 transition-colors group-hover:text-orange-400">
        {date}
      </span>
    </SmartLink>
  );
}
