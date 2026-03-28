import Link from 'next/link';
import { HomePageLinkItem, HomePageSectionBox } from '@/app/components/homepage/HomePageSectionBox';
import type { AnnouncementItem, CategoryPageMeta, PortalListEntry } from '@/app/lib/public-content';
import { PublicPageHeader } from './PublicPageHeader';
import { PublicPanel } from './PublicPanel';

interface PublicAnnouncementDetailPageProps {
  item: AnnouncementItem;
  meta: CategoryPageMeta;
  relatedEntries: PortalListEntry[];
}

export function PublicAnnouncementDetailPage({
  item,
  meta,
  relatedEntries,
}: PublicAnnouncementDetailPageProps) {
  return (
    <div className="mx-auto max-w-6xl px-3 py-4">
      <PublicPageHeader
        title={item.title}
        eyebrow={meta.eyebrow}
        description={item.summary}
        headerColor={meta.headerColor}
        stats={[
          { label: 'Category', value: meta.title },
          { label: 'Organization', value: item.org },
          { label: 'Updated', value: item.date },
          { label: 'Tag', value: item.tag ? item.tag.toUpperCase() : 'ACTIVE' },
        ]}
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.65fr_0.95fr]">
        <div className="space-y-4">
          <PublicPanel title="Short Information" headerColor={meta.headerColor}>
            <div className="divide-y divide-gray-100">
              <div className="grid gap-3 px-4 py-3 md:grid-cols-[220px_1fr]">
                <div className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#B91C1C]">Headline</div>
                <div className="text-sm font-semibold text-gray-800">{item.headline}</div>
              </div>
              <div className="grid gap-3 px-4 py-3 md:grid-cols-[220px_1fr]">
                <div className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#B91C1C]">Update Note</div>
                <div className="text-sm leading-7 text-gray-700">{item.shortInfo}</div>
              </div>
              <div className="grid gap-3 px-4 py-3 md:grid-cols-[220px_1fr]">
                <div className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#B91C1C]">Summary</div>
                <div className="text-sm leading-7 text-gray-700">{item.summary}</div>
              </div>
            </div>
          </PublicPanel>

          <div className="grid gap-4 md:grid-cols-2">
            <PublicPanel title="Important Dates" headerColor="bg-[#283593]">
              <ul className="space-y-3 p-4 text-sm leading-7 text-gray-700">
                <li className="font-semibold text-gray-800">Homepage listing updated on {item.date}.</li>
                <li>Readers should cross-check official notices linked from the relevant category page.</li>
                <li>This entry now has a dedicated detail route in the same public shell.</li>
              </ul>
            </PublicPanel>

            <PublicPanel title="Key Points" headerColor="bg-[#37474f]">
              <div className="space-y-3 p-4 text-sm leading-7 text-gray-700">
                {item.keyPoints.map((point) => (
                  <div key={point} className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                    <p>{point}</p>
                  </div>
                ))}
              </div>
            </PublicPanel>
          </div>
        </div>

        <div className="space-y-4">
          <PublicPanel title="Useful Links" headerColor="bg-[#37474f]">
            <div className="space-y-2 p-4">
              {item.usefulLinks.map((link) => (
                <Link
                  key={`${item.slug}-${link.href}-${link.label}`}
                  href={link.href}
                  className="block rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-[#e65100]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </PublicPanel>

          <HomePageSectionBox
            title={`More In ${meta.title}`}
            headerColor="bg-[#1a237e]"
            viewAllLink={meta.canonicalPath}
          >
            {relatedEntries.map((entry) => (
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
      </div>
    </div>
  );
}
