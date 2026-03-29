'use client';

import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Bell,
  Bookmark,
  BookmarkCheck,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  GraduationCap,
  Home,
  IndianRupee,
  Info,
  Link2,
  MapPin,
  MessageSquare,
  Newspaper,
  Printer,
  Send,
  Share2,
  Shield,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { HomePageLinkItem, HomePageSectionBox } from '@/app/components/homepage/HomePageSectionBox';
import type {
  AnnouncementItem,
  CategoryPageMeta,
  DetailDateRow,
  DetailImportantLink,
  PortalListEntry,
} from '@/app/lib/public-content';
import { buildCommunityPath } from '@/app/lib/public-content';
import { cn } from '@/lib/utils';

interface PublicAnnouncementDetailPageProps {
  item: AnnouncementItem;
  meta: CategoryPageMeta;
  relatedEntries: PortalListEntry[];
}

interface DetailTheme {
  accent: string;
  accentSoft: string;
  activePill: string;
  bullet: string;
  gradient: string;
  sidebarGradient: string;
  surfaceGlow: string;
}

interface NavSection {
  id: string;
  icon: typeof Info;
  label: string;
}

interface FaqItem {
  answer: string;
  id: string;
  question: string;
}

const detailThemeBySection: Record<AnnouncementItem['section'], DetailTheme> = {
  jobs: {
    accent: '#e65100',
    accentSoft: 'border-orange-200 bg-orange-50 text-[#e65100]',
    activePill: 'border-orange-200 bg-orange-50 text-[#bf360c]',
    bullet: 'bg-orange-500',
    gradient: 'linear-gradient(145deg, #08103a 0%, #1a237e 42%, #1565c0 74%, #e65100 100%)',
    sidebarGradient: 'linear-gradient(145deg, #1a237e 0%, #283593 48%, #bf360c 100%)',
    surfaceGlow: 'from-[#fff8f5] to-white',
  },
  results: {
    accent: '#c62828',
    accentSoft: 'border-red-200 bg-red-50 text-[#c62828]',
    activePill: 'border-red-200 bg-red-50 text-[#b71c1c]',
    bullet: 'bg-red-500',
    gradient: 'linear-gradient(145deg, #2b0b1c 0%, #8e1228 34%, #c62828 68%, #1a237e 100%)',
    sidebarGradient: 'linear-gradient(145deg, #b71c1c 0%, #c62828 58%, #1a237e 100%)',
    surfaceGlow: 'from-[#fff5f5] to-white',
  },
  'admit-cards': {
    accent: '#6a1b9a',
    accentSoft: 'border-purple-200 bg-purple-50 text-[#6a1b9a]',
    activePill: 'border-purple-200 bg-purple-50 text-[#5b1683]',
    bullet: 'bg-purple-500',
    gradient: 'linear-gradient(145deg, #1e113c 0%, #311b92 32%, #6a1b9a 68%, #1565c0 100%)',
    sidebarGradient: 'linear-gradient(145deg, #311b92 0%, #6a1b9a 60%, #283593 100%)',
    surfaceGlow: 'from-[#fbf5ff] to-white',
  },
  'answer-keys': {
    accent: '#00695c',
    accentSoft: 'border-teal-200 bg-teal-50 text-[#00695c]',
    activePill: 'border-teal-200 bg-teal-50 text-[#00564b]',
    bullet: 'bg-teal-500',
    gradient: 'linear-gradient(145deg, #062f2c 0%, #004d40 34%, #00695c 68%, #1565c0 100%)',
    sidebarGradient: 'linear-gradient(145deg, #004d40 0%, #00695c 58%, #1565c0 100%)',
    surfaceGlow: 'from-[#f2fffd] to-white',
  },
  admissions: {
    accent: '#ad1457',
    accentSoft: 'border-pink-200 bg-pink-50 text-[#ad1457]',
    activePill: 'border-pink-200 bg-pink-50 text-[#910e48]',
    bullet: 'bg-pink-500',
    gradient: 'linear-gradient(145deg, #3c0d2a 0%, #880e4f 32%, #ad1457 68%, #6a1b9a 100%)',
    sidebarGradient: 'linear-gradient(145deg, #880e4f 0%, #ad1457 58%, #6a1b9a 100%)',
    surfaceGlow: 'from-[#fff4fb] to-white',
  },
};

const tagConfig = {
  hot: 'border-red-400 bg-red-500 text-white',
  new: 'border-emerald-400 bg-emerald-500 text-white',
  update: 'border-blue-400 bg-blue-500 text-white',
  'last-date': 'border-amber-400 bg-amber-500 text-white',
} as const;

const statusConfig = {
  done: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  active: 'border-orange-200 bg-orange-50 text-[#bf360c]',
  upcoming: 'border-blue-200 bg-blue-50 text-blue-700',
} as const;

function isExternalHref(href: string) {
  return href.startsWith('http://') || href.startsWith('https://');
}

function SmartLink({
  href,
  className,
  children,
}: {
  children: ReactNode;
  className: string;
  href: string;
}) {
  if (isExternalHref(href)) {
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

function titleCaseSlug(slug: string) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function deriveLocation(item: AnnouncementItem) {
  if (!item.stateSlugs.length || item.stateSlugs.includes('all-india')) {
    return 'All India';
  }

  return item.stateSlugs.map(titleCaseSlug).join(', ');
}

function findDateRow(rows: DetailDateRow[], pattern: RegExp) {
  return rows.find((row) => pattern.test(row.label));
}

function SectionCard({
  title,
  eyebrow,
  icon,
  children,
  theme,
}: {
  children: ReactNode;
  eyebrow?: string;
  icon: ReactNode;
  theme: DetailTheme;
  title: string;
}) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
      <div className={cn('border-b border-gray-100 bg-gradient-to-r px-5 py-4', theme.surfaceGlow)}>
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border"
            style={{
              background: `linear-gradient(135deg, ${theme.accent}22, ${theme.accent}12)`,
              borderColor: `${theme.accent}33`,
              color: theme.accent,
            }}
          >
            {icon}
          </div>
          <div>
            {eyebrow ? (
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">{eyebrow}</p>
            ) : null}
            <h2 className="text-[16px] font-extrabold text-gray-900">{title}</h2>
          </div>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function InfoTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-[#fcfcfd] px-4 py-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">{label}</div>
      <div className="mt-1 text-sm font-semibold leading-6 text-gray-800">{value}</div>
    </div>
  );
}

function LinkCard({
  link,
}: {
  link: DetailImportantLink;
}) {
  const emphasis = link.emphasis ?? 'muted';
  const emphasisClasses = {
    primary:
      'border-transparent bg-[linear-gradient(135deg,#e65100,#bf360c)] text-white shadow-[0_12px_28px_rgba(230,81,0,0.22)] hover:opacity-95',
    secondary: 'border-orange-200 bg-orange-50 text-[#bf360c] hover:border-orange-300 hover:bg-orange-100',
    muted: 'border-gray-200 bg-white text-gray-700 hover:border-orange-200 hover:bg-orange-50 hover:text-[#bf360c]',
  } as const;

  return (
    <SmartLink
      href={link.href}
      className={cn(
        'group flex items-start justify-between gap-3 rounded-[18px] border px-4 py-3 transition-all',
        emphasisClasses[emphasis],
      )}
    >
      <div>
        <div className="text-sm font-bold">{link.label}</div>
        {link.note ? <div className="mt-1 text-[11px] opacity-80">{link.note}</div> : null}
      </div>
      <ExternalLink size={15} className="mt-0.5 shrink-0 opacity-75 transition-transform group-hover:-translate-y-0.5" />
    </SmartLink>
  );
}

export function PublicAnnouncementDetailPage({
  item,
  meta,
  relatedEntries,
}: PublicAnnouncementDetailPageProps) {
  const detail = item.detail;
  const theme = detailThemeBySection[item.section];
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const [activeSection, setActiveSection] = useState('shortinfo');
  const [readProgress, setReadProgress] = useState(0);
  const [saved, setSaved] = useState(false);
  const [helpful, setHelpful] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mobileCtaVisible, setMobileCtaVisible] = useState(false);
  const [faqOpenId, setFaqOpenId] = useState<string | null>('faq-deadline');
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const location = deriveLocation(item);
  const dates = detail.importantDates;
  const lastDateRow =
    findDateRow(dates, /last date|closing date|deadline|apply/i) ??
    dates.find((row) => row.status === 'active') ??
    dates[0];
  const startDateRow =
    findDateRow(dates, /application begin|application start|registration start|form start|notification released/i) ??
    dates[0];
  const primaryAction =
    detail.importantLinks.find((link) => link.emphasis === 'primary') ??
    detail.importantLinks[0] ??
    (detail.cta ? { href: detail.cta.primaryHref, label: detail.cta.primaryLabel, emphasis: 'primary' as const } : null);
  const secondaryAction =
    detail.importantLinks.find((link) => link.href !== primaryAction?.href) ??
    (detail.cta?.secondaryHref && detail.cta.secondaryLabel
      ? {
          href: detail.cta.secondaryHref,
          label: detail.cta.secondaryLabel,
          emphasis: 'secondary' as const,
        }
      : null);
  const shortcutLinks = (detail.relatedLinkOverrides ?? item.usefulLinks).slice(0, 3);
  const heroStats =
    detail.heroStats.length > 0
      ? detail.heroStats
      : [
          { label: 'Category', value: meta.title },
          { label: 'Published', value: item.date },
          { label: 'Qualification', value: item.qualification ?? 'Refer notice' },
          { label: 'Location', value: location },
        ];
  const metaRows = [
    { label: 'Post / Update Name', value: item.title },
    { label: 'Organization', value: item.org },
    { label: 'Category', value: meta.title },
    lastDateRow ? { label: lastDateRow.label, value: lastDateRow.date } : null,
    startDateRow ? { label: startDateRow.label, value: startDateRow.date } : null,
    item.postCount ? { label: 'Posts / Seats', value: item.postCount } : null,
    item.qualification ? { label: 'Qualification', value: item.qualification } : null,
    { label: 'Location', value: location },
    { label: 'Short Information', value: item.shortInfo },
  ].filter((row): row is { label: string; value: string } => Boolean(row));

  const faqItems: FaqItem[] = [
    {
      id: 'faq-deadline',
      question: 'What is the most important date to track for this update?',
      answer: lastDateRow
        ? `${lastDateRow.label}: ${lastDateRow.date}. Always verify this once from the official authority before applying, downloading, or taking the next step.`
        : `The current tracked publication date is ${item.date}.`,
    },
    {
      id: 'faq-eligibility',
      question: 'Who should review the eligibility and instructions carefully?',
      answer:
        detail.eligibility[0]?.description ??
        item.qualification ??
        `${item.org} candidates should read the full notice carefully before taking action.`,
    },
    {
      id: 'faq-links',
      question: 'Where should I go for the official notice or next action?',
      answer: primaryAction
        ? `Use "${primaryAction.label}" in the important links area or the action card in the sidebar. Official authority documents should be treated as final.`
        : `${item.org} remains the authoritative source for the notice, result, answer key, or admit card linked to this page.`,
    },
    {
      id: 'faq-scope',
      question: 'What does this detail page summarize at a glance?',
      answer: `${item.shortInfo} This page keeps dates, eligibility, links, fee details, and follow-up instructions in one public reading flow.`,
    },
  ];

  const navSections: NavSection[] = [
    { id: 'shortinfo', label: 'Short Info', icon: Info },
    { id: 'overview', label: 'Overview', icon: FileText },
    ...(detail.importantDates.length ? [{ id: 'dates', label: 'Dates', icon: Calendar }] : []),
    ...(detail.eligibility.length ? [{ id: 'eligibility', label: 'Eligibility', icon: GraduationCap }] : []),
    ...(detail.vacancyTable?.rows.length ? [{ id: 'vacancy', label: 'Vacancy', icon: Briefcase }] : []),
    ...(detail.importantLinks.length ? [{ id: 'links', label: 'Imp. Links', icon: Link2 }] : []),
    { id: 'faq', label: 'FAQ', icon: MessageSquare },
  ];
  const navKey = navSections.map((section) => section.id).join('|');

  useEffect(() => {
    const sectionIds = navKey ? navKey.split('|') : [];

    function handleScroll() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setReadProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
      setMobileCtaVisible(scrollTop > 320);

      for (let index = sectionIds.length - 1; index >= 0; index -= 1) {
        const node = sectionRefs.current[sectionIds[index]];

        if (!node) {
          continue;
        }

        if (node.getBoundingClientRect().top <= 150) {
          setActiveSection(sectionIds[index]);
          break;
        }
      }
    }

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, [navKey]);

  function scrollToSection(id: string) {
    const node = sectionRefs.current[id];

    if (!node) {
      return;
    }

    const top = node.getBoundingClientRect().top + window.scrollY - 126;
    window.scrollTo({ top, behavior: 'smooth' });
    setActiveSection(id);
  }

  async function handleCopyLink() {
    if (typeof window === 'undefined' || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function handleShare() {
    if (typeof window === 'undefined') {
      return;
    }

    if (navigator.share) {
      await navigator.share({
        title: item.title,
        url: window.location.href,
      });
      return;
    }

    await handleCopyLink();
  }

  function handlePrint() {
    window.print();
  }

  function handleSubscribe(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim()) {
      return;
    }

    setIsSubscribed(true);
    setEmail('');
  }

  return (
    <div className="mx-auto max-w-6xl px-3 py-4 md:px-4">
      <div
        className="pointer-events-none fixed left-0 top-0 z-[60] h-[3px] bg-gradient-to-r from-[#e65100] via-[#ffb300] to-[#1565c0]"
        style={{ width: `${readProgress}%` }}
      />

      <section className="relative overflow-hidden rounded-[30px] shadow-[0_28px_80px_rgba(15,23,42,0.18)]">
        <div className="absolute inset-0" style={{ background: theme.gradient }} />
        <div
          className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.28), transparent 72%)' }}
        />
        <div
          className="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full opacity-20"
          style={{ background: `radial-gradient(circle, ${theme.accent} 0%, transparent 70%)` }}
        />

        <div className="relative border-b border-white/12 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75 md:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/" className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-100">
              <Home size={12} />
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

        <div className="relative px-5 py-6 md:px-6 md:py-7">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_360px]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/18 bg-white/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/85">
                  {detail.eyebrow}
                </span>
                <span className="rounded-full border border-white/18 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/80">
                  {meta.title}
                </span>
                {item.tag ? (
                  <span
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em]',
                      tagConfig[item.tag],
                    )}
                  >
                    {item.tag.replace('-', ' ')}
                  </span>
                ) : null}
              </div>

              <h1 className="mt-4 max-w-5xl text-[30px] font-black leading-tight text-white md:text-[44px]">
                {item.title}
              </h1>
              <p className="mt-4 max-w-4xl text-sm leading-7 text-white/84 md:text-[15px]">{item.summary}</p>

              <div className="mt-5 flex flex-wrap items-center gap-2.5 text-[11px] font-semibold text-white/80">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/18 bg-white/10 px-3 py-1.5">
                  <Building2 size={12} />
                  {item.org}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/18 bg-white/10 px-3 py-1.5">
                  <MapPin size={12} />
                  {location}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/18 bg-white/10 px-3 py-1.5">
                  <Clock size={12} />
                  Updated {item.date}
                </span>
                {item.postCount ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/18 bg-white/10 px-3 py-1.5">
                    <Users size={12} />
                    {item.postCount} posts
                  </span>
                ) : null}
                {item.qualification ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/18 bg-white/10 px-3 py-1.5">
                    <GraduationCap size={12} />
                    {item.qualification}
                  </span>
                ) : null}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSaved((current) => !current)}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/18 bg-white/10 px-3.5 py-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-white/15"
                >
                  {saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                  {saved ? 'Saved' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/18 bg-white/10 px-3.5 py-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-white/15"
                >
                  <Share2 size={14} />
                  Share
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/18 bg-white/10 px-3.5 py-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-white/15"
                >
                  <Printer size={14} />
                  Print
                </button>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {heroStats.slice(0, 4).map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-[22px] border border-white/16 bg-white/10 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm"
                  >
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/68">
                      {stat.label}
                    </div>
                    <div className="mt-2 text-xl font-black text-white">{stat.value}</div>
                  </div>
                ))}
              </div>

              {shortcutLinks.length ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {shortcutLinks.map((link) => (
                    <SmartLink
                      key={`${link.href}-${link.label}`}
                      href={link.href}
                      className="rounded-xl border border-white/18 bg-white/10 px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-white/15"
                    >
                      {link.label}
                    </SmartLink>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="rounded-[24px] border border-white/16 bg-white/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">Update Snapshot</div>
                  <div className="mt-1 text-lg font-extrabold text-white">Keep the official notice close</div>
                </div>
                <div className="rounded-full border border-white/18 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/80">
                  Same Public Shell
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {metaRows.slice(0, 5).map((row) => (
                  <div key={`${row.label}-${row.value}`} className="rounded-2xl border border-white/12 bg-white/10 px-4 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/65">{row.label}</div>
                    <div className="mt-1 text-sm font-semibold leading-6 text-white">{row.value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-white/12 bg-white/8 px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">
                  <Shield size={13} />
                  Official-first reminder
                </div>
                <p className="mt-2 text-sm leading-6 text-white/82">
                  Verify dates, fee, qualification, and result instructions from the authority PDF or website before taking action.
                </p>
              </div>

              <div className="mt-4 space-y-2">
                {primaryAction ? (
                  <SmartLink
                    href={primaryAction.href}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#ff8a3d,#bf360c)] px-4 py-3 text-sm font-bold text-white shadow-[0_16px_28px_rgba(230,81,0,0.28)]"
                  >
                    {primaryAction.label}
                    <ArrowRight size={15} />
                  </SmartLink>
                ) : null}
                {secondaryAction ? (
                  <SmartLink
                    href={secondaryAction.href}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/18 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15"
                  >
                    {secondaryAction.label}
                    <ExternalLink size={14} />
                  </SmartLink>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-4 space-y-4 pb-24 lg:pb-0">
        <nav className="sticky top-[104px] z-20 overflow-x-auto rounded-[22px] border border-white/70 bg-white/90 shadow-[0_14px_40px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <div className="flex min-w-max items-center gap-1 px-2 py-2">
            {navSections.map((section) => {
              const Icon = section.icon;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => scrollToSection(section.id)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-[12px] font-bold transition-all',
                    activeSection === section.id
                      ? theme.activePill
                      : 'border-transparent text-gray-600 hover:border-gray-200 hover:bg-gray-50 hover:text-gray-900',
                  )}
                >
                  <Icon size={13} />
                  {section.label}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.78fr)_360px]">
          <div className="space-y-4">
            {detail.notice ? (
              <div className="overflow-hidden rounded-[24px] border border-amber-200 bg-amber-50 shadow-sm">
                <div className="flex items-start gap-3 px-5 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                    <AlertCircle size={18} />
                  </div>
                  <div>
                    <div className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-amber-800">
                      {detail.notice.title}
                    </div>
                    <div className="mt-2 space-y-2 text-sm leading-7 text-amber-900">
                      {detail.notice.body.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div
              id="shortinfo"
              ref={(node) => {
                sectionRefs.current.shortinfo = node;
              }}
              className="scroll-mt-[150px]"
            >
              <SectionCard title="Short Information" eyebrow={meta.eyebrow} icon={<ClipboardList size={18} />} theme={theme}>
                <div className="grid gap-3 md:grid-cols-2">
                  {metaRows.map((row) => (
                    <InfoTile key={`${row.label}-${row.value}`} label={row.label} value={row.value} />
                  ))}
                </div>
              </SectionCard>
            </div>

            <div
              id="overview"
              ref={(node) => {
                sectionRefs.current.overview = node;
              }}
              className="scroll-mt-[150px]"
            >
              <SectionCard title={detail.overviewTitle ?? 'Overview'} icon={<FileText size={18} />} theme={theme}>
                <div className="space-y-5">
                  <p className="text-[15px] leading-8 text-gray-700">{item.summary}</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {item.keyPoints.map((point) => (
                      <div key={point} className="rounded-2xl border border-gray-200 bg-[#fcfcfd] px-4 py-3">
                        <div className="flex items-start gap-2.5">
                          <span className={cn('mt-2 h-2 w-2 shrink-0 rounded-full', theme.bullet)} />
                          <p className="text-sm leading-7 text-gray-700">{point}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </SectionCard>
            </div>

            {detail.importantDates.length ? (
              <div
                id="dates"
                ref={(node) => {
                  sectionRefs.current.dates = node;
                }}
                className="scroll-mt-[150px]"
              >
                <SectionCard title="Important Dates" icon={<Calendar size={18} />} theme={theme}>
                  <div className="overflow-hidden rounded-[20px] border border-gray-200">
                    <div className={cn('grid grid-cols-[1.3fr_1fr_auto] gap-3 border-b border-gray-200 bg-gradient-to-r px-4 py-3', theme.surfaceGlow)}>
                      <span className="text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: theme.accent }}>
                        Event / Activity
                      </span>
                      <span className="text-right text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: theme.accent }}>
                        Date
                      </span>
                      <span className="text-right text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: theme.accent }}>
                        Status
                      </span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {detail.importantDates.map((row) => (
                        <div key={`${row.label}-${row.date}`} className="grid grid-cols-[1.3fr_1fr_auto] gap-3 px-4 py-3">
                          <div className="text-sm font-semibold leading-6 text-gray-800">{row.label}</div>
                          <div className="text-right text-sm font-bold text-gray-700">{row.date}</div>
                          <div className="text-right">
                            {row.status ? (
                              <span
                                className={cn(
                                  'inline-flex rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em]',
                                  statusConfig[row.status],
                                )}
                              >
                                {row.status}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">Tracked</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </SectionCard>
              </div>
            ) : null}

            {detail.applicationFee ? (
              <div className="scroll-mt-[150px]">
                <SectionCard title={detail.applicationFee.title ?? 'Application Fee'} icon={<IndianRupee size={18} />} theme={theme}>
                  <div className="grid gap-3 md:grid-cols-2">
                    {detail.applicationFee.rows.map((row) => (
                      <InfoTile key={`${row.label}-${row.value}`} label={row.label} value={row.value} />
                    ))}
                  </div>
                  {detail.applicationFee.note ? (
                    <div className="mt-4 rounded-2xl border border-gray-200 bg-[#fcfcfd] px-4 py-3 text-sm leading-7 text-gray-600">
                      {detail.applicationFee.note}
                    </div>
                  ) : null}
                </SectionCard>
              </div>
            ) : null}

            {detail.ageLimit ? (
              <div className="scroll-mt-[150px]">
                <SectionCard title="Age Limit" icon={<Shield size={18} />} theme={theme}>
                  <div className="rounded-[20px] border border-gray-200 bg-[#fcfcfd] px-4 py-4">
                    <p className="text-sm font-semibold leading-7 text-gray-800">{detail.ageLimit.summary}</p>
                    <div className="mt-4 space-y-3">
                      {detail.ageLimit.points.map((point) => (
                        <div key={point} className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="mt-1 shrink-0" style={{ color: theme.accent }} />
                          <p className="text-sm leading-7 text-gray-700">{point}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </SectionCard>
              </div>
            ) : null}

            {detail.eligibility.length ? (
              <div
                id="eligibility"
                ref={(node) => {
                  sectionRefs.current.eligibility = node;
                }}
                className="scroll-mt-[150px]"
              >
                <SectionCard title="Eligibility Details" icon={<GraduationCap size={18} />} theme={theme}>
                  <div className="grid gap-3 md:grid-cols-2">
                    {detail.eligibility.map((block) => (
                      <div key={block.title} className="rounded-[20px] border border-gray-200 bg-[#fcfcfd] px-4 py-4">
                        <h3 className="text-[14px] font-extrabold text-gray-900">{block.title}</h3>
                        <p className="mt-2 text-sm leading-7 text-gray-700">{block.description}</p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>
            ) : null}

            {detail.vacancyTable?.rows.length ? (
              <div
                id="vacancy"
                ref={(node) => {
                  sectionRefs.current.vacancy = node;
                }}
                className="scroll-mt-[150px]"
              >
                <SectionCard title="Vacancy / Post Details" icon={<Briefcase size={18} />} theme={theme}>
                  <div className="overflow-x-auto rounded-[20px] border border-gray-200">
                    <table className="min-w-full border-collapse text-left">
                      <thead className={cn('bg-gradient-to-r', theme.surfaceGlow)}>
                        <tr>
                          {detail.vacancyTable.columns.map((column) => (
                            <th key={column} className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: theme.accent }}>
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {detail.vacancyTable.rows.map((row) => (
                          <tr key={`${row.post}-${row.department}`}>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-800">{row.post}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{row.department}</td>
                            <td className="px-4 py-3 text-sm font-bold text-gray-800">{row.vacancies}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{row.payLevel ?? 'Refer notice'}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{row.salary ?? 'Refer notice'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>
              </div>
            ) : null}

            {detail.selectionProcess?.length ? (
              <div className="scroll-mt-[150px]">
                <SectionCard title="Selection Process" icon={<BadgeCheck size={18} />} theme={theme}>
                  <div className="space-y-3">
                    {detail.selectionProcess.map((step, index) => (
                      <div key={step} className="flex items-start gap-3 rounded-[20px] border border-gray-200 bg-[#fcfcfd] px-4 py-4">
                        <span className={cn('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-[12px] font-extrabold', theme.accentSoft)}>
                          {index + 1}
                        </span>
                        <p className="text-sm leading-7 text-gray-700">{step}</p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>
            ) : null}

            {detail.howToApply?.length ? (
              <div className="scroll-mt-[150px]">
                <SectionCard title="How To Apply / Use This Update" icon={<Newspaper size={18} />} theme={theme}>
                  <div className="space-y-3">
                    {detail.howToApply.map((step, index) => (
                      <div key={step} className="flex items-start gap-3 rounded-[20px] border border-gray-200 bg-[#fcfcfd] px-4 py-4">
                        <span
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[12px] font-extrabold text-white"
                          style={{ background: `linear-gradient(135deg, ${theme.accent}, #1a237e)` }}
                        >
                          {index + 1}
                        </span>
                        <p className="text-sm leading-7 text-gray-700">{step}</p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>
            ) : null}

            {detail.extraSections?.map((section) => (
              <div key={section.id} className="scroll-mt-[150px]">
                <SectionCard title={section.title} eyebrow={section.eyebrow} icon={<FileText size={18} />} theme={theme}>
                  <div className="space-y-4">
                    {section.paragraphs?.map((paragraph) => (
                      <p key={paragraph} className="text-sm leading-7 text-gray-700">
                        {paragraph}
                      </p>
                    ))}
                    {section.points?.length ? (
                      <div className="grid gap-3">
                        {section.points.map((point) => (
                          <div key={point} className="rounded-[20px] border border-gray-200 bg-[#fcfcfd] px-4 py-3">
                            <div className="flex items-start gap-2.5">
                              <span className={cn('mt-2 h-2 w-2 shrink-0 rounded-full', theme.bullet)} />
                              <p className="text-sm leading-7 text-gray-700">{point}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </SectionCard>
              </div>
            ))}

            {detail.importantLinks.length ? (
              <div
                id="links"
                ref={(node) => {
                  sectionRefs.current.links = node;
                }}
                className="scroll-mt-[150px]"
              >
                <SectionCard title="Important Links" icon={<Link2 size={18} />} theme={theme}>
                  <div className="grid gap-3 md:grid-cols-2">
                    {detail.importantLinks.map((link) => (
                      <LinkCard key={`${link.label}-${link.href}`} link={link} />
                    ))}
                  </div>
                </SectionCard>
              </div>
            ) : null}

            <div className="rounded-[24px] border border-gray-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">Reader Actions</div>
                  <div className="mt-1 text-lg font-extrabold text-gray-900">Save, share, or mark this page helpful</div>
                </div>
                <div className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">
                  Public Detail Experience
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHelpful((current) => !current)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[12px] font-semibold transition-colors',
                      helpful
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100',
                    )}
                  >
                    <BadgeCheck size={14} />
                    {helpful ? 'Marked Helpful' : 'Mark Helpful'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaved((current) => !current)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[12px] font-semibold transition-colors',
                      saved
                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100',
                    )}
                  >
                    {saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                    {saved ? 'Saved' : 'Save'}
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[12px] font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                  >
                    <Copy size={14} />
                    {copied ? 'Copied' : 'Copy Link'}
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[12px] font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                  >
                    <Share2 size={14} />
                    Share
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[12px] font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                  >
                    <Printer size={14} />
                    Print
                  </button>
                </div>
              </div>
            </div>

            <div
              id="faq"
              ref={(node) => {
                sectionRefs.current.faq = node;
              }}
              className="scroll-mt-[150px]"
            >
              <SectionCard title="Common Questions" icon={<MessageSquare size={18} />} theme={theme}>
                <div className="space-y-3">
                  {faqItems.map((faq) => {
                    const isOpen = faqOpenId === faq.id;

                    return (
                      <div key={faq.id} className="overflow-hidden rounded-[20px] border border-gray-200 bg-[#fcfcfd]">
                        <button
                          type="button"
                          onClick={() => setFaqOpenId((current) => (current === faq.id ? null : faq.id))}
                          className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                        >
                          <div className="min-w-0">
                            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">FAQ</div>
                            <div className="mt-1 text-sm font-bold leading-6 text-gray-900">{faq.question}</div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-blue-700">
                              <BadgeCheck size={11} />
                              Quick Answer
                            </span>
                            {isOpen ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                          </div>
                        </button>
                        {isOpen ? (
                          <div className="border-t border-gray-200 px-4 py-4 text-sm leading-7 text-gray-700">{faq.answer}</div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            </div>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-[118px] xl:self-start">
            {primaryAction ? (
              <div className="overflow-hidden rounded-[24px] text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]" style={{ background: theme.sidebarGradient }}>
                <div className="p-5">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/12">
                    <Shield size={22} className="text-yellow-300" />
                  </div>
                  <h3 className="mt-4 text-center text-xl font-black">Don&apos;t Miss The Next Step</h3>
                  <p className="mt-2 text-center text-sm leading-7 text-white/80">
                    {lastDateRow ? (
                      <>
                        <span className="font-semibold text-yellow-300">{lastDateRow.label}:</span> {lastDateRow.date}
                      </>
                    ) : (
                      item.shortInfo
                    )}
                  </p>
                  <div className="mt-4 space-y-2">
                    <SmartLink
                      href={primaryAction.href}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#e65100,#bf360c)] px-4 py-3 text-sm font-bold text-white"
                    >
                      {primaryAction.label}
                      <ArrowRight size={15} />
                    </SmartLink>
                    {secondaryAction ? (
                      <SmartLink
                        href={secondaryAction.href}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/18 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15"
                      >
                        {secondaryAction.label}
                        <ExternalLink size={14} />
                      </SmartLink>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {detail.importantDates.length ? (
              <div className="overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
                <div className={cn('border-b border-gray-100 bg-gradient-to-r px-4 py-3', theme.surfaceGlow)}>
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-2xl text-white"
                      style={{ background: `linear-gradient(135deg, ${theme.accent}, #1a237e)` }}
                    >
                      <Calendar size={16} />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Quick Timeline</div>
                      <div className="text-[14px] font-extrabold text-gray-900">Important Dates</div>
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {detail.importantDates.slice(0, 6).map((row) => (
                    <div key={`${row.label}-${row.date}`} className="px-4 py-3">
                      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">{row.label}</div>
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-gray-800">{row.date}</span>
                        {row.status ? (
                          <span
                            className={cn(
                              'inline-flex rounded-full border px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em]',
                              statusConfig[row.status],
                            )}
                          >
                            {row.status}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {shortcutLinks.length ? (
              <div className="overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
                <div className={cn('border-b border-gray-100 bg-gradient-to-r px-4 py-3', theme.surfaceGlow)}>
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Quick Access</div>
                  <div className="text-[14px] font-extrabold text-gray-900">Useful Resources</div>
                </div>
                <div className="space-y-2 p-4">
                  {shortcutLinks.map((link) => (
                    <SmartLink
                      key={`${link.href}-${link.label}`}
                      href={link.href}
                      className="flex items-center justify-between rounded-2xl border border-gray-200 bg-[#fcfcfd] px-3 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-[#bf360c]"
                    >
                      <span>{link.label}</span>
                      <ExternalLink size={14} />
                    </SmartLink>
                  ))}
                </div>
              </div>
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

            <div className="overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
              <div className={cn('border-b border-gray-100 bg-gradient-to-r px-4 py-3', theme.surfaceGlow)}>
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-2xl border"
                    style={{
                      background: `linear-gradient(135deg, ${theme.accent}22, ${theme.accent}12)`,
                      borderColor: `${theme.accent}33`,
                      color: theme.accent,
                    }}
                  >
                    <Bell size={16} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Alerts</div>
                    <div className="text-[14px] font-extrabold text-gray-900">Get update alerts</div>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm leading-7 text-gray-600">
                  {detail.subscribePrompt?.description ??
                    `Track fresh ${meta.title.toLowerCase()} updates without leaving the public Sarkari-style shell.`}
                </p>
                <form onSubmit={handleSubscribe} className="mt-4 space-y-2">
                  {isSubscribed ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                      You&apos;re subscribed for upcoming updates.
                    </div>
                  ) : (
                    <>
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="your@email.com"
                        className="w-full rounded-2xl border border-gray-200 bg-[#fcfcfd] px-4 py-3 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-orange-300"
                      />
                      <button
                        type="submit"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#e65100,#bf360c)] px-4 py-3 text-sm font-bold text-white"
                      >
                        <Send size={14} />
                        {detail.subscribePrompt?.buttonLabel ?? 'Set alert'}
                      </button>
                    </>
                  )}
                  <SmartLink
                    href={buildCommunityPath('telegram')}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-[#fcfcfd] px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-[#bf360c]"
                  >
                    Telegram Channel
                    <ExternalLink size={14} />
                  </SmartLink>
                </form>
              </div>
            </div>

            <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-700" />
                <div>
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-amber-800">Disclaimer</div>
                  <p className="mt-2 text-sm leading-7 text-amber-900">
                    {detail.sourceNote ??
                      `${item.org} remains the authoritative source for this update. Verify the official portal before acting on any instruction.`}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {mobileCtaVisible && primaryAction ? (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 px-3 py-3 shadow-2xl backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center gap-2">
            <button
              type="button"
              onClick={() => setSaved((current) => !current)}
              className={cn(
                'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border',
                saved ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-gray-200 bg-gray-50 text-gray-700',
              )}
            >
              {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            </button>
            <SmartLink
              href={primaryAction.href}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#e65100,#bf360c)] px-4 text-sm font-bold text-white"
            >
              {primaryAction.label}
              <ArrowRight size={14} />
            </SmartLink>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-gray-700"
            >
              <Share2 size={16} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
