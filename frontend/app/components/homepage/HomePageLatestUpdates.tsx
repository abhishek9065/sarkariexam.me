import { ExternalLink, Globe } from 'lucide-react';
import { HomePageLinkItem, HomePageSectionBox } from './HomePageSectionBox';
import { homePageLinks, toOfficialUrl } from './links';
import {
  announcementCategoryMeta,
  announcementItemsBySection,
  buildAnnouncementPath,
  homePageSectionOrder,
} from '@/app/lib/public-content';

const importantLinks = [
  { label: 'UPSC Official Website', url: 'upsc.gov.in', tag: 'Central' },
  { label: 'SSC Official Portal', url: 'ssc.nic.in', tag: 'Central' },
  { label: 'IBPS Online', url: 'ibps.in', tag: 'Banking' },
  { label: 'Indian Railways RRB', url: 'indianrailways.gov.in', tag: 'Railway' },
  { label: 'NTA Exam Portal', url: 'nta.ac.in', tag: 'Exam' },
  { label: 'CBSE Board', url: 'cbse.gov.in', tag: 'Board' },
  { label: 'BPSC Bihar', url: 'bpsc.bih.nic.in', tag: 'State' },
  { label: 'UPPSC Uttar Pradesh', url: 'uppsc.up.nic.in', tag: 'State' },
  { label: 'RPSC Rajasthan', url: 'rpsc.rajasthan.gov.in', tag: 'State' },
  { label: 'MPSC Maharashtra', url: 'mpsc.gov.in', tag: 'State' },
  { label: 'KPSC Karnataka', url: 'kpsc.kar.nic.in', tag: 'State' },
  { label: 'Results.nic.in', url: 'results.nic.in', tag: 'Result' },
] as const;

const tagColor: Record<(typeof importantLinks)[number]['tag'], string> = {
  Central: 'bg-blue-100 text-blue-700',
  Banking: 'bg-green-100 text-green-700',
  Railway: 'bg-orange-100 text-orange-700',
  Exam: 'bg-purple-100 text-purple-700',
  Board: 'bg-teal-100 text-teal-700',
  State: 'bg-amber-100 text-amber-700',
  Result: 'bg-red-100 text-red-700',
};

const sectionIdMap = {
  results: 'latest-results',
  'admit-cards': 'latest-admit-cards',
  jobs: 'latest-jobs',
  'answer-keys': 'answer-key',
  admissions: 'latest-admission',
} as const;

export function HomePageLatestUpdates() {
  return (
    <section className="py-4">
      <div className="mx-auto max-w-6xl px-3">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {homePageSectionOrder.map((section) => {
            const meta = announcementCategoryMeta[section];
            const items = announcementItemsBySection[section];

            return (
              <HomePageSectionBox
                key={section}
                id={sectionIdMap[section]}
                title={meta.listingTitle}
                headerColor={meta.headerColor}
                viewAllLink={meta.canonicalPath}
              >
                {items.map((item) => (
                  <HomePageLinkItem
                    key={`${section}-${item.slug}`}
                    href={buildAnnouncementPath(item)}
                    title={item.title}
                    org={item.org}
                    date={item.date}
                    tag={item.tag}
                    postCount={item.postCount}
                    qualification={item.qualification}
                  />
                ))}
              </HomePageSectionBox>
            );
          })}

          <HomePageSectionBox id="important-links" title="Important Links" headerColor="bg-[#37474f]" viewAllLink={homePageLinks.importantLinks}>
            {importantLinks.map((link) => (
              <a
                key={link.label}
                href={toOfficialUrl(link.url)}
                target="_blank"
                rel="noreferrer"
                className="group flex cursor-pointer items-center justify-between px-4 py-2.5 transition-colors hover:bg-blue-50/60"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Globe size={12} className="shrink-0 text-gray-400 transition-colors group-hover:text-blue-600" />
                  <span className="truncate text-[12px] font-semibold text-gray-800 transition-colors group-hover:text-blue-700">
                    {link.label}
                  </span>
                </div>
                <div className="ml-2 flex shrink-0 items-center gap-1.5">
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${tagColor[link.tag]}`}>{link.tag}</span>
                  <ExternalLink size={10} className="text-gray-300 transition-colors group-hover:text-blue-500" />
                </div>
              </a>
            ))}
          </HomePageSectionBox>

        </div>
      </div>
    </section>
  );
}
