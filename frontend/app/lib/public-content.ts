import { siteConfig } from '../../lib/seo';

export type LinkItemTag = 'new' | 'hot' | 'update' | 'last-date';

export type AnnouncementSection =
  | 'jobs'
  | 'results'
  | 'admit-cards'
  | 'answer-keys'
  | 'admissions';

export type ResourceCategorySlug = 'syllabus' | 'board-results' | 'scholarship';
export type InfoPageSlug =
  | 'bookmarks'
  | 'profile'
  | 'about'
  | 'contact'
  | 'privacy'
  | 'disclaimer'
  | 'advertise';
export type AuxiliaryPageSlug = 'certificates' | 'important' | 'app';
export type CommunityChannel =
  | 'telegram'
  | 'whatsapp'
  | 'twitter'
  | 'youtube'
  | 'instagram'
  | 'facebook';

export interface PublicStat {
  label: string;
  value: string;
}

function isInternalHref(value: string) {
  return (value.startsWith('/') || value.startsWith('#')) && !value.startsWith('//');
}
function isExternalHref(value: string) {
  return /^https?:\/\//i.test(value);
}
export function normalizeHref(value?: string | null): string | null {
  const href = value?.trim();
  if (!href) return null;
  if (isInternalHref(href) || isExternalHref(href)) return href;
  return null;
}
export function normalizeInternalHref(value?: string | null): string | null {
  const href = normalizeHref(value);
  return href && isInternalHref(href) ? href : null;
}
export function normalizeExternalHref(value?: string | null): string | null {
  const href = normalizeHref(value);
  return href && isExternalHref(href) ? href : null;
}

export interface QuickLink {
  href: string;
  label: string;
}

export interface PortalListEntry {
  date: string;
  href: string;
  org: string;
  postCount?: string;
  qualification?: string;
  tag?: LinkItemTag;
  title: string;
}

export interface ResourceCard {
  description: string;
  href: string;
  label: string;
}

export type DetailStatus = 'done' | 'active' | 'upcoming';
export type DetailNoticeTone = 'info' | 'success' | 'warning';
export type DetailLinkEmphasis = 'primary' | 'secondary' | 'muted';

export interface DetailNotice {
  body: string[];
  tone: DetailNoticeTone;
  title: string;
}

export interface DetailDateRow {
  date: string;
  label: string;
  status?: DetailStatus;
}

export interface DetailFeeRow {
  label: string;
  value: string;
}

export interface DetailAgeLimit {
  points: string[];
  summary: string;
}

export interface DetailEligibilityBlock {
  description: string;
  title: string;
}

export interface DetailVacancyRow {
  department: string;
  payLevel?: string;
  post: string;
  salary?: string;
  vacancies: string;
}

export interface DetailVacancyTable {
  columns: string[];
  rows: DetailVacancyRow[];
}

export type DetailImportantLinkType =
  | 'apply'
  | 'download'
  | 'website'
  | 'disabled'
  | 'result'
  | 'category'
  | 'resource';

export type DetailImportantLinkIcon =
  | 'apply'
  | 'pdf'
  | 'doc'
  | 'web'
  | 'card'
  | 'result'
  | 'link';

export interface DetailImportantLink {
  emphasis?: DetailLinkEmphasis;
  href: string;
  icon?: DetailImportantLinkIcon;
  label: string;
  note?: string;
  type?: DetailImportantLinkType;
}

export interface DetailExtraSection {
  eyebrow?: string;
  id: string;
  paragraphs?: string[];
  points?: string[];
  title: string;
}

export interface DetailThemeTokens {
  accent: string;
  gradientFrom: string;
  gradientTo: string;
  sidebarFrom?: string;
  sidebarTo?: string;
}

export interface DetailEngagement {
  comments: number;
  likes: string;
  views: string;
}

export interface DetailSummaryMeta {
  ageLimit?: string;
  applicationStartDate: string;
  examDate: string;
  lastDate: string;
  location: string;
  orgShort: string;
  publishedDate: string;
  salary: string;
}

export interface DetailQaAnswer {
  author: string;
  avatarColor: string;
  id: number;
  initials: string;
  isBest?: boolean;
  liked?: boolean;
  likes: number;
  text: string;
  time: string;
}

export interface DetailQaQuestion {
  answers: DetailQaAnswer[];
  author: string;
  avatarColor: string;
  id: number;
  initials: string;
  liked?: boolean;
  likes: number;
  text: string;
  time: string;
}

export interface DetailRelatedPost {
  category: string;
  date: string;
  href: string;
  posts?: string;
  tag?: LinkItemTag;
  title: string;
}

export interface AnnouncementDetailContent {
  ageLimit?: DetailAgeLimit;
  applicationFee?: {
    note?: string;
    rows: DetailFeeRow[];
    title?: string;
  };
  cta?: {
    primaryHref: string;
    primaryLabel: string;
    secondaryHref?: string;
    secondaryLabel?: string;
  };
  engagement: DetailEngagement;
  extraSections?: DetailExtraSection[];
  eligibility: DetailEligibilityBlock[];
  eyebrow: string;
  heroStats: PublicStat[];
  howToApply?: string[];
  importantDates: DetailDateRow[];
  importantLinks: DetailImportantLink[];
  notice?: DetailNotice;
  overviewTitle?: string;
  qa: DetailQaQuestion[];
  relatedPosts: DetailRelatedPost[];
  relatedLinkOverrides?: QuickLink[];
  selectionProcess?: string[];
  sourceNote?: string;
  subscribePrompt?: {
    buttonLabel: string;
    description: string;
    title: string;
  };
  summaryMeta: DetailSummaryMeta;
  theme?: DetailThemeTokens;
  vacancyTable?: DetailVacancyTable;
}

export interface AnnouncementItem {
  departments: string[];
  date: string;
  detail: AnnouncementDetailContent;
  headline: string;
  keyPoints: string[];
  legacyId?: string;
  legacySlugs: string[];
  listed: boolean;
  keywords: string[];
  org: string;
  postCount?: string;
  qualification?: string;
  section: AnnouncementSection;
  shortInfo: string;
  slug: string;
  stateSlugs: string[];
  summary: string;
  tag?: LinkItemTag;
  title: string;
  usefulLinks: QuickLink[];
}

export interface CategoryPageMeta {
  canonicalPath: string;
  description: string;
  eyebrow: string;
  headerColor: string;
  highlights: string[];
  listingTitle: string;
  quickLinks: QuickLink[];
  slug: AnnouncementSection | ResourceCategorySlug | 'states';
  stats: PublicStat[];
  title: string;
}

export interface ResourceCategoryMeta extends CategoryPageMeta {
  resourceCards: ResourceCard[];
}

export interface InfoPageSection {
  body: string[];
  title: string;
}

export interface InfoPageMeta {
  canonicalPath: string;
  description: string;
  eyebrow: string;
  headerColor: string;
  quickLinks: QuickLink[];
  sections: InfoPageSection[];
  slug: InfoPageSlug;
  stats: PublicStat[];
  title: string;
}

export interface AuxiliaryActionCard {
  description: string;
  href: string;
  label: string;
}

export interface AuxiliaryPageMeta {
  canonicalPath: string;
  cards: AuxiliaryActionCard[];
  description: string;
  eyebrow: string;
  headerColor: string;
  quickLinks: QuickLink[];
  sections: InfoPageSection[];
  slug: AuxiliaryPageSlug;
  stats: PublicStat[];
  title: string;
}

export interface CommunityPageMeta {
  canonicalPath: string;
  channel: CommunityChannel;
  ctaLabel: string;
  description: string;
  externalUrl?: string;
  eyebrow: string;
  headerColor: string;
  quickLinks: QuickLink[];
  sections: InfoPageSection[];
  stats: PublicStat[];
  title: string;
}

export interface StatePageMeta {
  canonicalPath: string;
  description: string;
  featuredLinks: QuickLink[];
  slug: string;
  title: string;
}

const sectionPathMap: Record<AnnouncementSection, string> = {
  jobs: '/jobs',
  results: '/results',
  'admit-cards': '/admit-cards',
  'answer-keys': '/answer-keys',
  admissions: '/admissions',
};

const defaultCommunityUrls: Partial<Record<CommunityChannel, string>> = {
  twitter: siteConfig.links.twitter,
  facebook: siteConfig.links.facebook,
  telegram: process.env.NEXT_PUBLIC_TELEGRAM_URL,
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_URL,
  youtube: process.env.NEXT_PUBLIC_YOUTUBE_URL,
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL,
};

export const announcementCategoryMeta: Record<AnnouncementSection, CategoryPageMeta> = {
  jobs: {
    slug: 'jobs',
    canonicalPath: '/jobs',
    title: 'Government Jobs',
    eyebrow: 'Sarkari Naukri Hub',
    description:
      'Browse fresh online forms, recruitment notices, important dates, and exam-linked updates in the same dense Sarkari Result style as the homepage.',
    headerColor: 'bg-[#d32f2f]',
    listingTitle: 'Latest Jobs / Online Form',
    stats: [
      { label: 'Live Forms', value: '342' },
      { label: 'Major Recruiters', value: '58' },
      { label: 'Hot Updates', value: '18' },
      { label: 'State Coverage', value: '28' },
    ],
    quickLinks: [
      { label: 'Latest Results', href: '/results' },
      { label: 'Admit Cards', href: '/admit-cards' },
      { label: 'State Wise Jobs', href: '/states' },
      { label: 'Homepage', href: '/' },
    ],
    highlights: [
      'Every row on this page now keeps the same dense portal rhythm as the homepage.',
      'Important labels, dates, counts, and qualification notes stay visible without opening a second UI system.',
      'Item clicks now open real detail pages instead of bouncing back to generic listings.',
    ],
  },
  results: {
    slug: 'results',
    canonicalPath: '/results',
    title: 'Latest Results',
    eyebrow: 'Result Updates',
    description:
      'Track declared results, merit lists, score cards, and expected result windows in a layout that mirrors the homepage announcement grid.',
    headerColor: 'bg-[#1565c0]',
    listingTitle: 'Latest Result',
    stats: [
      { label: 'Declared', value: '89' },
      { label: 'Expected Soon', value: '14' },
      { label: 'Boards + Exams', value: '34' },
      { label: 'Updated Today', value: '9' },
    ],
    quickLinks: [
      { label: 'Latest Jobs', href: '/jobs' },
      { label: 'Admit Cards', href: '/admit-cards' },
      { label: 'Board Results', href: '/board-results' },
      { label: 'Homepage', href: '/' },
    ],
    highlights: [
      'Result rows open dedicated result pages with matching UI instead of generic dashboards.',
      'Declared and expected updates stay grouped in one information-dense stream.',
      'Result detail pages preserve the same border, spacing, and hierarchy as the homepage.',
    ],
  },
  'admit-cards': {
    slug: 'admit-cards',
    canonicalPath: '/admit-cards',
    title: 'Latest Admit Cards',
    eyebrow: 'Exam Entry Documents',
    description:
      'Find city slips, hall tickets, reporting instructions, and exam-day documents in the same Sarkari-style information layout.',
    headerColor: 'bg-[#6a1b9a]',
    listingTitle: 'Latest Admit Card',
    stats: [
      { label: 'Active Cards', value: '128' },
      { label: 'Expected', value: '17' },
      { label: 'Hot Releases', value: '11' },
      { label: 'Exam Boards', value: '26' },
    ],
    quickLinks: [
      { label: 'Latest Jobs', href: '/jobs' },
      { label: 'Latest Results', href: '/results' },
      { label: 'Answer Keys', href: '/answer-keys' },
      { label: 'Homepage', href: '/' },
    ],
    highlights: [
      'Admit card notices now land on consistent detail pages instead of another unrelated interface.',
      'Urgent status, exam dates, and supporting actions stay visible above the fold.',
      'The page keeps the Sarkari Result color and border treatment used on the homepage.',
    ],
  },
  'answer-keys': {
    slug: 'answer-keys',
    canonicalPath: '/answer-keys',
    title: 'Answer Keys',
    eyebrow: 'Official Response Sheets',
    description:
      'Follow official answer keys, objection windows, response sheets, and exam-wise key updates using the same public portal layout as the homepage.',
    headerColor: 'bg-[#00695c]',
    listingTitle: 'Answer Key',
    stats: [
      { label: 'Fresh Keys', value: '56' },
      { label: 'Objection Windows', value: '8' },
      { label: 'SSC + UPSC', value: '21' },
      { label: 'Updated Today', value: '6' },
    ],
    quickLinks: [
      { label: 'Latest Results', href: '/results' },
      { label: 'Syllabus', href: '/syllabus' },
      { label: 'Latest Jobs', href: '/jobs' },
      { label: 'Homepage', href: '/' },
    ],
    highlights: [
      'Answer key rows now support direct detail pages instead of dropping users into unrelated placeholders.',
      'Objection timing and source information stay in the same compact layout language as the homepage.',
      'Related exam resources remain one click away in the same shell.',
    ],
  },
  admissions: {
    slug: 'admissions',
    canonicalPath: '/admissions',
    title: 'Latest Admissions',
    eyebrow: 'Entrance + University Updates',
    description:
      'Explore admission forms, counseling notices, and entrance registrations with the same dense government-portal presentation used on the homepage.',
    headerColor: 'bg-[#ad1457]',
    listingTitle: 'Latest Admission',
    stats: [
      { label: 'Open Forms', value: '95' },
      { label: 'Major Universities', value: '22' },
      { label: 'Entrance Exams', value: '19' },
      { label: 'Updated Today', value: '7' },
    ],
    quickLinks: [
      { label: 'Scholarships', href: '/scholarship' },
      { label: 'Latest Results', href: '/results' },
      { label: 'Homepage', href: '/' },
      { label: 'Important Links', href: '/important' },
    ],
    highlights: [
      'Admission notices now keep the homepage visual hierarchy after click-through.',
      'Users stay inside one public shell across forms, counseling updates, and detail pages.',
      'University and exam actions stay grouped with clear next steps and quick navigation.',
    ],
  },
};

export const resourceCategoryMeta: Record<ResourceCategorySlug, ResourceCategoryMeta> = {
  syllabus: {
    slug: 'syllabus',
    canonicalPath: '/syllabus',
    title: 'Syllabus',
    eyebrow: 'Exam Pattern + Topics',
    description:
      'Review syllabus outlines, exam pattern snapshots, and prep-entry points without leaving the public homepage design system.',
    headerColor: 'bg-[#5d4037]',
    listingTitle: 'Syllabus Desk',
    stats: [
      { label: 'Exam Patterns', value: '200+' },
      { label: 'Top Exams', value: '47' },
      { label: 'Prep Guides', value: '31' },
      { label: 'Updated Weekly', value: 'Yes' },
    ],
    quickLinks: [
      { label: 'Answer Keys', href: '/answer-keys' },
      { label: 'Latest Jobs', href: '/jobs' },
      { label: 'Admissions', href: '/admissions' },
      { label: 'Homepage', href: '/' },
    ],
    highlights: [
      'This page keeps the homepage typography, borders, and dense link-first layout.',
      'Users can jump from syllabus to jobs, answer keys, or admissions without a shell switch.',
      'Featured resources stay surfaced in short, scannable cards instead of generic placeholders.',
    ],
    resourceCards: [
      {
        label: 'SSC CGL Syllabus Snapshot',
        href: '/syllabus',
        description: 'Tier-wise pattern, subject breakup, and selection process notes.',
      },
      {
        label: 'UP Police Exam Pattern',
        href: '/syllabus',
        description: 'Paper structure, marking scheme, and physical test reminders.',
      },
      {
        label: 'Railway Group D Topics',
        href: '/syllabus',
        description: 'Stage-wise coverage notes for CBT, PET, and document rounds.',
      },
      {
        label: 'CTET Subject Guide',
        href: '/syllabus',
        description: 'Paper I and II subject heads with direct prep checkpoints.',
      },
    ],
  },
  'board-results': {
    slug: 'board-results',
    canonicalPath: '/board-results',
    title: 'Board Results',
    eyebrow: 'Board Exam Updates',
    description:
      'Track board score cards, mark sheets, topper releases, and board-level notices with the same Sarkari portal look and spacing.',
    headerColor: 'bg-[#283593]',
    listingTitle: 'Board Result Desk',
    stats: [
      { label: 'Boards Covered', value: '12' },
      { label: 'Result Windows', value: '8' },
      { label: 'Supplementary Notices', value: '5' },
      { label: 'Students Served', value: 'Millions' },
    ],
    quickLinks: [
      { label: 'Latest Results', href: '/results' },
      { label: 'Scholarships', href: '/scholarship' },
      { label: 'Admissions', href: '/admissions' },
      { label: 'Homepage', href: '/' },
    ],
    highlights: [
      'Board-result visitors stay on the same public shell instead of hitting a generic category fallback.',
      'Top notices and action links remain dense and easy to scan on desktop and mobile.',
      'The page keeps direct links into results, admissions, and scholarship flows.',
    ],
    resourceCards: [
      {
        label: 'CBSE Class 10 Result Window',
        href: '/board-results',
        description: 'Official result link, mark sheet notes, and verification reminders.',
      },
      {
        label: 'CBSE Class 12 Mark Sheet Access',
        href: '/board-results',
        description: 'Result access methods, pass criteria, and stream-specific notices.',
      },
      {
        label: 'UP Board Result Desk',
        href: '/board-results',
        description: 'Intermediate and high school result checkpoints in one place.',
      },
      {
        label: 'Bihar Board Updates',
        href: '/board-results',
        description: 'Result, scrutiny, and compartment timing in a compact portal layout.',
      },
    ],
  },
  scholarship: {
    slug: 'scholarship',
    canonicalPath: '/scholarship',
    title: 'Scholarship',
    eyebrow: 'Funding + Renewal Forms',
    description:
      'Follow scholarship openings, renewal windows, payment status reminders, and document requirements in the homepage portal style.',
    headerColor: 'bg-[#ef6c00]',
    listingTitle: 'Scholarship Desk',
    stats: [
      { label: 'Open Schemes', value: '38' },
      { label: 'State Programs', value: '19' },
      { label: 'Renewal Alerts', value: '12' },
      { label: 'Payment Updates', value: '9' },
    ],
    quickLinks: [
      { label: 'Admissions', href: '/admissions' },
      { label: 'Board Results', href: '/board-results' },
      { label: 'Latest Jobs', href: '/jobs' },
      { label: 'Homepage', href: '/' },
    ],
    highlights: [
      'Scholarship and admission flows now feel like one product instead of separate page systems.',
      'Important schemes stay grouped with direct next actions and related student resources.',
      'The page preserves dense public-service styling instead of reverting to generic cards.',
    ],
    resourceCards: [
      {
        label: 'UP Scholarship Renewal',
        href: '/scholarship',
        description: 'Renewal checkpoints, document list, and payment status reminders.',
      },
      {
        label: 'NSP Fresh Application',
        href: '/scholarship',
        description: 'Central portal flow, category coverage, and verification notes.',
      },
      {
        label: 'Bihar Scholarship Updates',
        href: '/scholarship',
        description: 'Scheme deadlines, approval stages, and correction windows.',
      },
      {
        label: 'Minority Welfare Schemes',
        href: '/scholarship',
        description: 'Fresh openings, renewals, and support links in one dashboard-style list.',
      },
    ],
  },
};

export const infoPageMeta: Record<InfoPageSlug, InfoPageMeta> = {
  bookmarks: {
    slug: 'bookmarks',
    canonicalPath: '/bookmarks',
    title: 'Bookmarks',
    eyebrow: 'Saved Public Items',
    description:
      'Keep the same Sarkari Result browsing rhythm while revisiting saved jobs, results, admissions, or resource pages.',
    headerColor: 'bg-[#37474f]',
    stats: [
      { label: 'Saved Groups', value: 'Jobs + Results' },
      { label: 'Quick Revisit', value: 'Enabled' },
      { label: 'Portal View', value: 'Unified' },
      { label: 'Public Shell', value: 'Same as Home' },
    ],
    quickLinks: [
      { label: 'Latest Jobs', href: '/jobs' },
      { label: 'Latest Results', href: '/results' },
      { label: 'Homepage', href: '/' },
      { label: 'Profile', href: '/profile' },
    ],
    sections: [
      {
        title: 'How Bookmarks Work',
        body: [
          'Saved public pages should feel like a continuation of homepage browsing, not a different app shell.',
          'This screen is positioned as a lightweight portal page where users can jump back into jobs, results, and notices quickly.',
        ],
      },
      {
        title: 'Recommended Next Steps',
        body: [
          'Pin the most time-sensitive jobs, results, and admission notices first.',
          'Use the category links on the right to return to the main Sarkari-style browsing streams.',
        ],
      },
    ],
  },
  profile: {
    slug: 'profile',
    canonicalPath: '/profile',
    title: 'Profile',
    eyebrow: 'Reader Preferences',
    description:
      'Manage alert preferences, saved sections, and public reading shortcuts in the same public shell as the homepage.',
    headerColor: 'bg-[#455a64]',
    stats: [
      { label: 'Saved Sections', value: 'Flexible' },
      { label: 'Alert Modes', value: 'Email + Browser' },
      { label: 'Public Shell', value: 'Unified' },
      { label: 'Quick Return', value: 'Available' },
    ],
    quickLinks: [
      { label: 'Bookmarks', href: '/bookmarks' },
      { label: 'Latest Jobs', href: '/jobs' },
      { label: 'Homepage', href: '/' },
      { label: 'Contact Us', href: '/contact' },
    ],
    sections: [
      {
        title: 'Account Preferences',
        body: [
          'Profile-level controls should keep users close to the main public navigation instead of pushing them into a detached dashboard.',
          'This page acts as the reader control center for notification preferences, saved sections, and revisit behavior.',
        ],
      },
      {
        title: 'Public Experience Guardrails',
        body: [
          'Keep core navigation visible so users can jump back to category pages immediately.',
          'Preserve dense information presentation rather than sparse account-card styling.',
        ],
      },
    ],
  },
  about: {
    slug: 'about',
    canonicalPath: '/about',
    title: 'About SarkariExams.me',
    eyebrow: 'Platform Overview',
    description:
      'Explain the platform, update process, and public-information approach using the same homepage-driven portal styling.',
    headerColor: 'bg-[#1a237e]',
    stats: [
      { label: 'Public Focus', value: 'Govt Updates' },
      { label: 'Coverage', value: 'India Wide' },
      { label: 'Publishing Style', value: 'Dense + Fast' },
      { label: 'Trust Goal', value: 'High' },
    ],
    quickLinks: [
      { label: 'Contact Us', href: '/contact' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Latest Jobs', href: '/jobs' },
      { label: 'Homepage', href: '/' },
    ],
    sections: [
      {
        title: 'What the Platform Covers',
        body: [
          'SarkariExams.me focuses on jobs, results, admit cards, answer keys, syllabus, admissions, and related public-service resources.',
          'The goal is to keep users in one consistent browsing environment with dense information and short-click access to the next important page.',
        ],
      },
      {
        title: 'Editorial Direction',
        body: [
          'The page structure favors scan-first reading, compact cards, visible dates, and direct category pivots.',
          'Users should feel the same visual hierarchy on supporting pages as they do on the homepage.',
        ],
      },
    ],
  },
  contact: {
    slug: 'contact',
    canonicalPath: '/contact',
    title: 'Contact Us',
    eyebrow: 'Corrections + Support',
    description:
      'Provide editorial contact, correction flow, and support paths without breaking the public portal experience.',
    headerColor: 'bg-[#d84315]',
    stats: [
      { label: 'Corrections', value: 'Accepted' },
      { label: 'Support Desk', value: 'Editorial' },
      { label: 'Ads Queries', value: 'Handled' },
      { label: 'Public Shell', value: 'Same as Home' },
    ],
    quickLinks: [
      { label: 'About Us', href: '/about' },
      { label: 'Advertise', href: '/advertise' },
      { label: 'Homepage', href: '/' },
      { label: 'Privacy Policy', href: '/privacy' },
    ],
    sections: [
      {
        title: 'Editorial Contact',
        body: [
          'Use this page for corrections, update requests, and public-content issues that affect live announcements or resource links.',
          'The page keeps the homepage shell so users can keep browsing after sending or reading support information.',
        ],
      },
      {
        title: 'Response Expectations',
        body: [
          'Urgent correction reports should include the page title, route, and the exact issue.',
          'Advertising or collaboration requests should clearly identify campaign goals and preferred category placement.',
        ],
      },
    ],
  },
  privacy: {
    slug: 'privacy',
    canonicalPath: '/privacy',
    title: 'Privacy Policy',
    eyebrow: 'Data Handling',
    description:
      'Explain data use, cookies, and communication preferences in the same public-shell UI users see on the homepage.',
    headerColor: 'bg-[#4e342e]',
    stats: [
      { label: 'Cookies', value: 'Limited Use' },
      { label: 'Analytics', value: 'Transparent' },
      { label: 'Notifications', value: 'Opt Based' },
      { label: 'Policy Surface', value: 'Public' },
    ],
    quickLinks: [
      { label: 'Disclaimer', href: '/disclaimer' },
      { label: 'Contact Us', href: '/contact' },
      { label: 'Homepage', href: '/' },
      { label: 'About Us', href: '/about' },
    ],
    sections: [
      {
        title: 'Data and Cookies',
        body: [
          'The privacy page should remain a scannable portal document rather than a detached legal template.',
          'Cookie and analytics notes should be short, readable, and visually consistent with the rest of the public site.',
        ],
      },
      {
        title: 'Reader Controls',
        body: [
          'Users should be able to move directly to profile, bookmarks, or support pages from here.',
          'The page should preserve clear access back to the main jobs, results, and admissions flows.',
        ],
      },
    ],
  },
  disclaimer: {
    slug: 'disclaimer',
    canonicalPath: '/disclaimer',
    title: 'Disclaimer',
    eyebrow: 'Usage Boundaries',
    description:
      'Clarify public-source usage and non-affiliation while keeping the same public navigation and dense layout language.',
    headerColor: 'bg-[#546e7a]',
    stats: [
      { label: 'Source Type', value: 'Public' },
      { label: 'Affiliation', value: 'Independent' },
      { label: 'Reader Action', value: 'Verify Officially' },
      { label: 'Shell', value: 'Unified' },
    ],
    quickLinks: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Contact Us', href: '/contact' },
      { label: 'Homepage', href: '/' },
      { label: 'About Us', href: '/about' },
    ],
    sections: [
      {
        title: 'Independent Platform Notice',
        body: [
          'This page should tell users clearly that SarkariExams.me is an independent public-information platform and not a government site.',
          'It should also keep users inside the same portal shell so they can verify or continue browsing without context loss.',
        ],
      },
      {
        title: 'Verification Reminder',
        body: [
          'Readers should always verify official notices before submitting forms, paying fees, or relying on deadline-sensitive information.',
          'Supporting pages should link back to primary browsing sections instead of isolating users in a dead-end legal screen.',
        ],
      },
    ],
  },
  advertise: {
    slug: 'advertise',
    canonicalPath: '/advertise',
    title: 'Advertise',
    eyebrow: 'Campaign Placement',
    description:
      'Explain sponsorship and campaign options in the same public-site shell users already trust from the homepage.',
    headerColor: 'bg-[#bf360c]',
    stats: [
      { label: 'Audience', value: 'Exam + Job Seekers' },
      { label: 'Coverage', value: 'India Wide' },
      { label: 'Placements', value: 'Multi Section' },
      { label: 'Brand Surface', value: 'Public' },
    ],
    quickLinks: [
      { label: 'Contact Us', href: '/contact' },
      { label: 'About Us', href: '/about' },
      { label: 'Homepage', href: '/' },
      { label: 'Latest Jobs', href: '/jobs' },
    ],
    sections: [
      {
        title: 'Campaign Fit',
        body: [
          'This page should stay inside the same public-shell experience so business users understand where their placements appear.',
          'It should present reach, section fit, and collaboration paths in a compact, readable portal layout.',
        ],
      },
      {
        title: 'Placement Context',
        body: [
          'Sections such as jobs, results, admissions, and scholarships are high-intent areas for visible public placements.',
          'The information architecture should explain placement context without switching to a different app design language.',
        ],
      },
    ],
  },
};

export const auxiliaryPageMeta: Record<AuxiliaryPageSlug, AuxiliaryPageMeta> = {
  certificates: {
    slug: 'certificates',
    canonicalPath: '/certificates',
    title: 'Certificates & Verification',
    eyebrow: 'Document Support Desk',
    description:
      'Find certificate-linked services, verification help, and document support links without dropping out of the public homepage shell.',
    headerColor: 'bg-[#455a64]',
    stats: [
      { label: 'Support Type', value: 'Documents' },
      { label: 'Use Case', value: 'Verification' },
      { label: 'Layout', value: 'Unified' },
      { label: 'Next Step', value: 'One Click' },
    ],
    quickLinks: [
      { label: 'Important Links', href: '/important' },
      { label: 'Board Results', href: '/board-results' },
      { label: 'Admissions', href: '/admissions' },
      { label: 'Homepage', href: '/' },
    ],
    cards: [
      {
        label: 'Board Result Access',
        href: '/board-results',
        description: 'Result desks, mark sheet checkpoints, and official board result references.',
      },
      {
        label: 'Admissions Support',
        href: '/admissions',
        description: 'University forms, counseling notices, and document-readiness reminders.',
      },
      {
        label: 'Contact Editorial Desk',
        href: '/contact',
        description: 'Report a broken certificate flow or request a page-level correction.',
      },
      {
        label: 'Important Links',
        href: '/important',
        description: 'Official portals and frequently used public-service destinations.',
      },
    ],
    sections: [
      {
        title: 'How To Use This Page',
        body: [
          'This page exists so certificate-related calls to action do not land on a fake 200 page or a generic placeholder shell.',
          'Readers should be able to move from certificate support into board results, admissions, or official portals without losing the Sarkari-style browsing context.',
        ],
      },
      {
        title: 'Verification Reminder',
        body: [
          'Always verify marksheets, certificates, and correction windows through the relevant official portal before relying on public summaries.',
          'Use the support and contact links here if the public route needs correction or a missing document link.',
        ],
      },
    ],
  },
  important: {
    slug: 'important',
    canonicalPath: '/important',
    title: 'Important Links',
    eyebrow: 'Official Portals',
    description:
      'A dedicated important-links desk for official websites, high-intent public routes, and commonly used follow-up actions.',
    headerColor: 'bg-[#37474f]',
    stats: [
      { label: 'Portal Type', value: 'Official + Public' },
      { label: 'Coverage', value: 'National + State' },
      { label: 'Quick Access', value: 'Enabled' },
      { label: 'Shell', value: 'Unified' },
    ],
    quickLinks: [
      { label: 'Latest Jobs', href: '/jobs' },
      { label: 'Latest Results', href: '/results' },
      { label: 'Certificates', href: '/certificates' },
      { label: 'Homepage', href: '/' },
    ],
    cards: [
      {
        label: 'UPSC Official Website',
        href: 'https://upsc.gov.in',
        description: 'Civil services, NDA, CDS, CAPF, EPFO, and official notices.',
      },
      {
        label: 'SSC Official Portal',
        href: 'https://ssc.nic.in',
        description: 'CGL, CHSL, MTS, GD, and other SSC recruitment notices.',
      },
      {
        label: 'IBPS Official Portal',
        href: 'https://www.ibps.in',
        description: 'IBPS PO, Clerk, RRB, and banking exam updates.',
      },
      {
        label: 'NTA Portal',
        href: 'https://nta.ac.in',
        description: 'CUET, UGC NET, NEET, and other NTA entrance exam services.',
      },
    ],
    sections: [
      {
        title: 'Why This Page Exists',
        body: [
          'The old important-links destination should resolve to a real public page, not a fake success response or a dead anchor target.',
          'This desk keeps official-site pivots, public support pages, and category routes inside one consistent UX.',
        ],
      },
      {
        title: 'Usage Guidance',
        body: [
          'Open official portals in a new tab when you need final verification, downloads, or form submission.',
          'Use category and support links here when you want to stay within SarkariExams.me for browsing and context.',
        ],
      },
    ],
  },
  app: {
    slug: 'app',
    canonicalPath: '/app',
    title: 'App Download',
    eyebrow: 'Mobile Access',
    description:
      'Provide a real app/download destination with the same public shell, even when a direct store link is not configured yet.',
    headerColor: 'bg-[#283593]',
    stats: [
      { label: 'Primary Surface', value: 'Web First' },
      { label: 'Alerts', value: 'Jobs + Results' },
      { label: 'Fallback', value: 'Public Page' },
      { label: 'Shell', value: 'Unified' },
    ],
    quickLinks: [
      { label: 'Join Telegram', href: defaultCommunityUrls.telegram ?? '/join/telegram' },
      { label: 'Join WhatsApp', href: defaultCommunityUrls.whatsapp ?? '/join/whatsapp' },
      { label: 'Latest Jobs', href: '/jobs' },
      { label: 'Homepage', href: '/' },
    ],
    cards: [
      {
        label: 'Open Jobs Feed',
        href: '/jobs',
        description: 'Use the jobs feed immediately while app delivery links are being finalized.',
      },
      {
        label: 'Join Telegram',
        href: defaultCommunityUrls.telegram ?? '/join/telegram',
        description: 'Follow channel-based delivery if the native app is not yet available.',
      },
      {
        label: 'Join WhatsApp',
        href: defaultCommunityUrls.whatsapp ?? '/join/whatsapp',
        description: 'Use WhatsApp community delivery as a fallback alert channel.',
      },
      {
        label: 'Profile & Bookmarks',
        href: '/profile',
        description: 'Keep saved routes and preferences available from the public web experience.',
      },
    ],
    sections: [
      {
        title: 'Current Delivery Model',
        body: [
          'The app route should always resolve to a real public page, even before a mobile-store destination is configured.',
          'Until an external store link is verified, this page should guide users to the web experience and community channels instead of returning a broken route.',
        ],
      },
      {
        title: 'Fastest Alternatives',
        body: [
          'Use Telegram, WhatsApp, bookmarks, and the jobs/results hubs for the fastest current update flow.',
          'When an official app URL becomes available, this page should remain the stable public entry point and link outward from here.',
        ],
      },
    ],
  },
};

export const communityPageMeta: Record<CommunityChannel, CommunityPageMeta> = {
  telegram: {
    channel: 'telegram',
    canonicalPath: '/join/telegram',
    title: 'Telegram Channel',
    eyebrow: 'Community Alerts',
    description: 'Open the Telegram channel when configured, or use this fallback page for the next best public routes.',
    headerColor: 'bg-[#0277bd]',
    ctaLabel: 'Open Telegram',
    externalUrl: defaultCommunityUrls.telegram,
    stats: [
      { label: 'Channel', value: 'Telegram' },
      { label: 'Purpose', value: 'Fast Alerts' },
      { label: 'Fallback', value: 'Public Page' },
      { label: 'Shell', value: 'Unified' },
    ],
    quickLinks: [
      { label: 'Latest Jobs', href: '/jobs' },
      { label: 'Latest Results', href: '/results' },
      { label: 'App Download', href: '/app' },
      { label: 'Homepage', href: '/' },
    ],
    sections: [
      {
        title: 'Channel Access',
        body: [
          'This route should never 404. If a Telegram URL is configured, it should redirect there immediately.',
          'If not configured, users should still get a real page with alternative routes for alerts and updates.',
        ],
      },
    ],
  },
  whatsapp: {
    channel: 'whatsapp',
    canonicalPath: '/join/whatsapp',
    title: 'WhatsApp Channel',
    eyebrow: 'Community Alerts',
    description: 'Open the WhatsApp channel when configured, or use this fallback page for the next best update paths.',
    headerColor: 'bg-[#2e7d32]',
    ctaLabel: 'Open WhatsApp',
    externalUrl: defaultCommunityUrls.whatsapp,
    stats: [
      { label: 'Channel', value: 'WhatsApp' },
      { label: 'Purpose', value: 'Fast Alerts' },
      { label: 'Fallback', value: 'Public Page' },
      { label: 'Shell', value: 'Unified' },
    ],
    quickLinks: [
      { label: 'Latest Jobs', href: '/jobs' },
      { label: 'Latest Results', href: '/results' },
      { label: 'App Download', href: '/app' },
      { label: 'Homepage', href: '/' },
    ],
    sections: [
      {
        title: 'Channel Access',
        body: [
          'This route should never 404. If a WhatsApp URL is configured, it should redirect there immediately.',
          'If not configured, users should still get a real page with alternative routes for alerts and updates.',
        ],
      },
    ],
  },
  twitter: {
    channel: 'twitter',
    canonicalPath: '/join/twitter',
    title: 'Twitter / X',
    eyebrow: 'Social Updates',
    description: 'Use the configured Twitter/X profile when available, with a public fallback page if needed.',
    headerColor: 'bg-[#1565c0]',
    ctaLabel: 'Open Twitter / X',
    externalUrl: defaultCommunityUrls.twitter,
    stats: [
      { label: 'Channel', value: 'Twitter / X' },
      { label: 'Purpose', value: 'Announcements' },
      { label: 'Fallback', value: 'Public Page' },
      { label: 'Shell', value: 'Unified' },
    ],
    quickLinks: [
      { label: 'Latest Jobs', href: '/jobs' },
      { label: 'Homepage', href: '/' },
      { label: 'Contact Us', href: '/contact' },
      { label: 'Important Links', href: '/important' },
    ],
    sections: [
      {
        title: 'Social Access',
        body: [
          'Footer social links should never point to placeholder anchors.',
          'When no external profile is configured, this page acts as the safe public fallback instead of sending users to nowhere.',
        ],
      },
    ],
  },
  youtube: {
    channel: 'youtube',
    canonicalPath: '/join/youtube',
    title: 'YouTube Channel',
    eyebrow: 'Video Updates',
    description: 'Use the configured YouTube channel when available, with a public fallback page if needed.',
    headerColor: 'bg-[#c62828]',
    ctaLabel: 'Open YouTube',
    externalUrl: defaultCommunityUrls.youtube,
    stats: [
      { label: 'Channel', value: 'YouTube' },
      { label: 'Purpose', value: 'Video Updates' },
      { label: 'Fallback', value: 'Public Page' },
      { label: 'Shell', value: 'Unified' },
    ],
    quickLinks: [
      { label: 'Latest Jobs', href: '/jobs' },
      { label: 'Homepage', href: '/' },
      { label: 'App Download', href: '/app' },
      { label: 'Contact Us', href: '/contact' },
    ],
    sections: [
      {
        title: 'Video Access',
        body: [
          'When a YouTube destination is configured, this route should redirect outward.',
          'Until then, users still need a real public landing page rather than a placeholder footer link.',
        ],
      },
    ],
  },
  instagram: {
    channel: 'instagram',
    canonicalPath: '/join/instagram',
    title: 'Instagram',
    eyebrow: 'Social Updates',
    description: 'Use the configured Instagram profile when available, with a public fallback page if needed.',
    headerColor: 'bg-[#ad1457]',
    ctaLabel: 'Open Instagram',
    externalUrl: defaultCommunityUrls.instagram,
    stats: [
      { label: 'Channel', value: 'Instagram' },
      { label: 'Purpose', value: 'Social Updates' },
      { label: 'Fallback', value: 'Public Page' },
      { label: 'Shell', value: 'Unified' },
    ],
    quickLinks: [
      { label: 'Latest Results', href: '/results' },
      { label: 'Homepage', href: '/' },
      { label: 'App Download', href: '/app' },
      { label: 'Contact Us', href: '/contact' },
    ],
    sections: [
      {
        title: 'Social Access',
        body: [
          'Instagram links should either open a real external profile or a real internal fallback page.',
          'Placeholder anchors are not acceptable for the public footer or shared layout surfaces.',
        ],
      },
    ],
  },
  facebook: {
    channel: 'facebook',
    canonicalPath: '/join/facebook',
    title: 'Facebook',
    eyebrow: 'Social Updates',
    description: 'Use the configured Facebook profile when available, with a public fallback page if needed.',
    headerColor: 'bg-[#0d47a1]',
    ctaLabel: 'Open Facebook',
    externalUrl: defaultCommunityUrls.facebook,
    stats: [
      { label: 'Channel', value: 'Facebook' },
      { label: 'Purpose', value: 'Social Updates' },
      { label: 'Fallback', value: 'Public Page' },
      { label: 'Shell', value: 'Unified' },
    ],
    quickLinks: [
      { label: 'Latest Jobs', href: '/jobs' },
      { label: 'Homepage', href: '/' },
      { label: 'Important Links', href: '/important' },
      { label: 'Contact Us', href: '/contact' },
    ],
    sections: [
      {
        title: 'Social Access',
        body: [
          'Known brand profiles should open directly when configured.',
          'If the profile is not configured, this route still provides a valid public landing page instead of a broken footer destination.',
        ],
      },
    ],
  },
};

export type AnnouncementRouteMatchType = 'canonical' | 'legacy-alias' | 'numeric-legacy';

export interface AnnouncementFilters {
  department?: string;
  includeHidden?: boolean;
  search?: string;
}

function buildPathWithQuery(
  basePath: string,
  params: Record<string, string | undefined>,
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value && value.trim()) {
      searchParams.set(key, value.trim());
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

export function buildSearchPath(query?: string) {
  return buildPathWithQuery('/search', { q: query });
}

export function buildAnnouncementCategoryPath(
  section: AnnouncementSection,
  filters: Pick<AnnouncementFilters, 'department' | 'search'> = {},
) {
  return buildPathWithQuery(sectionPathMap[section], {
    search: filters.search,
    department: section === 'jobs' ? filters.department : undefined,
  });
}

export function buildJobsPath(filters: Pick<AnnouncementFilters, 'department' | 'search'> = {}) {
  return buildAnnouncementCategoryPath('jobs', filters);
}

export function buildCommunityPath(channel: CommunityChannel) {
  const meta = communityPageMeta[channel];
  return normalizeHref(meta.externalUrl) ?? meta.canonicalPath;
}

export function getCategoryMetaBySlug(slug: string) {
  if (slug === 'states') {
    return {
      slug: 'states',
      canonicalPath: '/states',
      title: 'State Wise Jobs',
      eyebrow: 'Regional Public Updates',
      description:
        'Open state-focused job, result, and admit-card streams without leaving the homepage shell or dense Sarkari portal layout.',
      headerColor: 'bg-[#4e342e]',
      listingTitle: 'State Directory',
      stats: [
        { label: 'States Covered', value: '30+' },
        { label: 'State Pages', value: 'Ready' },
        { label: 'Linked Streams', value: 'Jobs + Results + Cards' },
        { label: 'Public Shell', value: 'Unified' },
      ],
      quickLinks: [
        { label: 'Latest Jobs', href: '/jobs' },
        { label: 'Latest Results', href: '/results' },
        { label: 'Homepage', href: '/' },
        { label: 'Admissions', href: '/admissions' },
      ],
      highlights: [
        'State pages now keep the same public shell and portal density as the homepage.',
        'Users can move from state pages into job, result, and admit-card details without a design jump.',
        'Regional pages stay connected to national category pages through shared quick links.',
      ],
    } satisfies CategoryPageMeta;
  }

  if (slug in announcementCategoryMeta) {
    return announcementCategoryMeta[slug as AnnouncementSection];
  }

  if (slug in resourceCategoryMeta) {
    return resourceCategoryMeta[slug as ResourceCategorySlug];
  }

  return null;
}

export function getInfoPageBySlug(slug: string) {
  return slug in infoPageMeta ? infoPageMeta[slug as InfoPageSlug] : null;
}

export function getAuxiliaryPageBySlug(slug: string) {
  return slug in auxiliaryPageMeta ? auxiliaryPageMeta[slug as AuxiliaryPageSlug] : null;
}

export function getCommunityPageBySlug(slug: string) {
  return slug in communityPageMeta ? communityPageMeta[slug as CommunityChannel] : null;
}

export function getResourceCardsBySlug(slug: ResourceCategorySlug) {
  return resourceCategoryMeta[slug].resourceCards;
}

export const homePageSectionOrder: AnnouncementSection[] = [
  'results',
  'admit-cards',
  'jobs',
  'answer-keys',
  'admissions',
];
