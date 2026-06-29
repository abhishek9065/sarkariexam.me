import type { ReactNode } from 'react';

import { SafeLink } from '@/app/components/public-site/SafeLink';

interface HomePageSectionBoxProps {
  id?: string;
  title: string;
  headerColor: string;
  children: ReactNode;
  viewAllLink: string;
  accent?: string;
  kicker?: string;
  count?: number;
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

const accentFromClass: Record<string, string> = {
  'bg-[#d32f2f]': '#dc2626',
  'bg-[#1565c0]': '#1d4ed8',
  'bg-[#6a1b9a]': '#7c3aed',
  'bg-[#00695c]': '#0d9488',
  'bg-[#ad1457]': '#be185d',
  'bg-[#283593]': '#3730a3',
  'bg-[#4e342e]': '#78350f',
  'bg-[#1b5e20]': '#166534',
  'bg-[#e65100]': '#ea580c',
  'bg-[#37474f]': '#37474f',
};

const tagConfig: Record<NonNullable<HomePageLinkItemProps['tag']>, { label: string; className: string }> = {
  new: {
    label: 'NEW',
    className: 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white ring-1 ring-emerald-300/40',
  },
  hot: {
    label: 'HOT',
    className: 'bg-gradient-to-r from-red-500 to-rose-600 text-white ring-1 ring-red-300/40',
  },
  update: {
    label: 'UPDATE',
    className: 'bg-gradient-to-r from-sky-500 to-blue-600 text-white ring-1 ring-sky-300/40',
  },
  'last-date': {
    label: 'LAST DATE',
    className: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white ring-1 ring-amber-300/40',
  },
};

const monoPalette: Array<[string, string]> = [
  ['#fee2e2', '#b91c1c'],
  ['#dbeafe', '#1d4ed8'],
  ['#ede9fe', '#6d28d9'],
  ['#dcfce7', '#15803d'],
  ['#fef3c7', '#b45309'],
  ['#ffe4e6', '#be123c'],
  ['#cffafe', '#0e7490'],
  ['#fae8ff', '#a21caf'],
];

function monoColors(org: string): [string, string] {
  let hash = 0;
  for (let index = 0; index < org.length; index += 1) {
    hash = (hash * 31 + org.charCodeAt(index)) >>> 0;
  }
  return monoPalette[hash % monoPalette.length];
}

function initials(org: string): string {
  const parts = org.replace(/[^A-Za-z\s]/g, '').split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return 'SE';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function HomePageSectionBox({
  id,
  title,
  headerColor,
  children,
  viewAllLink,
  accent,
  kicker,
  count,
}: HomePageSectionBoxProps) {
  const hex = accent ?? accentFromClass[headerColor] ?? '#1d4ed8';

  return (
    <div
      id={id}
      className="group/section relative overflow-hidden rounded-2xl border border-gray-200/70 bg-white shadow-sm dark:border-white/10 dark:bg-[#0f172a]"
    >
      <div className="absolute inset-x-0 top-0 z-10 h-0.75" style={{ background: `linear-gradient(90deg, ${hex}, ${hex}cc 60%, transparent)` }} />

      <div className="relative flex items-end justify-between gap-3 border-b border-gray-100 px-4 pb-3 pt-3.5 dark:border-white/10" style={{ background: `linear-gradient(180deg, ${hex}0d 0%, transparent 100%)` }}>
        <div className="pointer-events-none absolute -top-3 right-2 select-none text-[56px] font-black leading-none tracking-normal opacity-[0.06] dark:opacity-[0.09]" style={{ color: hex }}>
          {(kicker ?? title).split(' ')[0]}
        </div>

        <div className="relative z-10 min-w-0">
          {kicker ? (
            <div className="mb-0.5 text-[9.5px] font-extrabold uppercase tracking-[0.16em]" style={{ color: hex }}>
              {kicker}
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <span className="inline-block h-4 w-1 rounded-sm" style={{ background: hex }} />
            <h2 className="truncate text-[14.5px] font-extrabold tracking-normal text-gray-900 dark:text-white">{title}</h2>
            {count !== undefined ? (
              <span className="rounded-md px-1.5 py-0.5 text-[9.5px] font-extrabold tabular-nums" style={{ color: hex, background: `${hex}1a` }}>
                {count}
              </span>
            ) : null}
          </div>
        </div>

        <SafeLink
          href={viewAllLink}
          aria-label={`View all ${title}`}
          className="relative z-10 inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold tracking-[0.04em] transition-colors"
          style={{ color: hex, background: `${hex}14` }}
        >
          VIEW ALL <span aria-hidden>›</span>
        </SafeLink>
      </div>

      <div className="divide-y divide-gray-100/80 dark:divide-white/5">{children}</div>
    </div>
  );
}

export function HomePageLinkItem({ href, title, org, date, tag, postCount, qualification }: HomePageLinkItemProps) {
  const tagStyle = tag ? tagConfig[tag] : null;
  const [bg, fg] = monoColors(org);

  return (
    <div className="group/item relative flex items-start gap-3 px-3.5 py-2.5 transition-colors hover:bg-linear-to-r hover:from-orange-50/60 hover:to-transparent dark:hover:from-orange-500/6">
      <span className="absolute bottom-2 left-0 top-2 w-0.5 rounded-r bg-linear-to-b from-orange-400 to-orange-500 opacity-0 transition-opacity group-hover/item:opacity-100" />

      <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg shadow-sm ring-1 ring-black/5 dark:ring-white/10" style={{ background: bg, color: fg }} aria-hidden>
        <span className="text-[11px] font-extrabold tracking-normal">{initials(org)}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start gap-1.5">
          <SafeLink
            href={href}
            className="text-[13px] font-semibold leading-snug text-gray-800 transition-colors hover:text-[#c2410c] hover:underline hover:decoration-orange-300 hover:underline-offset-2 dark:text-gray-100 dark:hover:text-orange-300"
          >
            {title}
          </SafeLink>
          {tagStyle ? (
            <span className={`inline-flex shrink-0 rounded-md px-1.5 py-0.5 text-[8.5px] font-extrabold tracking-wider shadow-sm ${tagStyle.className}`}>
              {tagStyle.label}
            </span>
          ) : null}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="max-w-45 truncate text-[11px] font-medium text-gray-700 dark:text-gray-300">{org}</span>
          {postCount ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10.5px] font-bold tabular-nums text-gray-600 dark:bg-white/5 dark:text-gray-300">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-55" aria-hidden />
              {postCount}
            </span>
          ) : null}
          {qualification ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10.5px] font-bold text-gray-600 dark:bg-white/5 dark:text-gray-300">
              <span className="text-[9px] font-black leading-none opacity-65" aria-hidden>
                Q
              </span>
              {qualification}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-0.5 flex shrink-0 flex-col items-end gap-0.5">
        <span className="inline-flex items-center gap-1 whitespace-nowrap text-[10.5px] font-bold tracking-[0.02em] text-gray-700 transition-colors group-hover/item:text-orange-600 dark:text-gray-300 dark:group-hover/item:text-orange-300">
          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-55" aria-hidden />
          {date}
        </span>
        <SafeLink
          href={href}
          aria-label={`Open ${title}`}
          className="rounded-md px-1.5 py-0.5 text-[12px] font-extrabold leading-none text-gray-500 opacity-0 transition-[background-color,color,opacity,transform] hover:bg-orange-50 hover:text-orange-600 group-hover/item:translate-x-0 group-hover/item:translate-y-0 group-hover/item:opacity-100 dark:text-gray-300 dark:hover:bg-orange-500/10 dark:hover:text-orange-300"
        >
          <span aria-hidden>↗</span>
        </SafeLink>
      </div>
    </div>
  );
}
