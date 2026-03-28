import Link from 'next/link';
import { HomePageLinkItem, HomePageSectionBox } from '@/app/components/homepage/HomePageSectionBox';
import type { PortalListEntry, StatePageMeta } from '@/app/lib/public-content';
import { PublicPageHeader } from './PublicPageHeader';
import { PublicPanel } from './PublicPanel';

interface PublicStateDetailPageProps {
  admitCardEntries: PortalListEntry[];
  jobEntries: PortalListEntry[];
  resultEntries: PortalListEntry[];
  state: StatePageMeta;
}

export function PublicStateDetailPage({
  admitCardEntries,
  jobEntries,
  resultEntries,
  state,
}: PublicStateDetailPageProps) {
  return (
    <div className="mx-auto max-w-6xl px-3 py-4">
      <PublicPageHeader
        title={state.title}
        eyebrow="State Jobs"
        description={state.description}
        headerColor="bg-[#4e342e]"
        stats={[
          { label: 'State Page', value: 'Active' },
          { label: 'Jobs Stream', value: `${jobEntries.length}` },
          { label: 'Results Stream', value: `${resultEntries.length}` },
          { label: 'Card Stream', value: `${admitCardEntries.length}` },
        ]}
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.65fr_0.95fr]">
        <div className="space-y-4">
          <HomePageSectionBox title="Latest Jobs" headerColor="bg-[#d32f2f]" viewAllLink="/jobs">
            {jobEntries.map((entry) => (
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

          <HomePageSectionBox title="Latest Results" headerColor="bg-[#1565c0]" viewAllLink="/results">
            {resultEntries.map((entry) => (
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

          <HomePageSectionBox title="Admit Cards" headerColor="bg-[#6a1b9a]" viewAllLink="/admit-cards">
            {admitCardEntries.map((entry) => (
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
        </div>

        <div className="space-y-4">
          <PublicPanel title="State Shortcuts" headerColor="bg-[#37474f]">
            <div className="space-y-2 p-4">
              {state.featuredLinks.map((link) => (
                <Link
                  key={`${state.slug}-${link.href}-${link.label}`}
                  href={link.href}
                  className="block rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-[#e65100]"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/states"
                className="block rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-[#e65100]"
              >
                All States
              </Link>
            </div>
          </PublicPanel>

          <PublicPanel title="Coverage Note" headerColor="bg-[#1a237e]">
            <div className="space-y-3 p-4 text-sm leading-7 text-gray-600">
              <p>State pages now stay in the same public shell as the homepage and category hubs.</p>
              <p>Regional users can move from this page to item details without being dropped into a different design system.</p>
            </div>
          </PublicPanel>
        </div>
      </div>
    </div>
  );
}
