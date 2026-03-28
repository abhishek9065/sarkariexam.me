import Link from 'next/link';
import { HomePageLinkItem, HomePageSectionBox } from '@/app/components/homepage/HomePageSectionBox';
import type { CategoryPageMeta, PortalListEntry, ResourceCard } from '@/app/lib/public-content';
import { PublicPageHeader } from './PublicPageHeader';
import { PublicPanel } from './PublicPanel';

interface PublicCategoryHubPageProps {
  clearHref?: string;
  entries: PortalListEntry[];
  meta: CategoryPageMeta;
  querySummary?: string;
  resourceCards?: ResourceCard[];
}

export function PublicCategoryHubPage({
  clearHref,
  entries,
  meta,
  querySummary,
  resourceCards = [],
}: PublicCategoryHubPageProps) {
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
        <div className="space-y-4">
          {querySummary ? (
            <PublicPanel title="Active Filters" headerColor="bg-[#e65100]">
              <div className="flex flex-col gap-3 p-4 text-sm text-gray-700 sm:flex-row sm:items-center sm:justify-between">
                <p>{querySummary}</p>
                {clearHref ? (
                  <Link
                    href={clearHref}
                    className="inline-flex items-center justify-center rounded-lg border border-orange-200 px-3 py-2 text-sm font-semibold text-[#e65100] transition-colors hover:bg-orange-50"
                  >
                    Clear Filters
                  </Link>
                ) : null}
              </div>
            </PublicPanel>
          ) : null}

          {entries.length > 0 ? (
            <HomePageSectionBox title={meta.listingTitle} headerColor={meta.headerColor} viewAllLink={meta.canonicalPath}>
              {entries.map((entry) => (
                <HomePageLinkItem
                  key={`${entry.href}-${entry.title}`}
                  href={entry.href}
                  title={entry.title}
                  org={entry.org}
                  date={entry.date}
                  tag={entry.tag}
                  postCount={entry.postCount}
                  qualification={entry.qualification}
                />
              ))}
            </HomePageSectionBox>
          ) : querySummary ? (
            <PublicPanel title="No Matching Updates" headerColor="bg-[#37474f]">
              <div className="space-y-3 p-4 text-sm leading-7 text-gray-700">
                <p>No announcements matched the current search or department filter.</p>
                <p>Clear the filters to return to the main browsing list, or try a broader keyword.</p>
              </div>
            </PublicPanel>
          ) : null}

          {resourceCards.length > 0 ? (
            <PublicPanel title="Featured Resources" headerColor="bg-[#283593]">
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                {resourceCards.map((card) => (
                  <Link
                    key={card.label}
                    href={card.href}
                    className="rounded-xl border border-gray-100 px-4 py-4 transition-colors hover:border-orange-200 hover:bg-orange-50/60"
                  >
                    <div className="text-[13px] font-semibold text-gray-800">{card.label}</div>
                    <p className="mt-2 text-[12px] leading-6 text-gray-500">{card.description}</p>
                  </Link>
                ))}
              </div>
            </PublicPanel>
          ) : null}
        </div>

        <div className="space-y-4">
          <PublicPanel title="Quick Access" headerColor="bg-[#37474f]">
            <div className="space-y-2 p-4">
              {meta.quickLinks.map((link) => (
                <Link
                  key={`${meta.slug}-${link.href}-${link.label}`}
                  href={link.href}
                  className="block rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-[#e65100]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </PublicPanel>

          <PublicPanel title="Why This Page Matters" headerColor="bg-[#1a237e]">
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
