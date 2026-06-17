import {
  ArrowRight,
  Award,
  BadgeCheck,
  Bell,
  BookOpen,
  Briefcase,
  CalendarDays,
  ChevronRight,
  Clock,
  ClipboardList,
  FileCheck,
  FileText,
  GraduationCap,
  LayoutGrid,
  Search,
  ShieldCheck,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

import { SafeLink } from '@/app/components/public-site/SafeLink';
import { PublicSiteShell } from '@/app/components/public-site/PublicSiteShell';
import { buildJobsPath } from '@/app/lib/public-content';
import { getHomepageSections } from '@/lib/content-api';
import { HomePageLinkItem, HomePageSectionBox } from './HomePageSectionBox';
import { HomePageQuickLinks } from './HomePageQuickLinks';
import { homePageLinks } from './links';

type AuthTab = 'login' | 'register';

interface HomePageProps {
  initialAuthTab?: AuthTab;
}

const stats = [
  { icon: Briefcase, value: '12,450', label: 'Active Jobs', color: '#fbbf24' },
  { icon: FileCheck, value: '128', label: 'Admit Cards', color: '#7dd3fc' },
  { icon: ClipboardList, value: '89', label: 'New Results', color: '#86efac' },
  { icon: TrendingUp, value: '342', label: 'Added Today', color: '#f9a8d4' },
] as const;

const categories = [
  { icon: Briefcase, label: 'Latest Jobs', count: '12,450', color: '#dc2626', bg: '#fee2e2', href: homePageLinks.jobs },
  { icon: ClipboardList, label: 'Results', count: '89', color: '#1d4ed8', bg: '#dbeafe', href: homePageLinks.results },
  { icon: FileCheck, label: 'Admit Card', count: '128', color: '#7c3aed', bg: '#ede9fe', href: homePageLinks.admitCards },
  { icon: BookOpen, label: 'Answer Key', count: '24', color: '#0d9488', bg: '#ccfbf1', href: homePageLinks.answerKey },
  { icon: LayoutGrid, label: 'Syllabus', count: '22+', color: '#ea580c', bg: '#ffedd5', href: homePageLinks.syllabus },
  { icon: GraduationCap, label: 'Admission', count: '18', color: '#be185d', bg: '#fce7f3', href: homePageLinks.admissions },
  { icon: Award, label: 'Board Result', count: '16', color: '#b45309', bg: '#fef3c7', href: homePageLinks.boardResults },
  { icon: FileText, label: 'Scholarship', count: '14', color: '#166534', bg: '#dcfce7', href: homePageLinks.scholarship },
] as const;

const popular = ['SSC CGL 2026', 'UPSC CSE', 'IBPS PO', 'RRB Group D', 'SBI Clerk'];

const featured = [
  {
    chip: 'RECRUITMENT',
    chipBg: '#fee2e2',
    chipFg: '#b91c1c',
    accent: '#dc2626',
    title: 'SSC CGL 2026',
    sub: 'Combined Graduate Level - Tier I',
    org: 'Staff Selection Commission',
    orgShort: 'SSC',
    posts: '14,582',
    qual: 'Graduate',
    lastDate: '30 May 2026',
    daysLeft: 15,
    urgency: 50,
    href: '/jobs/ssc-cgl-2026',
  },
  {
    chip: 'BANKING',
    chipBg: '#dbeafe',
    chipFg: '#1d4ed8',
    accent: '#1d4ed8',
    title: 'IBPS PO 2026',
    sub: 'Probationary Officer - CRP-PO/MT-XV',
    org: 'IBPS',
    orgShort: 'IBPS',
    posts: '4,500',
    qual: 'Graduate',
    lastDate: '20 May 2026',
    daysLeft: 5,
    urgency: 12,
    href: '/jobs/ibps-po-2026',
  },
  {
    chip: 'RAILWAY',
    chipBg: '#fef3c7',
    chipFg: '#b45309',
    accent: '#ea580c',
    title: 'RRB Group D',
    sub: 'Level-1 Posts in Various Departments',
    org: 'Railway Recruitment Board',
    orgShort: 'RRB',
    posts: '32,000',
    qual: '10th Pass',
    lastDate: '20 May 2026',
    daysLeft: 5,
    urgency: 8,
    href: '/jobs/rrb-group-d-level-1-2026',
  },
] as const;

const notifications = [
  { text: 'SSC CGL 2026 Notification Released - Apply before 15 May 2026', tag: 'new' },
  { text: 'UPSC CSE Prelims 2026 - Admit Card Available Now', tag: 'hot' },
  { text: 'RRB Group D 2026 - Last Date Extended to 20 May', tag: 'update' },
  { text: 'IBPS PO 2026 - Online Application Starts 10 May', tag: 'new' },
  { text: 'Bihar BPSC 70th CCE Result Declared - Check Now', tag: 'hot' },
  { text: 'SBI Clerk 2026 - 8,773 Vacancies Open Now', tag: 'new' },
] as const;

const upcomingExams = [
  { exam: 'UPSC CSE Prelims 2026', date: '25 May 2026', days: 10 },
  { exam: 'SSC CGL Tier 1 2026', date: '01 Jun 2026', days: 17 },
  { exam: 'IBPS PO Prelims 2026', date: '14 Jun 2026', days: 30 },
  { exam: 'NDA 2026 (II) Exam', date: '06 Sep 2026', days: 114 },
  { exam: 'RRB Group D CBT 2026', date: 'Jul 2026', days: 47 },
] as const;

const linkSections = {
  jobs: [
    ['SSC CGL 2026 - Combined Graduate Level Exam', 'Staff Selection Commission', '15 May', 'hot', '14,582', 'Graduate'],
    ['IBPS PO 2026 - Probationary Officer', 'IBPS', '14 May', 'new', '4,500', 'Graduate'],
    ['Railway RRB Group D - Level 1 Posts', 'Railway Recruitment Board', '13 May', 'new', '32,000', '10th Pass'],
    ['UPSC NDA/NA 2026 - National Defence Academy', 'UPSC', '12 May', 'last-date', '400', '12th Pass'],
    ['Bihar Police Constable Recruitment 2026', 'CSBC Bihar', '10 May', 'new', '21,391', '12th Pass'],
    ['UPPSC PCS 2026 - Provincial Civil Service', 'UPPSC', '09 May', undefined, '250', 'Graduate'],
    ['DSSSB TGT/PGT Teacher Recruitment 2026', 'DSSSB Delhi', '08 May', 'new', '5,118', 'B.Ed'],
    ['SBI Clerk 2026 - Junior Associate', 'State Bank of India', '06 May', 'hot', '8,773', 'Graduate'],
  ],
  results: [
    ['UPSC Civil Services 2025 - Final Result', 'UPSC', '15 May', 'hot', '933'],
    ['SSC CHSL 2025 - Tier 2 Result', 'SSC', '14 May', 'new', '6,500'],
    ['IBPS Clerk Mains 2025 - Result Declared', 'IBPS', '13 May', 'new', '5,000'],
    ['RRB NTPC CBT 2 Result 2025', 'RRB', '12 May', undefined, '35,208'],
    ['NTA CUET UG 2026 - Score Card Released', 'NTA', '11 May', 'new'],
    ['Bihar BPSC 69th CCE - Final Result', 'BPSC', '09 May', 'hot', '553'],
    ['SSC MTS 2025 - Tier 1 Result', 'SSC', '08 May', undefined, '9,500'],
    ['RBI Grade B 2025 - Phase II Result', 'RBI', '04 May', 'new', '143'],
  ],
  admitCards: [
    ['SSC GD Constable 2026 - PET/PST Admit Card', 'SSC', '15 May', 'hot', '46,617'],
    ['UPSC EPFO 2026 Admit Card', 'UPSC', '14 May', 'new', '577'],
    ['NTA CUET UG 2026 - City Slip Released', 'NTA', '13 May', 'new'],
    ['Bihar STET 2026 Admit Card', 'BSEB', '12 May'],
    ['SSC CGL 2026 - Tier 1 Admit Card', 'SSC', '11 May', 'new', '14,582'],
    ['IBPS PO Prelims 2026 - Call Letter', 'IBPS', '10 May', undefined, '4,500'],
    ['Railway Group D CBT Admit Card 2026', 'RRB', '09 May', undefined, '32,000'],
    ['UPSC CSE Prelims 2026 - e-Admit Card', 'UPSC', '08 May', 'hot'],
  ],
  answerKeys: [
    ['SSC CGL 2025 Tier 1 - Answer Key Released', 'SSC', '14 May', 'hot', '14,000'],
    ['UPSC CAPF 2025 - Answer Key', 'UPSC', '13 May', 'new', '322'],
    ['NTA UGC NET Dec 2025 - Answer Key', 'NTA', '12 May', 'new'],
    ['CTET 2025 (Dec) - Answer Key Available', 'CBSE', '11 May'],
    ['RRB NTPC CBT 2 - Answer Key', 'RRB', '10 May', undefined, '35,208'],
    ['SSC CHSL 2025 Tier 2 - Answer Key', 'SSC', '09 May', 'update', '6,500'],
  ],
  admissions: [
    ['DU Undergraduate Admission 2026 - CUET Based', 'Delhi University', '15 May', 'new'],
    ['JEE Advanced 2026 - Registration Open', 'IIT Kanpur', '14 May', 'hot'],
    ['NEET UG 2026 - Application Form Out', 'NTA', '13 May', 'new'],
    ['IIM CAT 2026 - Admission Process Begins', 'IIMs', '12 May', 'hot'],
    ['IGNOU July 2026 Admission Open', 'IGNOU', '11 May', 'new'],
    ['BHU UET 2026 - Online Registration', 'Banaras Hindu University', '10 May'],
  ],
  syllabus: [
    ['SSC CGL 2026 - Revised Syllabus & Exam Pattern', 'SSC', '15 May', 'new'],
    ['UPSC CSE 2026 - Prelims + Mains Syllabus', 'UPSC', '14 May'],
    ['RRB Group D 2026 - CBT Syllabus', 'RRB', '13 May', 'new'],
    ['IBPS PO 2026 - Prelims & Mains Syllabus', 'IBPS', '12 May'],
    ['Bihar BPSC 71st CCE - Syllabus Released', 'BPSC', '11 May', 'new'],
    ['CTET 2026 - Paper I & Paper II Syllabus', 'CBSE', '10 May', 'update'],
  ],
  board: [
    ['UP Board Class 12 Result 2026', 'UPMSP', '14 May', 'hot'],
    ['CBSE Class 10 & 12 Result 2026', 'CBSE', '13 May', 'new'],
    ['Bihar Board Matric Result 2026', 'BSEB', '12 May', 'hot'],
    ['Rajasthan Board (RBSE) 12th Result 2026', 'RBSE', '11 May', 'new'],
    ['MP Board MPBSE 10th Result 2026', 'MPBSE', '10 May'],
    ['Maharashtra SSC Result 2026', 'MSBSHSE', '09 May', 'new'],
  ],
  scholarship: [
    ['PM Scholarship Scheme 2026 - Apply Now', 'Ministry of Education', '15 May', 'new'],
    ['NSP National Scholarship Portal 2026', 'Govt of India', '14 May', 'hot'],
    ['UP Scholarship 2026-27 - Registration Open', 'Samaj Kalyan UP', '13 May', 'new'],
    ['Bihar SC/ST/OBC Scholarship 2026', 'Bihar Govt', '12 May'],
    ['CSSS Central Sector Scholarship 2026', 'Dept of HE', '11 May', 'new'],
    ['Post Matric Scholarship OBC 2026', 'Ministry of Social Justice', '09 May', 'update'],
  ],
} as const;

type LinkTuple = readonly [string, string, string, ('new' | 'hot' | 'update' | 'last-date')?, string?, string?];
type HomepageSections = Awaited<ReturnType<typeof getHomepageSections>>;
type HomepageCard = HomepageSections[keyof HomepageSections][number];

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

function orgColors(name: string): [string, string] {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0;
  }
  return monoPalette[hash % monoPalette.length];
}

function itemHref(title: string, fallback: string) {
  return `${fallback}?search=${encodeURIComponent(title.split(' - ')[0])}`;
}

function renderHomepageCards(items: readonly HomepageCard[]) {
  return items.map((item) => (
    <HomePageLinkItem
      key={item.id}
      href={item.href}
      title={item.title}
      org={item.org}
      date={item.date}
      tag={item.tag}
      postCount={item.postCount}
      qualification={item.qualification}
    />
  ));
}

function renderItems(items: readonly LinkTuple[], href: string) {
  return items.map(([title, org, date, tag, postCount, qualification]) => (
    <HomePageLinkItem
      key={`${title}-${org}`}
      href={itemHref(title, href)}
      title={title}
      org={org}
      date={date}
      tag={tag}
      postCount={postCount}
      qualification={qualification}
    />
  ));
}

function Hero() {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        background:
          'radial-gradient(1100px 520px at 8% -10%, #1e3a8a 0%, transparent 55%),radial-gradient(900px 440px at 92% 0%, #6d28d9 0%, transparent 55%),radial-gradient(700px 400px at 50% 120%, #0ea5e9 0%, transparent 50%),linear-gradient(135deg, #0b1437 0%, #0a1230 55%, #0b1024 100%)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 72%)',
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,rgba(253,216,53,0.45)_50%,transparent)]" />

      <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-8">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#fde68a,#fbbf24)] px-2.5 py-1 text-[9.5px] font-extrabold tracking-[0.08em] text-[#0b1437]">
            <Zap size={9} fill="currentColor" /> #1 GOVT JOBS PORTAL
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.09] px-2.5 py-1 text-[9.5px] font-bold text-white/80 ring-1 ring-white/20 backdrop-blur">
            <ShieldCheck size={10} className="text-emerald-300" /> Verified Daily
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.09] px-2.5 py-1 text-[9.5px] font-bold text-white/80 ring-1 ring-white/20 backdrop-blur">
            <BadgeCheck size={10} className="text-sky-300" /> All India - 28 States
          </span>
        </div>

        <div className="grid items-center gap-6 lg:grid-cols-[1fr_auto]">
          <div>
            <h1 className="text-[34px] font-black leading-[1.04] tracking-normal text-white sm:text-[40px]">
              India&apos;s trusted{' '}
              <span className="bg-[linear-gradient(135deg,#fde68a_0%,#fbbf24_45%,#f97316_100%)] bg-clip-text text-transparent">
                Sarkari Naukri
              </span>
              <br />
              <span className="text-white/85">portal - updated daily.</span>
            </h1>
            <p className="mt-3 max-w-lg text-[13.5px] font-medium leading-6 text-blue-100/60">
              Govt job notifications, admit cards, results, answer keys & syllabi - all in one place, always fresh.
            </p>
          </div>

          <div className="hidden shrink-0 grid-cols-2 gap-2 rounded-2xl bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] p-3 ring-1 ring-white/[0.14] backdrop-blur lg:grid">
            {stats.map(({ icon: Icon, value, label, color }) => (
              <div key={label} className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] px-2.5 py-2 ring-1 ring-white/[0.08]">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl" style={{ background: `${color}20` }}>
                  <Icon size={14} style={{ color }} />
                </div>
                <div className="leading-tight">
                  <div className="text-[15px] font-extrabold tabular-nums text-white">{value}</div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.05em] text-white/40">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <form action={homePageLinks.jobs} className="mt-6 flex max-w-2xl gap-2">
          <div className="flex flex-1 items-center gap-2.5 rounded-2xl border border-white/20 bg-white/[0.09] px-4 py-3.5 shadow-[0_4px_28px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur transition focus-within:ring-2 focus-within:ring-yellow-400/60">
            <Search size={16} className="shrink-0 text-blue-200/70" />
            <input
              name="search"
              placeholder="Search jobs, exams, results, admit cards..."
              className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-blue-200/35"
            />
          </div>
          <button
            type="submit"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-[linear-gradient(135deg,#fde68a,#f59e0b)] px-5 py-3.5 text-[13px] font-extrabold text-[#0b1437] shadow-[0_8px_28px_rgba(245,158,11,0.42),0_2px_8px_rgba(245,158,11,0.22)] transition hover:brightness-110 active:scale-95"
          >
            Search <ArrowRight size={14} />
          </button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="shrink-0 text-[11px] font-bold text-white/40">Popular:</span>
          {popular.map((label) => (
            <Link
              key={label}
              href={buildJobsPath({ search: label })}
              className="shrink-0 rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-white/65 ring-1 ring-white/[0.14] transition hover:bg-white/[0.14] hover:text-white"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoryStrip() {
  return (
    <div className="border-b border-gray-200 bg-white shadow-sm dark:border-white/[0.07] dark:bg-[#0c1120]">
      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="grid grid-cols-4 gap-1 sm:grid-cols-8">
          {categories.map(({ icon: Icon, label, count, color, bg, href }) => (
            <Link key={label} href={href} className="group flex flex-col items-center gap-1.5 rounded-xl px-1 py-3 transition hover:bg-gray-50 dark:hover:bg-white/[0.04]">
              <div className="grid h-11 w-11 place-items-center rounded-2xl ring-1 ring-black/[0.05] transition group-hover:scale-110 group-hover:shadow-lg dark:ring-white/[0.07]" style={{ background: bg }}>
                <Icon size={19} style={{ color }} />
              </div>
              <span className="text-center text-[10.5px] font-bold leading-snug text-gray-700 transition group-hover:text-orange-600 dark:text-gray-300 dark:group-hover:text-orange-400">
                {label}
              </span>
              <span className="rounded-full px-1.5 py-0.5 text-[8.5px] font-extrabold tabular-nums" style={{ background: `${color}14`, color }}>
                {count}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeaturedSpotlight() {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-6">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className="mb-0.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-orange-600 dark:text-orange-400">Closing Soon</div>
          <h2 className="text-[19px] font-extrabold tracking-normal text-gray-900 dark:text-white">Top recruitments this week</h2>
        </div>
        <Link href={homePageLinks.jobs} className="hidden items-center gap-1 text-[12px] font-bold text-gray-500 transition hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-300 sm:inline-flex">
          View all <ChevronRight size={12} />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((item) => {
          const [orgBg, orgFg] = orgColors(item.org);
          const isUrgent = item.daysLeft <= 7;

          return (
            <article
              key={item.title}
              className="group relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:ring-2 hover:ring-orange-300 dark:bg-[#0f172a] dark:ring-white/[0.09] dark:hover:ring-orange-500/40"
            >
              <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: `linear-gradient(90deg, ${item.accent}, ${item.accent}55 65%, transparent)` }} />
              <div className="absolute inset-x-0 top-1.5 h-0.5 bg-gray-100 dark:bg-white/[0.04]">
                <div className="h-full" style={{ width: `${item.urgency}%`, background: isUrgent ? 'linear-gradient(90deg,#ef4444,#f97316)' : `linear-gradient(90deg,${item.accent}cc,${item.accent}44)` }} />
              </div>
              <div className="pointer-events-none absolute -bottom-5 -right-3 select-none text-[100px] font-black leading-none tracking-normal opacity-[0.055] dark:opacity-[0.10]" style={{ color: item.accent }}>
                {item.title.split(' ')[0]}
              </div>

              <div className="relative p-4 pt-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="rounded-lg px-2 py-0.5 text-[9px] font-extrabold tracking-[0.07em]" style={{ background: item.chipBg, color: item.chipFg }}>
                    {item.chip}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold" style={{ color: isUrgent ? '#dc2626' : '#d97706', background: isUrgent ? '#fef2f2' : '#fffbeb' }}>
                      <Clock size={9} />
                      {item.daysLeft}d left
                    </span>
                    <div className="grid h-7 w-7 place-items-center rounded-xl ring-1 ring-black/[0.05] dark:ring-white/[0.10]" style={{ background: orgBg }} title={item.org}>
                      <span className="text-[8.5px] font-black tracking-normal" style={{ color: orgFg }}>{item.orgShort}</span>
                    </div>
                  </div>
                </div>

                <h3 className="text-[19px] font-extrabold tracking-normal">
                  <SafeLink
                    href={item.href}
                    className="text-gray-900 transition hover:text-orange-600 hover:underline hover:decoration-orange-300 hover:underline-offset-4 dark:text-white dark:hover:text-orange-300"
                  >
                    {item.title}
                  </SafeLink>
                </h3>
                <p className="mt-0.5 text-[12px] font-medium leading-snug text-gray-500 dark:text-gray-400">{item.sub}</p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-700 dark:bg-white/[0.06] dark:text-gray-200">
                    <Users size={10} /> {item.posts} Posts
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-700 dark:bg-white/[0.06] dark:text-gray-200">
                    <GraduationCap size={10} /> {item.qual}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-700 dark:bg-white/[0.06] dark:text-gray-200">
                    <CalendarDays size={10} /> {item.lastDate}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3 dark:border-white/[0.07]">
                  <SafeLink href={item.href} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-extrabold transition-all hover:gap-2" style={{ background: `linear-gradient(135deg,${item.accent}18,${item.accent}08)`, border: `1.5px solid ${item.accent}28`, color: item.accent }}>
                    Apply Online <ArrowRight size={12} />
                  </SafeLink>
                  <span className="max-w-[110px] truncate text-[10.5px] text-gray-400 dark:text-gray-500">{item.org}</span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function NotificationsPanel() {
  const tagMap = {
    new: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
    hot: 'bg-gradient-to-r from-red-500 to-rose-600',
    update: 'bg-gradient-to-r from-sky-500 to-blue-600',
  } as const;

  return (
    <div className="relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 transition-shadow hover:shadow-md dark:bg-[#0f172a] dark:ring-white/[0.09]">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,#ea580c,#f59e0b_60%,transparent)]" />
      <div className="relative flex items-end justify-between gap-3 border-b border-gray-100 px-4 pb-3 pt-3.5 dark:border-white/[0.07]">
        <div className="pointer-events-none absolute -top-3 right-2 select-none text-[56px] font-black leading-none tracking-normal text-[#ea580c] opacity-[0.065] dark:opacity-[0.10]">
          Alerts
        </div>
        <div className="relative z-10">
          <div className="mb-0.5 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
            </span>
            <div className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-[#ea580c]">Live Feed</div>
          </div>
          <h2 className="flex items-center gap-1.5 text-[14.5px] font-extrabold tracking-normal text-gray-900 dark:text-white">
            <Bell size={13} className="text-orange-500" />
            Important Notifications
          </h2>
        </div>
        <Link href={homePageLinks.results} className="relative z-10 inline-flex shrink-0 items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-1 text-[10.5px] font-extrabold tracking-[0.04em] text-[#ea580c] transition-all hover:gap-1.5">
          VIEW ALL <ChevronRight size={11} />
        </Link>
      </div>

      <div className="divide-y divide-gray-100/80 dark:divide-white/[0.05]">
        {notifications.map((item, index) => (
          <div
            key={`${item.text}-${index}`}
            className="group flex items-start gap-2.5 px-3.5 py-2.5 transition hover:bg-gradient-to-r hover:from-orange-50/60 hover:to-transparent dark:hover:from-orange-500/[0.06]"
          >
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400 transition group-hover:scale-125" />
            <p className="flex-1 text-[12.5px] font-semibold leading-snug text-gray-800 transition group-hover:text-[#c2410c] dark:text-gray-100 dark:group-hover:text-orange-300">
              {item.text}
            </p>
            <span className={`mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[8.5px] font-extrabold text-white shadow-sm ring-1 ring-white/30 ${tagMap[item.tag]} ${item.tag !== 'update' ? 'animate-pulse' : ''}`}>
              {item.tag === 'hot' ? 'HOT' : item.tag.toUpperCase()}
            </span>
            <SafeLink
              href={homePageLinks.results}
              aria-label={`Open notification: ${item.text}`}
              className="mt-0.5 rounded-md p-1 text-gray-300 opacity-0 transition hover:bg-orange-50 hover:text-orange-600 group-hover:opacity-100 dark:text-gray-600 dark:hover:bg-orange-500/10 dark:hover:text-orange-300"
            >
              <ArrowRight size={11} />
            </SafeLink>
          </div>
        ))}
      </div>

      <div className="mt-auto border-t border-gray-100 bg-gradient-to-br from-orange-50/70 to-amber-50/40 px-3.5 py-3 dark:border-white/[0.07] dark:from-orange-950/15 dark:to-amber-950/10">
        <div className="mb-2.5 flex items-center gap-1.5">
          <Clock size={11} className="text-orange-500" />
          <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-gray-600 dark:text-gray-400">Upcoming Exam Dates</span>
        </div>
        <div className="space-y-1">
          {upcomingExams.map((exam) => (
            <div key={exam.exam} className="-mx-2 flex items-center justify-between rounded-lg px-2 py-1 transition hover:bg-white/70 dark:hover:bg-white/[0.04]">
              <SafeLink href={buildJobsPath({ search: exam.exam })} className="min-w-0 truncate text-[12px] font-semibold text-gray-700 transition hover:text-orange-600 hover:underline hover:underline-offset-2 dark:text-gray-300 dark:hover:text-orange-300">
                {exam.exam}
              </SafeLink>
              <div className="ml-2 flex shrink-0 items-center gap-1.5">
                <span className="text-[10.5px] font-bold tabular-nums text-gray-600 dark:text-gray-400">{exam.date}</span>
                <span className="rounded-md px-1.5 py-0.5 text-[9.5px] font-extrabold tabular-nums" style={{ background: exam.days <= 15 ? '#fef2f2' : '#f0fdf4', color: exam.days <= 15 ? '#dc2626' : '#16a34a' }}>
                  {exam.days}d
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MainGrid({ sections }: { sections: HomepageSections }) {
  const jobs = sections.jobs || [];
  const results = sections.results || [];
  const admitCards = sections['admit-cards'] || [];
  const answerKeys = sections['answer-keys'] || [];
  const admissions = sections.admissions || [];

  return (
    <>
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <HomePageSectionBox title="Latest Jobs / Online Form" headerColor="bg-[#d32f2f]" kicker="Recruitment" count={jobs.length} viewAllLink={homePageLinks.jobs}>
            {renderHomepageCards(jobs)}
          </HomePageSectionBox>
          <HomePageSectionBox title="Latest Result" headerColor="bg-[#1565c0]" kicker="Results" count={results.length} viewAllLink={homePageLinks.results}>
            {renderHomepageCards(results)}
          </HomePageSectionBox>
          <HomePageSectionBox title="Latest Admit Card" headerColor="bg-[#6a1b9a]" kicker="Hall Tickets" count={admitCards.length} viewAllLink={homePageLinks.admitCards}>
            {renderHomepageCards(admitCards)}
          </HomePageSectionBox>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <HomePageSectionBox title="Answer Key" headerColor="bg-[#00695c]" kicker="Answers" count={answerKeys.length} viewAllLink={homePageLinks.answerKey}>
            {renderHomepageCards(answerKeys)}
          </HomePageSectionBox>
          <NotificationsPanel />
          <HomePageSectionBox title="Latest Admission" headerColor="bg-[#ad1457]" kicker="Admissions" count={admissions.length} viewAllLink={homePageLinks.admissions}>
            {renderHomepageCards(admissions)}
          </HomePageSectionBox>
        </div>
      </div>

      <HomePageQuickLinks />

      <div className="mx-auto max-w-6xl px-4 pb-8">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <HomePageSectionBox title="Latest Syllabus" headerColor="bg-[#283593]" kicker="Study Material" count={22} viewAllLink={homePageLinks.syllabus}>
            {renderItems(linkSections.syllabus, homePageLinks.syllabus)}
          </HomePageSectionBox>
          <HomePageSectionBox title="Board Results" headerColor="bg-[#4e342e]" kicker="Boards" count={16} viewAllLink={homePageLinks.boardResults}>
            {renderItems(linkSections.board, homePageLinks.boardResults)}
          </HomePageSectionBox>
          <HomePageSectionBox title="Scholarship / Yojana" headerColor="bg-[#1b5e20]" kicker="Schemes" count={14} viewAllLink={homePageLinks.scholarship}>
            {renderItems(linkSections.scholarship, homePageLinks.scholarship)}
          </HomePageSectionBox>
        </div>
      </div>
    </>
  );
}

export default async function HomePage({ initialAuthTab }: HomePageProps) {
  const sections = await getHomepageSections();

  return (
    <PublicSiteShell initialAuthTab={initialAuthTab}>
      <Hero />
      <CategoryStrip />
      <FeaturedSpotlight />
      <MainGrid sections={sections} />
    </PublicSiteShell>
  );
}
