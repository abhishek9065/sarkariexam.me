import Link from 'next/link';
import type { CategoryPageMeta } from '@/app/lib/public-content';
import { PublicPageHeader } from './PublicPageHeader';
import { PublicPanel } from './PublicPanel';

interface StateDirectoryEntry {
  count: number;
  description: string;
  slug: string;
  title: string;
}

interface PublicStateDirectoryPageProps {
  entries: StateDirectoryEntry[];
  meta: CategoryPageMeta;
}

export function PublicStateDirectoryPage({
  entries,
  meta,
}: PublicStateDirectoryPageProps) {
  return (
    <div className="mx-auto max-w-6xl px-3 py-4">
      <PublicPageHeader
        title={meta.title}
        eyebrow={meta.eyebrow}
        description={meta.description}
        headerColor={meta.headerColor}
        stats={meta.stats}
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.65fr_0.95fr]">
        <PublicPanel title="Browse States" headerColor={meta.headerColor}>
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {entries.map((entry) => (
              <Link
                key={entry.slug}
                href={`/states/${entry.slug}`}
                className="rounded-xl border border-gray-100 px-4 py-4 transition-colors hover:border-orange-200 hover:bg-orange-50/60"
              >
                <div className="text-[13px] font-semibold text-gray-800">{entry.title}</div>
                <p className="mt-2 text-[12px] leading-6 text-gray-500">{entry.description}</p>
                <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#e65100]">
                  {entry.count} linked job updates
                </div>
              </Link>
            ))}
          </div>
        </PublicPanel>

        <div className="space-y-4">
          <PublicPanel title="Quick Access" headerColor="bg-[#37474f]">
            <div className="space-y-2 p-4">
              {meta.quickLinks.map((link) => (
                <Link
                  key={`${link.href}-${link.label}`}
                  href={link.href}
                  className="block rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-[#e65100]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </PublicPanel>

          <PublicPanel title="State Coverage" headerColor="bg-[#1a237e]">
            <div className="space-y-3 p-4 text-sm leading-7 text-gray-600">
              {meta.highlights.map((highlight) => (
                <div key={highlight} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                  <p>{highlight}</p>
                </div>
              ))}
            </div>
          </PublicPanel>
        </div>
      </div>
    </div>
  );
}
