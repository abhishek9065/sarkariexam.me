import {
  Activity,
  ArrowRight,
  Award,
  BadgeCheck,
  Bookmark,
  Briefcase,
  Building2,
  CalendarDays,
  Clock3,
  Cpu,
  FileCheck,
  GraduationCap,
  Landmark,
  MapPin,
  Mic,
  Search,
  Shield,
  Sparkles,
  Star,
  Stethoscope,
  Train,
  TrendingUp,
  Users,
  Zap,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

import { SafeLink } from '@/app/components/public-site/SafeLink';
import { buildJobsPath } from '@/app/lib/public-content';
import { getHomepageSections } from '@/lib/content-api';
import { PublicSiteShell } from '@/app/components/public-site/PublicSiteShell';
import { homePageLinks } from './links';

type HomepageSections = Awaited<ReturnType<typeof getHomepageSections>>;
type HomepageSectionItem = HomepageSections[keyof HomepageSections][number];
type HomepageSectionKey = 'results' | 'admit-cards' | 'jobs' | 'answer-keys' | 'admissions';
type FigmaUpdateTag = 'new' | 'hot' | 'last-date' | 'last-day' | 'update';

interface LatestUpdateItem {
  href: string;
  title: string;
  org: string;
  date: string;
  tag?: HomepageSectionItem['tag'] | FigmaUpdateTag;
  postCount?: string;
  qualification?: string;
}

interface UpdateCardProps {
  accent: string;
  count: string;
  darkAccent: string;
  href: string;
  icon: LucideIcon;
  items: LatestUpdateItem[];
  title: string;
}

const searchPrompts = [
  'Show me Graduate jobs closing this week',
  'SSC CGL 2026 cut-off prediction',
  'Bank PO admit cards released today',
  '12th-pass railway jobs in Bihar',
];

const heroStats = [
  { label: 'Latest Forms', value: '342', href: homePageLinks.jobs, gradient: 'from-cyan-400 to-blue-500' },
  { label: 'Results Out', value: '89', href: homePageLinks.results, gradient: 'from-emerald-400 to-teal-500' },
  { label: 'Admit Cards', value: '128', href: homePageLinks.admitCards, gradient: 'from-violet-400 to-fuchsia-500' },
  { label: 'Mock Tests', value: '1,240', href: homePageLinks.syllabus, gradient: 'from-amber-400 to-orange-500' },
];

const pulseItems = [
  { exam: 'SSC CGL 2026', status: 'Form closing', time: '2d 14h', trend: '+18%', live: true, gradient: 'from-orange-400 to-red-500', href: buildJobsPath({ search: 'SSC CGL 2026' }) },
  { exam: 'UPSC CSE Prelims', status: 'Admit card live', time: 'Released', trend: 'Hot', live: true, gradient: 'from-violet-400 to-fuchsia-500', href: `${homePageLinks.admitCards}?search=UPSC` },
  { exam: 'IBPS PO 2026', status: 'Result expected', time: '~6 days', trend: '+9%', live: false, gradient: 'from-emerald-400 to-teal-500', href: `${homePageLinks.results}?search=IBPS%20PO` },
  { exam: 'RRB Group D', status: 'CBT happening', time: 'Now', trend: 'Live', live: true, gradient: 'from-cyan-400 to-blue-500', href: buildJobsPath({ search: 'RRB Group D' }) },
];

const fallbackUpdates: Record<HomepageSectionKey, LatestUpdateItem[]> = {
  results: [
    { title: 'UPSC Civil Services 2025 — Final Result', org: 'UPSC', date: '27 Mar', tag: 'hot', href: homePageLinks.results },
    { title: 'SSC CHSL 2025 — Tier 2 Result', org: 'SSC', date: '26 Mar', tag: 'new', href: homePageLinks.results },
    { title: 'IBPS Clerk Mains 2025 — Result Declared', org: 'IBPS', date: '25 Mar', tag: 'new', href: homePageLinks.results },
    { title: 'RRB NTPC CBT 2 Result 2025', org: 'RRB', date: '24 Mar', href: homePageLinks.results },
    { title: 'Bihar BPSC 69th CCE — Final Result', org: 'BPSC', date: '21 Mar', tag: 'hot', href: homePageLinks.results },
  ],
  'admit-cards': [
    { title: 'SSC GD Constable 2026 PET/PST', org: 'SSC', date: '28 Mar', tag: 'hot', href: homePageLinks.admitCards },
    { title: 'UPSC EPFO 2026 Admit Card', org: 'UPSC', date: '27 Mar', tag: 'new', href: homePageLinks.admitCards },
    { title: 'Bihar STET 2026 Admit Card', org: 'BSEB', date: '25 Mar', href: homePageLinks.admitCards },
    { title: 'SSC CGL 2026 — Tier 1 Admit Card', org: 'SSC', date: '24 Mar', tag: 'new', href: homePageLinks.admitCards },
  ],
  jobs: [
    { title: 'SSC CGL 2026 — Combined Graduate Level', org: 'SSC', date: '28 Mar', tag: 'hot', href: homePageLinks.jobs },
    { title: 'IBPS PO 2026 — Probationary Officer', org: 'IBPS', date: '26 Mar', tag: 'new', href: homePageLinks.jobs },
    { title: 'RRB Group D — Level 1 Posts', org: 'Railway', date: '25 Mar', tag: 'new', href: homePageLinks.jobs },
    { title: 'UPSC NDA/NA 2026', org: 'UPSC', date: '24 Mar', tag: 'last-day', href: homePageLinks.jobs },
    { title: 'Bihar Police Constable 2026', org: 'CSBC', date: '22 Mar', tag: 'new', href: homePageLinks.jobs },
  ],
  'answer-keys': [
    { title: 'SSC CGL Tier 1 Answer Key 2026', org: 'SSC', date: '24 Mar', tag: 'update', href: homePageLinks.answerKey },
  ],
  admissions: [
    { title: 'CUET UG Admission Online Form 2026', org: 'NTA', date: '23 Mar', tag: 'new', href: homePageLinks.admissions },
  ],
};

const aiPicks = [
  {
    title: 'SSC CGL 2026 — Combined Graduate Level',
    org: 'Staff Selection Commission',
    salary: '₹35,400 – ₹1,12,400',
    posts: '14,582',
    closes: '5 Apr 2026',
    match: '94%',
    tags: ['Graduate', 'Pan-India', 'Tier-based'],
    href: buildJobsPath({ search: 'SSC CGL' }),
    gradient: 'from-indigo-500 to-cyan-400',
  },
  {
    title: 'IBPS PO 2026 — Probationary Officer',
    org: 'IBPS',
    salary: '₹52,000 – ₹85,000',
    posts: '4,500',
    closes: '12 Apr 2026',
    match: '88%',
    tags: ['Banking', 'Graduate', 'Officer'],
    href: buildJobsPath({ search: 'IBPS PO' }),
    gradient: 'from-emerald-500 to-teal-400',
  },
  {
    title: 'UPSC EPFO 2026 — Enforcement Officer',
    org: 'UPSC',
    salary: '₹47,600 – ₹1,51,100',
    posts: '577',
    closes: '9 Apr 2026',
    match: '81%',
    tags: ['Civil Services', 'Officer'],
    href: buildJobsPath({ search: 'UPSC EPFO' }),
    gradient: 'from-fuchsia-500 to-rose-400',
  },
];

const sectors = [
  { icon: Briefcase, label: 'Central Govt', count: '2,340', department: 'SSC', gradient: 'from-blue-500 to-cyan-400' },
  { icon: Landmark, label: 'State Govt', count: '1,890', department: 'State Govt', gradient: 'from-amber-500 to-orange-400' },
  { icon: Shield, label: 'Defence', count: '890', department: 'Defence', gradient: 'from-emerald-600 to-emerald-400' },
  { icon: Train, label: 'Railway', count: '1,200', department: 'Railway', gradient: 'from-rose-500 to-pink-400' },
  { icon: Building2, label: 'Banking', count: '760', department: 'Banking', gradient: 'from-violet-500 to-purple-400' },
  { icon: Stethoscope, label: 'Medical', count: '430', department: 'Medical', gradient: 'from-teal-500 to-cyan-400' },
  { icon: GraduationCap, label: 'Teaching', count: '980', department: 'Teaching', gradient: 'from-fuchsia-500 to-pink-400' },
  { icon: Award, label: 'Judiciary', count: '320', department: 'State Govt', gradient: 'from-stone-700 to-stone-500' },
  { icon: Cpu, label: 'IT / Tech', count: '540', department: 'Engineering', gradient: 'from-indigo-500 to-blue-400' },
  { icon: Users, label: 'PSC', count: '1,100', department: 'UPSC', gradient: 'from-orange-500 to-red-400' },
];

const states = [
  'Uttar Pradesh',
  'Bihar',
  'Rajasthan',
  'Madhya Pradesh',
  'Maharashtra',
  'Delhi',
  'Gujarat',
  'Tamil Nadu',
  'Karnataka',
  'West Bengal',
  'Punjab',
  'Haryana',
  'Jharkhand',
  'Chhattisgarh',
  'Odisha',
  'Uttarakhand',
];

const sources = ['UPSC', 'SSC', 'IBPS', 'RRB', 'NTA', 'RBI', 'ISRO', 'DRDO'];

function getSectionItems(sections: HomepageSections, section: HomepageSectionKey) {
  void sections;
  return fallbackUpdates[section].slice(0, 5);
}

function toStateSlug(label: string) {
  return label.toLowerCase().replace(/\s+/g, '-');
}

function getTagLabel(tag?: LatestUpdateItem['tag']) {
  if (!tag) {
    return null;
  }

  return tag.replace('-', ' ').toUpperCase();
}

function getTagClassName(tag?: LatestUpdateItem['tag']) {
  switch (tag) {
    case 'hot':
      return 'border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400';
    case 'last-date':
    case 'last-day':
      return 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400';
    case 'update':
      return 'border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-400';
    case 'new':
    default:
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
  }
}

function LatestUpdateRow({ item }: { item: LatestUpdateItem }) {
  const tagLabel = getTagLabel(item.tag);

  return (
    <SafeLink
      href={item.href}
      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-white/70 dark:hover:bg-white/5"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {tagLabel ? (
            <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-wide ${getTagClassName(item.tag)}`}>
              {tagLabel}
            </span>
          ) : null}
          <span className="truncate text-[12.5px] font-semibold text-gray-900 dark:text-white/90">{item.title}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[10.5px] text-gray-500 dark:text-white/40">
          <span className="truncate">{item.org}</span>
          <span className="h-0.5 w-0.5 rounded-full bg-gray-300 dark:bg-white/30" />
          <span className="flex items-center gap-1">
            <CalendarDays size={9} />
            {item.date}
          </span>
          {item.qualification ? (
            <span className="hidden rounded-full bg-blue-500/10 px-1.5 py-0.5 font-semibold text-blue-700 dark:text-blue-300 sm:inline-flex">
              {item.qualification}
            </span>
          ) : null}
        </div>
      </div>
      <ArrowRight
        size={14}
        className="shrink-0 text-gray-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-gray-700 dark:text-white/30 dark:group-hover:text-white"
      />
    </SafeLink>
  );
}

function UpdateCard({ accent, count, darkAccent, href, icon: Icon, items, title }: UpdateCardProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white dark:border-white/10 dark:bg-white/[0.04] dark:backdrop-blur-xl">
      <div className="absolute inset-0 opacity-50 dark:hidden" style={{ background: accent }} />
      <div className="absolute inset-0 hidden dark:block" style={{ background: darkAccent }} />
      <div className="relative p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-white/10">
              <Icon size={16} className="text-gray-900 dark:text-white" />
            </div>
            <div>
              <h3 className="text-[14px] font-extrabold text-gray-900 dark:text-white">{title}</h3>
              <p className="text-[10.5px] text-gray-500 dark:text-white/50">{count} new in last 24h</p>
            </div>
          </div>
          <SafeLink href={href} className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-gray-700 hover:text-gray-950 dark:text-white/80 dark:hover:text-white">
            View all
            <ArrowRight size={11} />
          </SafeLink>
        </div>
        <div className="space-y-0.5">
          {items.map((item) => (
            <LatestUpdateRow key={`${item.href}-${item.title}`} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[#070819]" />
      <div
        className="absolute inset-0 opacity-80"
        style={{
          background:
            'radial-gradient(60% 60% at 20% 20%, rgba(99,102,241,0.45) 0%, transparent 60%), radial-gradient(50% 50% at 80% 30%, rgba(236,72,153,0.35) 0%, transparent 60%), radial-gradient(60% 60% at 60% 90%, rgba(34,211,238,0.35) 0%, transparent 60%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-12">
        <div className="mb-5 flex justify-center">
          <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 backdrop-blur-xl">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[11px] font-semibold tracking-[0.03em] text-white/80">LIVE • UPDATED 12 SECONDS AGO</span>
          </div>
        </div>

        <h1 className="mx-auto max-w-3xl text-center text-[34px] font-extrabold leading-[1.05] tracking-normal text-white sm:text-[44px]">
          Your{' '}
          <span
            style={{
              background: 'linear-gradient(90deg,#67e8f9,#a78bfa,#f0abfc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            AI co-pilot
          </span>{' '}
          for every Sarkari exam.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-center text-[14px] leading-6 text-white/75">
          Ask in plain Hindi or English. We surface the right form, admit card, result and prep pack in seconds — no more
          digging through PDFs.
        </p>

        <div className="mx-auto mt-8 max-w-2xl">
          <form action={homePageLinks.jobs} className="group relative">
            <div
              className="absolute -inset-px rounded-2xl opacity-70 blur-lg transition group-focus-within:opacity-100"
              style={{ background: 'linear-gradient(120deg,#22d3ee,#a78bfa,#f472b6)' }}
            />
            <div className="relative flex items-center rounded-2xl border border-white/10 bg-[#0b0d22]/90 px-3 py-2.5 shadow-[0_20px_60px_rgba(34,211,238,0.18)] backdrop-blur-xl">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400">
                <Briefcase size={16} className="text-white" />
              </div>
              <input
                name="search"
                placeholder={searchPrompts[0]}
                className="min-w-0 flex-1 bg-transparent px-3 text-[14px] text-white outline-none placeholder:text-white/40"
              />
              <button type="button" className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/60 transition hover:bg-white/10 hover:text-white sm:flex">
                <Mic size={15} />
              </button>
              <div className="mr-1 hidden items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[10px] font-semibold text-white/50 sm:flex">
                <Search size={10} /> K
              </div>
              <button
                type="submit"
                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 px-4 py-2 text-[13px] font-bold text-white"
              >
                Ask
                <ArrowRight size={13} />
              </button>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {["Today's Results", 'Closing this week', 'Free Mock Tests', 'AI Cut-off Predictor'].map((label) => (
              <Link
                key={label}
                href={buildJobsPath({ search: label })}
                className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/80 backdrop-blur-md transition hover:bg-white/10 hover:text-white"
              >
                <Sparkles size={10} className="text-cyan-300" />
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {[
            { label: '9,284 active forms', color: 'bg-emerald-400' },
            { label: '38 results today', color: 'bg-amber-400' },
            { label: 'AI tutor online', color: 'bg-violet-400' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${item.color}`} />
              <span className="text-[11px] font-semibold text-white/70">{item.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
          {heroStats.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md transition hover:bg-white/10"
            >
              <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${stat.gradient} opacity-20 transition group-hover:opacity-40`} />
              <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.04em] text-white/50">
                <Zap size={10} />
                LIVE
              </div>
              <div className="mt-1 text-[28px] font-extrabold tracking-[-0.02em] text-white">{stat.value}</div>
              <div className="text-[12px] font-medium text-white/60">{stat.label}</div>
            </Link>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-b from-transparent to-[#f0f2f7] dark:to-[#070819]" />
    </section>
  );
}

function ExamPulse() {
  return (
    <section className="mx-auto mt-6 max-w-6xl px-4">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5 dark:backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-white/10">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-orange-500">
              <Activity size={14} className="text-white" />
            </div>
            <div>
              <h2 className="text-[13px] font-bold text-gray-900 dark:text-white">Exam Pulse</h2>
              <p className="text-[10px] text-gray-400 dark:text-white/50">Real-time signals across portals</p>
            </div>
          </div>
          <span className="hidden items-center gap-1 text-[11px] font-semibold text-emerald-600 sm:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Streaming
          </span>
        </div>
        <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-white/10 md:grid-cols-4">
          {pulseItems.map((item) => (
            <Link key={item.exam} href={item.href} className="group relative p-4 transition hover:bg-gray-50 dark:hover:bg-white/5">
              <div className={`absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r ${item.gradient}`} />
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-bold text-gray-900 dark:text-white">{item.exam}</span>
                {item.live ? <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> : null}
              </div>
              <p className="mt-0.5 text-[11px] text-gray-500 dark:text-white/50">{item.status}</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-700 dark:text-white/80">
                  <Clock3 size={10} />
                  {item.time}
                </span>
                <span className="flex items-center gap-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <TrendingUp size={10} />
                  {item.trend}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function LatestUpdates({ sections }: { sections: HomepageSections }) {
  return (
    <section className="mx-auto mt-6 max-w-6xl px-4">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.08em] text-gray-500 dark:text-white/50">
            <Zap size={12} className="text-orange-500" />
            WHAT&apos;S MOVING TODAY
          </div>
          <h2 className="text-[22px] font-extrabold tracking-[-0.02em] text-gray-900 dark:text-white">Latest, organized for you</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <UpdateCard
          title="Latest Results"
          count="89"
          icon={FileCheck}
          href={homePageLinks.results}
          accent="linear-gradient(135deg,#dbeafe,#ffffff 60%)"
          darkAccent="radial-gradient(60% 60% at 0% 0%, rgba(59,130,246,0.18), transparent 60%)"
          items={getSectionItems(sections, 'results')}
        />
        <UpdateCard
          title="Admit Cards"
          count="128"
          icon={BadgeCheck}
          href={homePageLinks.admitCards}
          accent="linear-gradient(135deg,#ede9fe,#ffffff 60%)"
          darkAccent="radial-gradient(60% 60% at 0% 0%, rgba(167,139,250,0.18), transparent 60%)"
          items={getSectionItems(sections, 'admit-cards')}
        />
        <UpdateCard
          title="New Online Forms"
          count="342"
          icon={Briefcase}
          href={homePageLinks.jobs}
          accent="linear-gradient(135deg,#ffedd5,#ffffff 60%)"
          darkAccent="radial-gradient(60% 60% at 0% 0%, rgba(251,146,60,0.18), transparent 60%)"
          items={getSectionItems(sections, 'jobs')}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="relative overflow-hidden rounded-3xl p-5 text-white md:col-span-2" style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)' }}>
          <div className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full opacity-50" style={{ background: 'radial-gradient(circle,#22d3ee,transparent 70%)' }} />
          <div className="relative">
            <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.08em] text-cyan-300">
              <Sparkles size={12} />
              AI ANSWER KEY ANALYSER
            </div>
            <h3 className="mt-2 text-[22px] font-extrabold tracking-[-0.02em]">Upload your OMR. Get a predicted score in 8 seconds.</h3>
            <p className="mt-2 max-w-md text-[13px] text-white/70">
              Trained on 12 years of cut-offs across 84 exams. Free for the first attempt every day.
            </p>
            <Link href={homePageLinks.answerKey} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-[12px] font-bold text-slate-900">
              Try the analyser
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04] dark:backdrop-blur-xl">
          <div className="text-[11px] font-bold tracking-[0.08em] text-gray-500 dark:text-white/50">THIS WEEK</div>
          <h3 className="mt-1 text-[18px] font-extrabold tracking-[-0.02em] text-gray-900 dark:text-white">14 forms close in 7 days</h3>
          <div className="mt-3 space-y-2">
            {[
              { name: 'SBI Clerk 2026', left: '1d 4h', width: '92%' },
              { name: 'DSSSB TGT/PGT', left: '3d', width: '65%' },
              { name: 'MP Police', left: '5d', width: '40%' },
            ].map((item) => (
              <div key={item.name}>
                <div className="flex justify-between text-[11px]">
                  <span className="font-semibold text-gray-700 dark:text-white/80">{item.name}</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">{item.left}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                  <div className="h-full rounded-full" style={{ width: item.width, background: 'linear-gradient(90deg,#f43f5e,#f59e0b)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function AiPicks() {
  return (
    <section className="mx-auto mt-8 max-w-6xl px-4">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.08em] text-violet-600 dark:text-violet-400">
            <Star size={12} />
            PERSONALISED BY AI
          </div>
          <h2 className="text-[22px] font-extrabold tracking-[-0.02em] text-gray-900 dark:text-white">For you, based on your profile</h2>
          <p className="mt-0.5 text-[12px] text-gray-500 dark:text-white/50">Match scores update as you save, apply or skip jobs.</p>
        </div>
        <Link href={homePageLinks.profile} className="hidden items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10 sm:flex">
          <Sparkles size={11} />
          Tune preferences
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {aiPicks.map((pick) => (
          <div
            key={pick.title}
            className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-white transition-all hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/[0.04] dark:backdrop-blur-xl dark:hover:shadow-violet-500/10"
          >
            <div className={`h-1.5 bg-gradient-to-r ${pick.gradient}`} />
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r px-2 py-1 text-[10.5px] font-bold text-white ${pick.gradient}`}>
                  <Star size={10} className="fill-white" />
                  {pick.match} match
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
                    aria-label="Save recommendation"
                  >
                    <Bookmark size={13} />
                  </button>
                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
                    aria-label="Dismiss recommendation"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
              <h3 className="mt-3 text-[15px] font-extrabold leading-snug tracking-[-0.01em] text-gray-900 dark:text-white">{pick.title}</h3>
              <p className="mt-1 text-[11.5px] text-gray-500 dark:text-white/50">{pick.org}</p>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  ['POSTS', pick.posts],
                  ['SALARY', pick.salary],
                  ['CLOSES', pick.closes],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-gray-50 p-2 dark:bg-white/5">
                    <div className="text-[9px] font-semibold tracking-[0.04em] text-gray-400 dark:text-white/40">{label}</div>
                    <div className="truncate text-[11px] font-bold text-gray-900 dark:text-white">{value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {pick.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-white/10 dark:text-white/70">
                    {tag}
                  </span>
                ))}
              </div>

              <Link href={pick.href} className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-indigo-700 to-cyan-500 py-2.5 text-[12px] font-bold text-white">
                View full detail
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ExploreGrid() {
  return (
    <section className="mx-auto mt-10 max-w-6xl px-4 pb-12">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04] dark:backdrop-blur-xl lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold tracking-[0.08em] text-gray-500 dark:text-white/50">EXPLORE BY SECTOR</div>
              <h2 className="text-[20px] font-extrabold tracking-[-0.02em] text-gray-900 dark:text-white">10,500+ vacancies across India</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {sectors.map((sector) => (
              <Link
                key={sector.label}
                href={buildJobsPath({ department: sector.department })}
                className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-3 transition hover:-translate-y-0.5 hover:border-gray-300 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20"
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${sector.gradient} shadow-sm`}>
                  <sector.icon size={16} className="text-white" />
                </div>
                <div className="mt-3 text-[12.5px] font-bold text-gray-900 dark:text-white">{sector.label}</div>
                <div className="text-[10.5px] text-gray-500 dark:text-white/50">{sector.count} open</div>
                <ArrowRight size={12} className="absolute right-3 top-3 text-gray-300 transition group-hover:text-gray-700 dark:text-white/30 dark:group-hover:text-white" />
              </Link>
            ))}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl p-5 text-white" style={{ background: 'linear-gradient(135deg,#111827,#1f2937)' }}>
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full opacity-40" style={{ background: 'radial-gradient(circle,#a78bfa,transparent 70%)' }} />
          <div className="relative">
            <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.08em] text-violet-300">
              <BadgeCheck size={12} />
              VERIFIED SOURCES
            </div>
            <h3 className="mt-2 text-[18px] font-extrabold tracking-[-0.02em]">Every notification is cross-checked with official portals.</h3>
            <p className="mt-2 text-[12px] text-white/60">We pull data directly from these issuing bodies — no rumours, no stale links.</p>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {sources.map((source) => (
                <div key={source} className="rounded-xl border border-white/10 bg-white/5 py-2 text-center text-[10.5px] font-bold text-white/80">
                  {source}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04] dark:backdrop-blur-xl">
        <div className="mb-3 flex items-center gap-2">
          <MapPin size={14} className="text-rose-500" />
          <h2 className="text-[14px] font-extrabold text-gray-900 dark:text-white">Browse by State</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {states.map((state) => (
            <Link
              key={state}
              href={`/states/${toStateSlug(state)}`}
              className="rounded-full border border-gray-200 px-3 py-1.5 text-[12px] font-semibold text-gray-700 transition hover:border-gray-900 hover:bg-gray-900 hover:text-white dark:border-white/10 dark:text-white/80 dark:hover:border-white dark:hover:bg-white dark:hover:text-slate-900"
            >
              {state}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const sections = await getHomepageSections();

  return (
    <PublicSiteShell>
      <HeroSection />
      <ExamPulse />
      <LatestUpdates sections={sections} />
      <AiPicks />
      <ExploreGrid />
    </PublicSiteShell>
  );
}
