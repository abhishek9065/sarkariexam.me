import {
  Calendar,
  ClipboardList,
  ExternalLink,
  FileText,
  GraduationCap,
  IndianRupee,
  Link2,
  Newspaper,
  Shield,
  Table2,
  UserCheck,
} from 'lucide-react';
import Link from 'next/link';
import { HomePageLinkItem, HomePageSectionBox } from '@/app/components/homepage/HomePageSectionBox';
import type { AnnouncementItem, CategoryPageMeta, PortalListEntry } from '@/app/lib/public-content';
import { DetailClientActions } from './detail/DetailClientActions';
import { DetailImportantLinksGrid } from './detail/DetailImportantLinksGrid';
import { DetailKeyValueGrid } from './detail/DetailKeyValueGrid';
import { DetailNoticeBox } from './detail/DetailNoticeBox';
import { DetailSectionCard } from './detail/DetailSectionCard';
import { DetailSidebarCard } from './detail/DetailSidebarCard';
import { DetailStickyNav } from './detail/DetailStickyNav';
import { DetailSubscribeCard } from './detail/DetailSubscribeCard';
import { DetailTableSection } from './detail/DetailTableSection';

interface PublicAnnouncementDetailPageProps {
  item: AnnouncementItem;
  meta: CategoryPageMeta;
  relatedEntries: PortalListEntry[];
}

const detailThemeBySection = {
  jobs: {
    accent: '#e65100',
    accentSoft: 'bg-orange-50 text-[#e65100] border-orange-200',
    gradient: 'linear-gradient(135deg, #1a237e 0%, #283593 50%, #bf360c 100%)',
  },
  results: {
    accent: '#1565c0',
    accentSoft: 'bg-blue-50 text-[#1565c0] border-blue-200',
    gradient: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 45%, #283593 100%)',
  },
  'admit-cards': {
    accent: '#6a1b9a',
    accentSoft: 'bg-purple-50 text-[#6a1b9a] border-purple-200',
    gradient: 'linear-gradient(135deg, #311b92 0%, #6a1b9a 50%, #283593 100%)',
  },
  'answer-keys': {
    accent: '#00695c',
    accentSoft: 'bg-teal-50 text-[#00695c] border-teal-200',
    gradient: 'linear-gradient(135deg, #004d40 0%, #00695c 50%, #1565c0 100%)',
  },
  admissions: {
    accent: '#ad1457',
    accentSoft: 'bg-pink-50 text-[#ad1457] border-pink-200',
    gradient: 'linear-gradient(135deg, #880e4f 0%, #ad1457 50%, #6a1b9a 100%)',
  },
} as const;

export function PublicAnnouncementDetailPage({
  item,
  meta,
  relatedEntries,
}: PublicAnnouncementDetailPageProps) {
  const theme = detailThemeBySection[item.section];
  const detail = item.detail;
  const navItems = [
    { href: '#short-information', label: 'Short Info' },
    { href: '#overview', label: 'Overview' },
    detail.importantDates.length ? { href: '#important-dates', label: 'Dates' } : null,
    detail.applicationFee ? { href: '#application-fee', label: 'Fee' } : null,
    detail.ageLimit ? { href: '#age-limit', label: 'Age Limit' } : null,
    detail.eligibility.length ? { href: '#eligibility', label: 'Eligibility' } : null,
    detail.vacancyTable?.rows.length ? { href: '#vacancy-details', label: 'Vacancy' } : null,
    detail.selectionProcess?.length ? { href: '#selection-process', label: 'Selection' } : null,
    detail.howToApply?.length ? { href: '#how-to-apply', label: 'How To Apply' } : null,
    detail.importantLinks.length ? { href: '#important-links', label: 'Links' } : null,
    detail.sourceNote ? { href: '#source-note', label: 'Disclaimer' } : null,
  ].filter((itemLink): itemLink is { href: string; label: string } => Boolean(itemLink));

  return (
    <div className="mx-auto max-w-6xl px-3 py-4">
      <section
        className="overflow-hidden rounded-[28px] text-white shadow-2xl"
        style={{ background: theme.gradient }}
      >
        <div className="border-b border-white/10 px-5 py-3 text-[11px] font-semibold tracking-[0.14em] text-white/75">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 uppercase">
            <Link href="/" className="transition-opacity hover:opacity-100">
              Homepage
            </Link>
            <span>/</span>
            <Link href={meta.canonicalPath} className="transition-opacity hover:opacity-100">
              {meta.title}
            </Link>
            <span>/</span>
            <span className="text-white/90">{item.org}</span>
          </div>
        </div>

        <div className="px-5 py-6 md:px-6 md:py-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
                {detail.eyebrow}
              </p>
              <h1 className="mt-2 text-3xl font-black leading-tight md:text-[40px]">
                {item.title}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white/80">
                <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1">
                  {meta.title}
                </span>
                <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1">
                  {item.org}
                </span>
                {item.tag ? (
                  <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1">
                    {item.tag.toUpperCase()}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-1">
                  <Calendar size={12} />
                  Updated {item.date}
                </span>
              </div>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/85">{item.summary}</p>
            </div>

            <DetailClientActions title={item.title} />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {detail.heroStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm"
              >
                <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/70">
                  {stat.label}
                </div>
                <div className="mt-1 text-lg font-extrabold text-white">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-4 space-y-4">
        <DetailStickyNav items={navItems} />

        <div className="grid gap-4 lg:grid-cols-[1.7fr_0.92fr]">
          <div className="space-y-4">
            {detail.notice ? <DetailNoticeBox notice={detail.notice} /> : null}

            <div id="short-information" className="scroll-mt-[140px]">
              <DetailSectionCard title="Short Information" eyebrow={meta.eyebrow} icon={<ClipboardList size={16} />}>
                <DetailKeyValueGrid
                  rows={[
                    { label: 'Headline', value: item.headline },
                    { label: 'Update Note', value: item.shortInfo },
                    { label: 'Summary', value: item.summary },
                  ]}
                />
              </DetailSectionCard>
            </div>

            <div id="overview" className="scroll-mt-[140px]">
              <DetailSectionCard title={detail.overviewTitle ?? 'Overview'} icon={<FileText size={16} />}>
                <div className="space-y-4 px-5 py-4 text-sm leading-7 text-gray-700">
                  <p>{item.summary}</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {item.keyPoints.map((point) => (
                      <div
                        key={point}
                        className="flex items-start gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3"
                      >
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                        <p>{point}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </DetailSectionCard>
            </div>

            {detail.importantDates.length ? (
              <div id="important-dates" className="scroll-mt-[140px]">
                <DetailSectionCard title="Important Dates" icon={<Calendar size={16} />}>
                  <div className="divide-y divide-gray-100">
                    {detail.importantDates.map((row) => (
                      <div
                        key={`${row.label}-${row.date}`}
                        className="grid gap-2 px-5 py-3 sm:grid-cols-[1.3fr_1fr]"
                      >
                        <div className="text-sm font-semibold text-gray-800">{row.label}</div>
                        <div className="text-sm font-bold text-[#bf360c] sm:text-right">{row.date}</div>
                      </div>
                    ))}
                  </div>
                </DetailSectionCard>
              </div>
            ) : null}

            {detail.applicationFee ? (
              <div id="application-fee" className="scroll-mt-[140px]">
                <DetailSectionCard
                  title={detail.applicationFee.title ?? 'Application Fee'}
                  icon={<IndianRupee size={16} />}
                >
                  <DetailKeyValueGrid rows={detail.applicationFee.rows} />
                  {detail.applicationFee.note ? (
                    <div className="border-t border-gray-100 px-5 py-3 text-[12px] leading-6 text-gray-500">
                      {detail.applicationFee.note}
                    </div>
                  ) : null}
                </DetailSectionCard>
              </div>
            ) : null}

            {detail.ageLimit ? (
              <div id="age-limit" className="scroll-mt-[140px]">
                <DetailSectionCard title="Age Limit" icon={<Shield size={16} />}>
                  <div className="space-y-3 px-5 py-4 text-sm leading-7 text-gray-700">
                    <p className="font-semibold text-gray-800">{detail.ageLimit.summary}</p>
                    {detail.ageLimit.points.map((point) => (
                      <div key={point} className="flex items-start gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                        <p>{point}</p>
                      </div>
                    ))}
                  </div>
                </DetailSectionCard>
              </div>
            ) : null}

            {detail.eligibility.length ? (
              <div id="eligibility" className="scroll-mt-[140px]">
                <DetailSectionCard title="Eligibility Details" icon={<GraduationCap size={16} />}>
                  <div className="grid gap-3 px-5 py-4 md:grid-cols-2">
                    {detail.eligibility.map((block) => (
                      <div
                        key={block.title}
                        className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
                      >
                        <h3 className="text-[13px] font-extrabold text-gray-800">{block.title}</h3>
                        <p className="mt-2 text-sm leading-7 text-gray-700">{block.description}</p>
                      </div>
                    ))}
                  </div>
                </DetailSectionCard>
              </div>
            ) : null}

            {detail.vacancyTable?.rows.length ? (
              <div id="vacancy-details" className="scroll-mt-[140px]">
                <DetailSectionCard title="Vacancy / Post Details" icon={<Table2 size={16} />}>
                  <DetailTableSection table={detail.vacancyTable} />
                </DetailSectionCard>
              </div>
            ) : null}

            {detail.selectionProcess?.length ? (
              <div id="selection-process" className="scroll-mt-[140px]">
                <DetailSectionCard title="Selection Process" icon={<UserCheck size={16} />}>
                  <div className="space-y-3 px-5 py-4">
                    {detail.selectionProcess.map((step, index) => (
                      <div
                        key={step}
                        className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
                      >
                        <span
                          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${theme.accentSoft}`}
                        >
                          {index + 1}
                        </span>
                        <p className="text-sm leading-7 text-gray-700">{step}</p>
                      </div>
                    ))}
                  </div>
                </DetailSectionCard>
              </div>
            ) : null}

            {detail.howToApply?.length ? (
              <div id="how-to-apply" className="scroll-mt-[140px]">
                <DetailSectionCard title="How To Apply / Use This Update" icon={<Newspaper size={16} />}>
                  <div className="space-y-3 px-5 py-4">
                    {detail.howToApply.map((step, index) => (
                      <div key={step} className="flex items-start gap-3">
                        <span
                          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1a237e] text-[11px] font-bold text-white"
                        >
                          {index + 1}
                        </span>
                        <p className="text-sm leading-7 text-gray-700">{step}</p>
                      </div>
                    ))}
                  </div>
                </DetailSectionCard>
              </div>
            ) : null}

            {detail.importantLinks.length ? (
              <div id="important-links" className="scroll-mt-[140px]">
                <DetailSectionCard title="Important Links" icon={<Link2 size={16} />}>
                  <DetailImportantLinksGrid links={detail.importantLinks} />
                </DetailSectionCard>
              </div>
            ) : null}

            {detail.sourceNote ? (
              <div id="source-note" className="scroll-mt-[140px]">
                <DetailSectionCard title="Important Disclaimer / Source Note" icon={<Shield size={16} />}>
                  <div className="px-5 py-4 text-sm leading-7 text-gray-700">{detail.sourceNote}</div>
                </DetailSectionCard>
              </div>
            ) : null}
          </div>

          <div className="space-y-4 lg:sticky lg:top-[140px] lg:self-start">
            {detail.cta ? (
              <div
                className="overflow-hidden rounded-2xl text-white shadow-lg"
                style={{ background: theme.gradient }}
              >
                <div className="p-5">
                  <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/75">
                    Quick Action
                  </div>
                  <h3 className="mt-3 text-xl font-black">{detail.cta.primaryLabel}</h3>
                  <p className="mt-2 text-sm leading-7 text-white/80">{item.shortInfo}</p>
                  <div className="mt-4 space-y-2">
                    <Link
                      href={detail.cta.primaryHref}
                      className="flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#e65100,#bf360c)] px-4 py-3 text-sm font-bold text-white"
                    >
                      {detail.cta.primaryLabel}
                      <ExternalLink size={15} />
                    </Link>
                    {detail.cta.secondaryHref && detail.cta.secondaryLabel ? (
                      <Link
                        href={detail.cta.secondaryHref}
                        className="flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15"
                      >
                        {detail.cta.secondaryLabel}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {detail.importantDates.length ? (
              <DetailSidebarCard title="Important Dates">
                <div className="divide-y divide-gray-100">
                  {detail.importantDates.slice(0, 5).map((row) => (
                    <div key={`${row.label}-${row.date}`} className="grid gap-1 px-4 py-3">
                      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">
                        {row.label}
                      </div>
                      <div className="text-sm font-bold text-[#bf360c]">{row.date}</div>
                    </div>
                  ))}
                </div>
              </DetailSidebarCard>
            ) : null}

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

            <DetailSubscribeCard prompt={detail.subscribePrompt} />

            {detail.sourceNote ? (
              <DetailSidebarCard title="Portal Note">
                <div className="space-y-2 p-4 text-sm leading-7 text-gray-600">
                  <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700">
                    Verify Before Action
                  </div>
                  <p>{detail.sourceNote}</p>
                </div>
              </DetailSidebarCard>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
