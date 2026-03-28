import Link from 'next/link';
import { HomePageLinkItem, HomePageSectionBox } from '@/app/components/homepage/HomePageSectionBox';
import type { AnnouncementSection, CategoryPageMeta, PortalListEntry } from '@/app/lib/public-content';
import { buildAnnouncementCategoryPath, buildJobsPath, buildSearchPath } from '@/app/lib/public-content';
import { PublicPageHeader } from './PublicPageHeader';
import { PublicPanel } from './PublicPanel';

interface SearchGroup {
  entries: PortalListEntry[];
  meta: CategoryPageMeta;
  section: AnnouncementSection;
}

interface PublicSearchPageProps {
  query: string;
  results: SearchGroup[];
}

export function PublicSearchPage({ query, results }: PublicSearchPageProps) {
  const trimmedQuery = query.trim();

  return (
    <div className="mx-auto max-w-6xl px-3 py-4">
      <PublicPageHeader
        title="Search Results"
        eyebrow="Cross Section Search"
        description={
          trimmedQuery
            ? `Browsing public matches for "${trimmedQuery}" across jobs, results, admit cards, answer keys, and admissions.`
            : 'Use the search box to find jobs, results, admit cards, answer keys, and admissions from one page.'
        }
        headerColor="bg-[#1a237e]"
        stats={[
          { label: 'Query', value: trimmedQuery || 'Pending' },
          { label: 'Matched Sections', value: `${results.length}` },
          { label: 'Jobs Search', value: 'Supported' },
          { label: 'Unified Shell', value: 'Active' },
        ]}
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.65fr_0.95fr]">
        <div className="space-y-4">
          <PublicPanel title="Search Input" headerColor="bg-[#e65100]">
            <form action="/search" className="flex flex-col gap-3 p-4 sm:flex-row">
              <input
                type="search"
                name="q"
                defaultValue={trimmedQuery}
                placeholder="Search jobs, results, admit cards..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-orange-300"
              />
              <button
                type="submit"
                className="rounded-lg bg-[#e65100] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Search
              </button>
            </form>
          </PublicPanel>

          {trimmedQuery ? (
            results.length > 0 ? (
              results.map((group) => (
                <HomePageSectionBox
                  key={group.section}
                  title={group.meta.listingTitle}
                  headerColor={group.meta.headerColor}
                  viewAllLink={buildAnnouncementCategoryPath(group.section, { search: trimmedQuery })}
                >
                  {group.entries.slice(0, 8).map((entry) => (
                    <HomePageLinkItem
                      key={`${group.section}-${entry.href}-${entry.title}`}
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
              ))
            ) : (
              <PublicPanel title="No Results Found" headerColor="bg-[#37474f]">
                <div className="space-y-3 p-4 text-sm leading-7 text-gray-700">
                  <p>No public announcements matched &quot;{trimmedQuery}&quot;.</p>
                  <p>Try a broader keyword, or open the jobs feed for the latest default listing.</p>
                </div>
              </PublicPanel>
            )
          ) : (
            <PublicPanel title="Search Tips" headerColor="bg-[#37474f]">
              <div className="space-y-3 p-4 text-sm leading-7 text-gray-700">
                <p>Search by exam name, organization, legacy short slug, or topic keyword.</p>
                <p>Examples: SSC CGL, Railway NTPC, UGC NET, Bihar Police, or admit card.</p>
              </div>
            </PublicPanel>
          )}
        </div>

        <div className="space-y-4">
          <PublicPanel title="Quick Access" headerColor="bg-[#37474f]">
            <div className="space-y-2 p-4">
              <Link
                href={buildJobsPath({ search: trimmedQuery || undefined })}
                className="block rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-[#e65100]"
              >
                Jobs Only Search
              </Link>
              <Link
                href="/results"
                className="block rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-[#e65100]"
              >
                Latest Results
              </Link>
              <Link
                href="/admit-cards"
                className="block rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-[#e65100]"
              >
                Admit Cards
              </Link>
              <Link
                href={buildSearchPath()}
                className="block rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-[#e65100]"
              >
                Reset Search
              </Link>
            </div>
          </PublicPanel>

          <PublicPanel title="Search Behavior" headerColor="bg-[#1a237e]">
            <div className="space-y-3 p-4 text-sm leading-7 text-gray-600">
              <p>Search matches titles, organizations, legacy short slugs, and extra keywords from the public registry.</p>
              <p>Legacy links should redirect to canonical pages, but search still recognizes older terms so users do not dead-end.</p>
            </div>
          </PublicPanel>
        </div>
      </div>
    </div>
  );
}
