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

export interface DetailImportantLink {
  emphasis?: DetailLinkEmphasis;
  href: string;
  label: string;
  note?: string;
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
  eligibility: DetailEligibilityBlock[];
  eyebrow: string;
  heroStats: PublicStat[];
  howToApply?: string[];
  importantDates: DetailDateRow[];
  importantLinks: DetailImportantLink[];
  notice?: DetailNotice;
  overviewTitle?: string;
  relatedLinkOverrides?: QuickLink[];
  selectionProcess?: string[];
  sourceNote?: string;
  subscribePrompt?: {
    buttonLabel: string;
    description: string;
    title: string;
  };
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

type AnnouncementSeed = {
  departments?: string[];
  date: string;
  detail?: Partial<AnnouncementDetailContent>;
  legacyId?: string;
  legacySlugs?: string[];
  keywords?: string[];
  listed?: boolean;
  org: string;
  postCount?: string;
  qualification?: string;
  shortInfo?: string;
  slug?: string;
  stateSlugs?: string[];
  summary?: string;
  tag?: LinkItemTag;
  title: string;
};

const ALL_INDIA = 'all-india';

const sectionPathMap: Record<AnnouncementSection, string> = {
  jobs: '/jobs',
  results: '/results',
  'admit-cards': '/admit-cards',
  'answer-keys': '/answer-keys',
  admissions: '/admissions',
};

const sectionLabelMap: Record<AnnouncementSection, string> = {
  jobs: 'Latest Jobs / Online Form',
  results: 'Latest Result',
  'admit-cards': 'Latest Admit Card',
  'answer-keys': 'Answer Key',
  admissions: 'Latest Admission',
};

const defaultCommunityUrls: Partial<Record<CommunityChannel, string>> = {
  twitter: siteConfig.links.twitter,
  facebook: siteConfig.links.facebook,
  telegram: process.env.NEXT_PUBLIC_TELEGRAM_URL,
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_URL,
  youtube: process.env.NEXT_PUBLIC_YOUTUBE_URL,
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL,
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function uniqueValues(values: Array<string | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())).map((value) => value.trim()))];
}

function inferDepartments(title: string, org: string, seededDepartments: string[] = []) {
  const haystack = `${title} ${org}`.toLowerCase();
  const inferred = [...seededDepartments];

  if (/(railway|rrb|rpf)/.test(haystack)) inferred.push('Railway');
  if (/(ibps|sbi|rbi|bank|lic)/.test(haystack)) inferred.push('Banking');
  if (/(ssc|dsssb)/.test(haystack)) inferred.push('SSC');
  if (/(upsc|nda|cds|capf|epfo)/.test(haystack)) inferred.push('UPSC');
  if (/(navy|army|airforce|agniveer|defence|crpf)/.test(haystack)) inferred.push('Defence');
  if (/(teacher|teaching|ctet|ugc net|b\.ed|school)/.test(haystack)) inferred.push('Teaching');
  if (/(medical|neet|nursing|pharma)/.test(haystack)) inferred.push('Medical');
  if (/(engineering|iit|tech|nift)/.test(haystack)) inferred.push('Engineering');
  if (/(uppsc|upsssc|bpsc|bpsc|psc|state|police|board|csbc|mpesb|upessb|upp? police)/.test(haystack)) {
    inferred.push('State Govt');
  }

  return uniqueValues(inferred);
}

function inferKeywords(seed: AnnouncementSeed, slug: string) {
  return uniqueValues([
    ...(seed.keywords ?? []),
    ...(seed.legacySlugs ?? []),
    slug.replace(/-/g, ' '),
    seed.title,
    seed.org,
  ]);
}

function getSectionActionLabel(section: AnnouncementSection) {
  switch (section) {
    case 'jobs':
      return 'Apply Online';
    case 'results':
      return 'View Result';
    case 'admit-cards':
      return 'Download Admit Card';
    case 'answer-keys':
      return 'View Answer Key';
    case 'admissions':
      return 'Open Admission Form';
    default:
      return 'Open Details';
  }
}

function getSectionOverviewTitle(section: AnnouncementSection) {
  switch (section) {
    case 'jobs':
      return 'Recruitment Overview';
    case 'results':
      return 'Result Overview';
    case 'admit-cards':
      return 'Admit Card Overview';
    case 'answer-keys':
      return 'Answer Key Overview';
    case 'admissions':
      return 'Admission Overview';
    default:
      return 'Overview';
  }
}

function getSectionNoticeTone(section: AnnouncementSection): DetailNoticeTone {
  switch (section) {
    case 'results':
      return 'success';
    case 'admit-cards':
      return 'warning';
    default:
      return 'info';
  }
}

function buildDefaultDetail(
  section: AnnouncementSection,
  seed: AnnouncementSeed,
  slug: string,
  fallbackLinks: QuickLink[],
): AnnouncementDetailContent {
  const primaryLabel = getSectionActionLabel(section);
  const secondaryLabel =
    section === 'results'
      ? 'View Latest Results'
      : section === 'admit-cards'
        ? 'All Admit Cards'
        : section === 'answer-keys'
          ? 'All Answer Keys'
          : section === 'admissions'
            ? 'All Admissions'
            : 'Latest Jobs';

  const baseDates: DetailDateRow[] = [
    {
      label: 'Homepage Update',
      date: seed.date,
      status: 'active',
    },
  ];

  if (section === 'jobs') {
    baseDates.push({ label: 'Application Status', date: 'Check official notice', status: 'upcoming' });
  }
  if (section === 'results') {
    baseDates.unshift({ label: 'Result Declared', date: seed.date, status: 'done' });
  }
  if (section === 'admit-cards') {
    baseDates.unshift({ label: 'Document Released', date: seed.date, status: 'done' });
  }
  if (section === 'answer-keys') {
    baseDates.unshift({ label: 'Answer Key Released', date: seed.date, status: 'done' });
  }
  if (section === 'admissions') {
    baseDates.push({ label: 'Registration Window', date: 'Refer official brochure', status: 'upcoming' });
  }

  const importantLinks: DetailImportantLink[] = [
    {
      label: primaryLabel,
      href: `${sectionPathMap[section]}/${slug}`,
      emphasis: 'primary',
      note: 'Canonical detail page',
    },
    {
      label: `Back to ${announcementCategoryMeta[section].title}`,
      href: sectionPathMap[section],
      emphasis: 'secondary',
    },
    {
      label: 'Homepage',
      href: '/',
      emphasis: 'muted',
    },
    ...fallbackLinks.slice(0, 2).map((link) => ({
      label: link.label,
      href: link.href,
      emphasis: 'secondary' as DetailLinkEmphasis,
    })),
  ];

  const heroStats = [
    { label: 'Category', value: announcementCategoryMeta[section].title },
    { label: 'Organization', value: seed.org },
    { label: 'Updated', value: seed.date },
    {
      label: seed.postCount ? 'Posts / Seats' : 'Status',
      value: seed.postCount ?? (seed.tag ? seed.tag.toUpperCase() : 'ACTIVE'),
    },
  ];

  if (seed.qualification) {
    heroStats.push({ label: 'Qualification', value: seed.qualification });
  }

  return {
    eyebrow: sectionLabelMap[section],
    heroStats,
    notice: {
      title:
        section === 'results'
          ? 'Result Notice'
          : section === 'admit-cards'
            ? 'Exam-Day Notice'
            : section === 'answer-keys'
              ? 'Objection Window Notice'
              : section === 'admissions'
                ? 'Admission Notice'
                : 'Application Notice',
      tone: getSectionNoticeTone(section),
      body: [
        `${seed.title} is now available on a dedicated Sarkari-style detail page for ${seed.org}.`,
        'Candidates should verify all dates, eligibility rules, and document requirements from the official notification before taking action.',
      ],
    },
    overviewTitle: getSectionOverviewTitle(section),
    importantDates: baseDates,
    applicationFee: {
      title: 'Application Fee',
      rows: [
        { label: 'General / OBC / EWS', value: 'Refer official notice' },
        { label: 'SC / ST / Female / PwD', value: 'Refer official notice' },
      ],
      note: 'Exact fee mode, exemptions, and payment deadlines should be verified on the official source.',
    },
    ageLimit: {
      summary: 'Refer the official notice for exact age calculation and relaxation rules.',
      points: [
        'Age relaxation generally applies as per recruitment or admission rules.',
        'Category certificates and date-of-birth proof must match the submitted application.',
      ],
    },
    eligibility: [
      {
        title: 'Educational Qualification',
        description:
          seed.qualification
            ? `${seed.qualification} level eligibility is reflected on the homepage listing. Check the official notice for stream-wise or post-wise variation.`
            : 'Refer to the official notice for detailed educational eligibility, specialization rules, and final-year candidate conditions.',
      },
      {
        title: 'Organization / Exam Scope',
        description: `${seed.org} is the primary authority for this ${sectionLabelMap[section].toLowerCase()} update.`,
      },
      {
        title: 'Document Readiness',
        description:
          'Keep category, identity, qualification, and exam-specific supporting documents ready before applying, downloading, or verifying the result.',
      },
    ],
    selectionProcess:
      section === 'results'
        ? ['Result publication', 'Score / merit verification', 'Next-stage instructions from the authority']
        : section === 'admit-cards'
          ? ['Download admit card', 'Check reporting instructions', 'Carry valid photo ID and required documents']
          : section === 'answer-keys'
            ? ['Download response sheet / key', 'Review official answers', 'Submit objections within the allowed window if available']
            : section === 'admissions'
              ? ['Complete registration', 'Upload required documents', 'Participate in counseling / verification as notified']
              : ['Complete application', 'Appear in exam / test', 'Attend document verification or next-stage process if shortlisted'],
    vacancyTable: seed.postCount
      ? {
          columns: ['Post / Stage', 'Department', 'Vacancies', 'Pay Level', 'Remarks'],
          rows: [
            {
              post: seed.title,
              department: seed.org,
              vacancies: seed.postCount,
              payLevel: section === 'results' ? 'Declared' : 'Refer notice',
              salary: seed.qualification ?? 'Refer notice',
            },
          ],
        }
      : undefined,
    howToApply:
      section === 'results'
        ? [
            'Open the official result link or notice PDF from the authority website.',
            'Use roll number, registration details, or merit list search as instructed.',
            'Download and save the result / score card for the next stage.',
          ]
        : section === 'admit-cards'
          ? [
              'Visit the official portal and open the admit-card download section.',
              'Enter the required login details exactly as submitted in the application.',
              'Verify exam city, reporting time, and instructions before printing the hall ticket.',
            ]
          : section === 'answer-keys'
            ? [
                'Open the official answer-key or response-sheet link for the exam.',
                'Match responses carefully and note the objection window, fee, and deadline if published.',
                'Save a copy of the key / response sheet for future reference.',
              ]
          : section === 'admissions'
            ? [
                'Read the information bulletin and eligibility rules before registration.',
                'Complete the form with accurate academic, category, and personal details.',
                'Upload the required documents and preserve the submitted form copy.',
              ]
            : [
                'Read the official notification before filling the application form.',
                'Check eligibility, age rules, fees, and document requirements carefully.',
                'Submit the form before the deadline and keep a printed copy for later stages.',
              ],
    importantLinks,
    sourceNote: `${seed.org} remains the authoritative source for this update. Candidates should rely on the official notice for final confirmation of dates, eligibility, fee, and next-stage instructions.`,
    relatedLinkOverrides: fallbackLinks,
    cta: {
      primaryLabel,
      primaryHref: `${sectionPathMap[section]}/${slug}`,
      secondaryLabel,
      secondaryHref: sectionPathMap[section],
    },
    subscribePrompt: {
      title: 'Get update alerts',
      description: `Track fresh ${announcementCategoryMeta[section].title.toLowerCase()} updates without leaving the Sarkari Result-style public shell.`,
      buttonLabel: 'Set alert',
    },
  };
}

function mergeAnnouncementDetail(
  baseDetail: AnnouncementDetailContent,
  override?: Partial<AnnouncementDetailContent>,
): AnnouncementDetailContent {
  if (!override) {
    return baseDetail;
  }

  return {
    ...baseDetail,
    ...override,
    notice: override.notice ? { ...baseDetail.notice, ...override.notice } as DetailNotice : baseDetail.notice,
    applicationFee: override.applicationFee
      ? {
          ...baseDetail.applicationFee,
          ...override.applicationFee,
          rows: override.applicationFee.rows ?? baseDetail.applicationFee?.rows ?? [],
        }
      : baseDetail.applicationFee,
    ageLimit: override.ageLimit
      ? {
          ...baseDetail.ageLimit,
          ...override.ageLimit,
          points: override.ageLimit.points ?? baseDetail.ageLimit?.points ?? [],
        }
      : baseDetail.ageLimit,
    cta: override.cta ? { ...baseDetail.cta, ...override.cta } : baseDetail.cta,
    subscribePrompt: override.subscribePrompt
      ? { ...baseDetail.subscribePrompt, ...override.subscribePrompt }
      : baseDetail.subscribePrompt,
    vacancyTable: override.vacancyTable
      ? {
          ...baseDetail.vacancyTable,
          ...override.vacancyTable,
          columns: override.vacancyTable.columns ?? baseDetail.vacancyTable?.columns ?? [],
          rows: override.vacancyTable.rows ?? baseDetail.vacancyTable?.rows ?? [],
        }
      : baseDetail.vacancyTable,
    heroStats: override.heroStats ?? baseDetail.heroStats,
    eligibility: override.eligibility ?? baseDetail.eligibility,
    importantDates: override.importantDates ?? baseDetail.importantDates,
    selectionProcess: override.selectionProcess ?? baseDetail.selectionProcess,
    howToApply: override.howToApply ?? baseDetail.howToApply,
    importantLinks: override.importantLinks ?? baseDetail.importantLinks,
    relatedLinkOverrides: override.relatedLinkOverrides ?? baseDetail.relatedLinkOverrides,
  };
}

function createAnnouncement(section: AnnouncementSection, seed: AnnouncementSeed): AnnouncementItem {
  const slug = seed.slug ?? slugify(seed.title);
  const fallbackLinks = [
    { label: `Back to ${announcementCategoryMeta[section].title}`, href: sectionPathMap[section] },
    { label: 'Homepage', href: '/' },
  ];
  const defaultDetail = buildDefaultDetail(section, seed, slug, fallbackLinks);

  return {
    listed: seed.listed ?? true,
    legacySlugs: seed.legacySlugs ?? [],
    keywords: inferKeywords(seed, slug),
    departments: inferDepartments(seed.title, seed.org, seed.departments),
    section,
    slug,
    title: seed.title,
    org: seed.org,
    date: seed.date,
    tag: seed.tag,
    postCount: seed.postCount,
    qualification: seed.qualification,
    legacyId: seed.legacyId,
    stateSlugs: seed.stateSlugs ?? [ALL_INDIA],
    headline: `${seed.title} - ${seed.org}`,
    shortInfo:
      seed.shortInfo ??
      `${seed.title} now has a dedicated public detail page, so homepage users stay inside the same Sarkari-style reading flow after click-through.`,
    summary:
      seed.summary ??
      `This ${sectionLabelMap[section].toLowerCase()} entry for ${seed.org} is part of the unified public portal experience. Users can move from the homepage to this detail page without dropping into a different shell or sparse dashboard view.`,
    keyPoints: seed.qualification
      ? [
          `Primary organization: ${seed.org}`,
          `Qualification marker: ${seed.qualification}`,
          `Homepage update date: ${seed.date}`,
        ]
      : [`Primary organization: ${seed.org}`, `Homepage update date: ${seed.date}`, `Route family: ${sectionPathMap[section]}`],
    usefulLinks: fallbackLinks,
    detail: mergeAnnouncementDetail(defaultDetail, seed.detail),
  };
}

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

export const statePageMeta: StatePageMeta[] = [
  {
    slug: 'uttar-pradesh',
    canonicalPath: '/states/uttar-pradesh',
    title: 'Uttar Pradesh Government Jobs',
    description: 'State-specific jobs, exams, and notices for Uttar Pradesh plus relevant national updates.',
    featuredLinks: [
      { label: 'UPPSC Updates', href: '/jobs/uppsc-pcs-2026-provincial-civil-service' },
      { label: 'UP Scholarship', href: '/scholarship' },
      { label: 'Board Results', href: '/board-results' },
    ],
  },
  {
    slug: 'bihar',
    canonicalPath: '/states/bihar',
    title: 'Bihar Government Jobs',
    description: 'Bihar recruitment, board, and exam updates mixed with national notices that matter locally.',
    featuredLinks: [
      { label: 'Bihar Police Jobs', href: '/jobs/bihar-police-constable-recruitment-2026' },
      { label: 'BPSC Result Updates', href: '/results/bihar-bpsc-69th-cce-final-result' },
      { label: 'Admissions', href: '/admissions' },
    ],
  },
  {
    slug: 'rajasthan',
    canonicalPath: '/states/rajasthan',
    title: 'Rajasthan Government Jobs',
    description: 'Rajasthan state updates with exam notices, result alerts, and compatible national recruitment coverage.',
    featuredLinks: [
      { label: 'Rajasthan Result Updates', href: '/results/rajasthan-police-constable-result-2025' },
      { label: 'Latest Jobs', href: '/jobs' },
      { label: 'Admit Cards', href: '/admit-cards' },
    ],
  },
  {
    slug: 'madhya-pradesh',
    canonicalPath: '/states/madhya-pradesh',
    title: 'Madhya Pradesh Government Jobs',
    description: 'Madhya Pradesh public updates with a mix of local recruitment and national exam support links.',
    featuredLinks: [
      { label: 'MP Police Jobs', href: '/jobs/mp-police-constable-recruitment-2026' },
      { label: 'Latest Results', href: '/results' },
      { label: 'Answer Keys', href: '/answer-keys' },
    ],
  },
  {
    slug: 'maharashtra',
    canonicalPath: '/states/maharashtra',
    title: 'Maharashtra Government Jobs',
    description: 'Maharashtra-focused recruitment and exam notices in the same dense Sarkari Result layout.',
    featuredLinks: [
      { label: 'Scholarships', href: '/scholarship' },
      { label: 'Admissions', href: '/admissions' },
      { label: 'Latest Jobs', href: '/jobs' },
    ],
  },
  {
    slug: 'delhi',
    canonicalPath: '/states/delhi',
    title: 'Delhi Government Jobs',
    description: 'Delhi state and central-office recruitment notices, admit cards, and related updates.',
    featuredLinks: [
      { label: 'DSSSB Jobs', href: '/jobs/dsssb-tgt-pgt-teacher-recruitment-2026' },
      { label: 'Results', href: '/results' },
      { label: 'Homepage', href: '/' },
    ],
  },
  {
    slug: 'gujarat',
    canonicalPath: '/states/gujarat',
    title: 'Gujarat Government Jobs',
    description: 'Gujarat state jobs and related public notices with the same homepage-linked browsing style.',
    featuredLinks: [
      { label: 'Latest Jobs', href: '/jobs' },
      { label: 'Latest Results', href: '/results' },
      { label: 'Admissions', href: '/admissions' },
    ],
  },
  {
    slug: 'tamil-nadu',
    canonicalPath: '/states/tamil-nadu',
    title: 'Tamil Nadu Government Jobs',
    description: 'Tamil Nadu state jobs, admit cards, and exam notices in a consistent public portal shell.',
    featuredLinks: [
      { label: 'Admit Cards', href: '/admit-cards' },
      { label: 'Answer Keys', href: '/answer-keys' },
      { label: 'Homepage', href: '/' },
    ],
  },
  {
    slug: 'karnataka',
    canonicalPath: '/states/karnataka',
    title: 'Karnataka Government Jobs',
    description: 'Karnataka state recruitment and exam notices in the same dense layout used on the homepage.',
    featuredLinks: [
      { label: 'Latest Jobs', href: '/jobs' },
      { label: 'Results', href: '/results' },
      { label: 'Scholarships', href: '/scholarship' },
    ],
  },
  {
    slug: 'west-bengal',
    canonicalPath: '/states/west-bengal',
    title: 'West Bengal Government Jobs',
    description: 'West Bengal public updates with compact category pivots and homepage-consistent UI.',
    featuredLinks: [
      { label: 'Latest Jobs', href: '/jobs' },
      { label: 'Admissions', href: '/admissions' },
      { label: 'Homepage', href: '/' },
    ],
  },
  {
    slug: 'punjab',
    canonicalPath: '/states/punjab',
    title: 'Punjab Government Jobs',
    description: 'Punjab state notices plus national opportunities displayed in the same public browsing shell.',
    featuredLinks: [
      { label: 'Latest Jobs', href: '/jobs' },
      { label: 'Admit Cards', href: '/admit-cards' },
      { label: 'Results', href: '/results' },
    ],
  },
  {
    slug: 'haryana',
    canonicalPath: '/states/haryana',
    title: 'Haryana Government Jobs',
    description: 'Haryana updates, recruitment links, and public exam resources in a dense portal presentation.',
    featuredLinks: [
      { label: 'Latest Jobs', href: '/jobs' },
      { label: 'Answer Keys', href: '/answer-keys' },
      { label: 'Homepage', href: '/' },
    ],
  },
  {
    slug: 'jharkhand',
    canonicalPath: '/states/jharkhand',
    title: 'Jharkhand Government Jobs',
    description: 'Jharkhand state public updates with direct access to jobs, results, and admission flows.',
    featuredLinks: [
      { label: 'Latest Jobs', href: '/jobs' },
      { label: 'Results', href: '/results' },
      { label: 'Admissions', href: '/admissions' },
    ],
  },
  {
    slug: 'chhattisgarh',
    canonicalPath: '/states/chhattisgarh',
    title: 'Chhattisgarh Government Jobs',
    description: 'Chhattisgarh state notices aligned to the homepage-linked public shell and dense layout.',
    featuredLinks: [
      { label: 'Latest Jobs', href: '/jobs' },
      { label: 'Admit Cards', href: '/admit-cards' },
      { label: 'Homepage', href: '/' },
    ],
  },
  {
    slug: 'odisha',
    canonicalPath: '/states/odisha',
    title: 'Odisha Government Jobs',
    description: 'Odisha recruitment and exam notices rendered in the same compact public portal style.',
    featuredLinks: [
      { label: 'Latest Results', href: '/results' },
      { label: 'Answer Keys', href: '/answer-keys' },
      { label: 'Homepage', href: '/' },
    ],
  },
  {
    slug: 'uttarakhand',
    canonicalPath: '/states/uttarakhand',
    title: 'Uttarakhand Government Jobs',
    description: 'Uttarakhand updates and nationally relevant public notices in a consistent homepage-linked shell.',
    featuredLinks: [
      { label: 'Latest Jobs', href: '/jobs' },
      { label: 'Admissions', href: '/admissions' },
      { label: 'Homepage', href: '/' },
    ],
  },
];

const jobAnnouncements: AnnouncementItem[] = [
  createAnnouncement('jobs', {
    title: 'SSC CGL 2026 - Combined Graduate Level Exam',
    org: 'Staff Selection Commission',
    date: '28 Mar 2026',
    tag: 'hot',
    postCount: '14,582',
    qualification: 'Graduate',
    legacyId: '1',
    shortInfo:
      'Staff Selection Commission has released the Combined Graduate Level Examination 2026 update for graduate-level central government posts. Candidates should review post-wise eligibility, age rules, and tier-wise selection details before applying.',
    summary:
      'SSC CGL 2026 is a multi-post central recruitment drive covering inspector, assistant section officer, tax assistant, auditor, and related graduate-level posts. The recruitment follows the usual multi-tier pattern with computer-based stages and document verification.',
    detail: {
      heroStats: [
        { label: 'Category', value: 'Government Jobs' },
        { label: 'Organization', value: 'SSC' },
        { label: 'Updated', value: '28 Mar 2026' },
        { label: 'Posts', value: '14,582' },
        { label: 'Qualification', value: 'Graduate' },
      ],
      notice: {
        title: 'SSC CGL 2026 Recruitment Notice',
        tone: 'info',
        body: [
          'This recruitment covers graduate-level central government posts under multiple ministries and departments.',
          'Candidates should verify post-wise age criteria, physical standards for eligible posts, and tier-wise selection rules from the official SSC notification.',
        ],
      },
      importantDates: [
        { label: 'Notification Released', date: '28 Mar 2026', status: 'done' },
        { label: 'Application Start', date: '01 Apr 2026', status: 'active' },
        { label: 'Last Date to Apply', date: '30 Apr 2026', status: 'upcoming' },
        { label: 'Tier I Exam Window', date: 'Jul - Aug 2026', status: 'upcoming' },
      ],
      applicationFee: {
        title: 'Application Fee',
        rows: [
          { label: 'General / OBC / EWS', value: 'Rs. 100/-' },
          { label: 'SC / ST / Female / PwD', value: 'Nil' },
        ],
        note: 'Fee payment is usually accepted through online mode or approved challan channels as notified by SSC.',
      },
      ageLimit: {
        summary: 'Most posts follow an 18 to 32 year range, with post-wise variation.',
        points: [
          'Age is calculated as per the date specified in the official SSC notification.',
          'Reserved-category relaxation is provided according to central government recruitment rules.',
        ],
      },
      eligibility: [
        {
          title: 'Educational Qualification',
          description: 'Bachelor degree in any discipline from a recognized university. Some posts may require preferred subjects or additional physical standards.',
        },
        {
          title: 'Category Documents',
          description: 'Candidates claiming reservation, EWS, PwD, or ex-serviceman benefits should keep valid supporting certificates ready.',
        },
        {
          title: 'Posting Scope',
          description: 'The recruitment covers all-India postings across ministries, departments, and attached offices.',
        },
      ],
      selectionProcess: ['Tier I CBT', 'Tier II CBT', 'Post-specific skill / qualifying stages where applicable', 'Document Verification'],
      vacancyTable: {
        columns: ['Post', 'Department', 'Vacancies', 'Pay Level', 'Remarks'],
        rows: [
          { post: 'Assistant Section Officer', department: 'Central Secretariat / Ministries', vacancies: '2,341', payLevel: 'Level 7', salary: 'Graduate' },
          { post: 'Inspector', department: 'CBDT / CBIC / Enforcement units', vacancies: '3,112', payLevel: 'Level 7', salary: 'Physical standard may apply' },
          { post: 'Tax Assistant / Auditor', department: 'CBDT / CAG / CGDA', vacancies: '4,956', payLevel: 'Level 4 to 5', salary: 'Department-wise allocation' },
          { post: 'Other Graduate Posts', department: 'Various central departments', vacancies: '4,173', payLevel: 'Refer notice', salary: 'Post-wise breakup in notification' },
        ],
      },
      howToApply: [
        'Open the official SSC portal and complete one-time registration if not already created.',
        'Fill the CGL 2026 application form carefully with post preference, category, and communication details.',
        'Upload the required photograph / signature and preserve the submitted application printout.',
      ],
      importantLinks: [
        { label: 'Apply Online', href: '/jobs/ssc-cgl-2026-combined-graduate-level-exam', emphasis: 'primary', note: 'Canonical detail page' },
        { label: 'Latest Jobs', href: '/jobs', emphasis: 'secondary' },
        { label: 'Results Section', href: '/results', emphasis: 'muted' },
        { label: 'Homepage', href: '/', emphasis: 'muted' },
      ],
      sourceNote:
        'SSC is the official authority for notification text, fee mode, post-wise breakup, age calculation, and exam schedule. Candidates should confirm every final rule from the official SSC notice.',
    },
  }),
  createAnnouncement('jobs', {
    title: 'IBPS PO 2026 - Probationary Officer',
    org: 'IBPS',
    date: '26 Mar 2026',
    tag: 'new',
    postCount: '4,500',
    qualification: 'Graduate',
    legacyId: '2',
    detail: {
      notice: {
        title: 'IBPS PO Recruitment Update',
        tone: 'info',
        body: [
          'IBPS Probationary Officer recruitment is a major banking-sector opportunity for graduate candidates.',
          'Candidates should verify participating banks, prelims and mains schedule, and interview rules from the official IBPS notice.',
        ],
      },
      importantDates: [
        { label: 'Recruitment Update', date: '26 Mar 2026', status: 'done' },
        { label: 'Online Form Window', date: 'Expected Apr 2026', status: 'active' },
        { label: 'Prelims Exam', date: 'Expected Aug 2026', status: 'upcoming' },
      ],
      applicationFee: {
        rows: [
          { label: 'General / OBC / EWS', value: 'Refer IBPS notice' },
          { label: 'SC / ST / PwD', value: 'Refer IBPS notice' },
        ],
        note: 'Banking recruitment fee slabs are confirmed only in the official IBPS advertisement.',
      },
      selectionProcess: ['Prelims', 'Mains', 'Interview', 'Final allotment'],
      howToApply: [
        'Register on the official IBPS portal with valid mobile number and email.',
        'Fill the PO application carefully, upload the required documents, and save the submitted form.',
        'Track prelims, mains, and interview notices through the official website.',
      ],
      importantLinks: [
        { label: 'PO 2026 Details', href: '/jobs/ibps-po-2026-probationary-officer', emphasis: 'primary', note: 'Canonical detail page' },
        { label: 'All Jobs', href: '/jobs', emphasis: 'secondary' },
        { label: 'Latest Results', href: '/results', emphasis: 'muted' },
      ],
    },
  }),
  createAnnouncement('jobs', {
    title: 'Railway RRB Group D - Level 1 Posts',
    org: 'Railway Recruitment Board',
    date: '25 Mar 2026',
    tag: 'new',
    postCount: '32,000',
    qualification: '10th Pass',
    legacyId: '3',
    detail: {
      notice: {
        title: 'Railway Level 1 Recruitment Notice',
        tone: 'info',
        body: [
          'RRB Group D remains one of the largest railway recruitment drives, covering multiple technical and non-technical level 1 posts.',
          'Candidates should confirm zone-wise vacancies, medical standards, and PET requirements from the official notice.',
        ],
      },
      importantDates: [
        { label: 'Recruitment Update', date: '25 Mar 2026', status: 'done' },
        { label: 'Application Window', date: 'Refer RRB notification', status: 'active' },
        { label: 'CBT Stage', date: 'Expected later in 2026', status: 'upcoming' },
      ],
      applicationFee: {
        rows: [
          { label: 'General / OBC / EWS', value: 'Refer RRB notice' },
          { label: 'SC / ST / Female / EBC / PwD', value: 'Refer RRB notice' },
        ],
        note: 'Refund or bank-charge rules, if any, should be checked in the railway notification.',
      },
      selectionProcess: ['Computer Based Test', 'Physical Efficiency Test', 'Document Verification', 'Medical Examination'],
      vacancyTable: {
        columns: ['Post / Unit', 'Department', 'Vacancies', 'Pay Level', 'Remarks'],
        rows: [
          { post: 'Track Maintainer / Helper', department: 'Railway Zones', vacancies: '32,000', payLevel: 'Level 1', salary: 'Zone-wise breakup in notice' },
        ],
      },
      howToApply: [
        'Choose the correct railway zone or board as permitted in the official notice.',
        'Fill the online form carefully and verify category, qualification, and identity details.',
        'Keep scanned documents and payment proof ready for future verification stages.',
      ],
      importantLinks: [
        { label: 'Group D Details', href: '/jobs/railway-rrb-group-d-level-1-posts', emphasis: 'primary', note: 'Canonical detail page' },
        { label: 'All Jobs', href: '/jobs', emphasis: 'secondary' },
        { label: 'Admit Cards', href: '/admit-cards', emphasis: 'muted' },
      ],
    },
  }),
  createAnnouncement('jobs', {
    title: 'UPSC NDA NA 2026 - National Defence Academy',
    org: 'UPSC',
    date: '24 Mar 2026',
    tag: 'last-date',
    postCount: '400',
    qualification: '12th Pass',
    legacyId: '4',
  }),
  createAnnouncement('jobs', {
    title: 'Bihar Police Constable Recruitment 2026',
    org: 'CSBC Bihar',
    date: '22 Mar 2026',
    tag: 'new',
    postCount: '21,391',
    qualification: '12th Pass',
    legacyId: '5',
    stateSlugs: ['bihar', ALL_INDIA],
  }),
  createAnnouncement('jobs', {
    title: 'UPPSC PCS 2026 - Provincial Civil Service',
    org: 'UPPSC',
    date: '21 Mar 2026',
    postCount: '250',
    qualification: 'Graduate',
    legacyId: '6',
    stateSlugs: ['uttar-pradesh', ALL_INDIA],
  }),
  createAnnouncement('jobs', {
    title: 'DSSSB TGT PGT Teacher Recruitment 2026',
    org: 'DSSSB Delhi',
    date: '20 Mar 2026',
    tag: 'new',
    postCount: '5,118',
    qualification: 'B.Ed',
    stateSlugs: ['delhi', ALL_INDIA],
  }),
  createAnnouncement('jobs', {
    title: 'Indian Navy SSR AA Recruitment 2026',
    org: 'Indian Navy',
    date: '19 Mar 2026',
    postCount: '2,500',
    qualification: '12th Pass',
  }),
  createAnnouncement('jobs', {
    title: 'SBI Clerk 2026 - Junior Associate',
    org: 'State Bank of India',
    date: '18 Mar 2026',
    tag: 'hot',
    postCount: '8,773',
    qualification: 'Graduate',
  }),
  createAnnouncement('jobs', {
    title: 'CTET 2026 - Central Teacher Eligibility Test',
    org: 'CBSE',
    date: '17 Mar 2026',
    tag: 'new',
    postCount: 'N/A',
    qualification: 'B.Ed',
  }),
  createAnnouncement('jobs', {
    title: 'MP Police Constable Recruitment 2026',
    org: 'MPESB',
    date: '16 Mar 2026',
    postCount: '7,090',
    qualification: '12th Pass',
    stateSlugs: ['madhya-pradesh', ALL_INDIA],
  }),
  createAnnouncement('jobs', {
    title: 'UPSC CAPF 2026 - Assistant Commandant',
    org: 'UPSC',
    date: '15 Mar 2026',
    postCount: '322',
    qualification: 'Graduate',
  }),
  createAnnouncement('jobs', {
    title: 'SSC CGL 2025 - Apply Online',
    org: 'Staff Selection Commission',
    date: '18 Dec 2025',
    listed: false,
    legacySlugs: ['ssc-cgl'],
    postCount: '17,727',
    qualification: 'Graduate',
  }),
  createAnnouncement('jobs', {
    title: 'Railway NTPC 2025 - Online Form',
    org: 'Railway Recruitment Board',
    date: '12 Dec 2025',
    listed: false,
    legacySlugs: ['rrb-ntpc'],
    postCount: '11,558',
    qualification: 'Graduate',
  }),
  createAnnouncement('jobs', {
    title: 'Indian Navy Agniveer SSR 2025 - Recruitment',
    org: 'Indian Navy',
    date: '07 Dec 2025',
    listed: false,
    legacySlugs: ['navy'],
    postCount: '2,800',
    qualification: '12th Pass',
  }),
  createAnnouncement('jobs', {
    title: 'Army TES 52 Entry 2025 - Online Form',
    org: 'Indian Army',
    date: '05 Dec 2025',
    listed: false,
    legacySlugs: ['army-tes'],
    postCount: '90',
    qualification: '12th Pass',
  }),
  createAnnouncement('jobs', {
    title: 'UPSSSC RO ARO 2025 - Apply Online',
    org: 'UPSSSC',
    date: '30 Nov 2025',
    listed: false,
    legacySlugs: ['upsssc'],
    postCount: '411',
    qualification: 'Graduate',
    stateSlugs: ['uttar-pradesh', ALL_INDIA],
  }),
  createAnnouncement('jobs', {
    title: 'Bihar Police Constable 2025 - Online Form',
    org: 'CSBC Bihar',
    date: '28 Nov 2025',
    listed: false,
    legacySlugs: ['bihar-police'],
    postCount: '19,838',
    qualification: '12th Pass',
    stateSlugs: ['bihar', ALL_INDIA],
  }),
  createAnnouncement('jobs', {
    title: 'India Post GDS 2025 - Recruitment',
    org: 'India Post',
    date: '24 Nov 2025',
    listed: false,
    legacySlugs: ['post-office'],
    postCount: '44,228',
    qualification: '10th Pass',
  }),
  createAnnouncement('jobs', {
    title: 'LIC Assistant 2025 - Apply Online',
    org: 'Life Insurance Corporation of India',
    date: '21 Nov 2025',
    listed: false,
    legacySlugs: ['lic'],
    postCount: '5,312',
    qualification: 'Graduate',
  }),
];

const resultAnnouncements: AnnouncementItem[] = [
  createAnnouncement('results', {
    title: 'UPSC Civil Services 2025 - Final Result',
    org: 'UPSC',
    date: '27 Mar 2026',
    tag: 'hot',
    postCount: '933',
    legacyId: '1',
    shortInfo:
      'Union Public Service Commission has declared the Civil Services Examination 2025 final result. The recommendation list covers IAS, IPS, IFS, and other central services vacancies.',
    summary:
      'The UPSC Civil Services 2025 final result closes the prelims, mains, and personality test cycle for one of the most competitive examinations in India. Candidates should check the official PDF, verify roll numbers, and follow further service-allocation or marks-related notices from UPSC.',
    detail: {
      heroStats: [
        { label: 'Category', value: 'Latest Results' },
        { label: 'Organization', value: 'UPSC' },
        { label: 'Updated', value: '27 Mar 2026' },
        { label: 'Recommended', value: '933' },
        { label: 'Exam Type', value: 'Civil Services' },
      ],
      notice: {
        title: 'Final Result Declared',
        tone: 'success',
        body: [
          'UPSC has published the final merit list for Civil Services Examination 2025 after completion of the interview round.',
          'Candidates should download the official result PDF and monitor UPSC for marks, cut-off, reserve-list, and service-allocation updates.',
        ],
      },
      importantDates: [
        { label: 'Prelims Exam', date: '26 May 2025', status: 'done' },
        { label: 'Mains Exam', date: '20 Sep 2025', status: 'done' },
        { label: 'Interview Window', date: 'Jan - Mar 2026', status: 'done' },
        { label: 'Final Result', date: '27 Mar 2026', status: 'active' },
      ],
      applicationFee: {
        title: 'Application Fee (Original Exam Cycle)',
        rows: [
          { label: 'General / OBC / EWS', value: 'Rs. 100/-' },
          { label: 'SC / ST / Female / PwD', value: 'Nil' },
        ],
        note: 'This fee table is included for reference from the original UPSC CSE application cycle.',
      },
      ageLimit: {
        summary: 'The original examination cycle followed UPSC Civil Services age rules.',
        points: [
          'General category candidates usually fall within 21 to 32 years as per the official notification.',
          'Category-wise upper-age relaxation applies according to UPSC rules.',
        ],
      },
      eligibility: [
        {
          title: 'Qualification',
          description: 'Bachelor degree from a recognized university was required in the original application cycle.',
        },
        {
          title: 'Result Verification',
          description: 'Candidates should verify their roll number, name, and category details exactly as published in the final result PDF.',
        },
        {
          title: 'Next-Stage Readiness',
          description: 'Keep identity proof, educational documents, category certificates, and service-preference records ready for any further verification or allocation steps.',
        },
      ],
      selectionProcess: ['Preliminary Examination', 'Main Examination', 'Personality Test / Interview', 'Final Merit Recommendation'],
      vacancyTable: {
        columns: ['Service / Group', 'Department', 'Vacancies', 'Pay Level', 'Remarks'],
        rows: [
          { post: 'IAS', department: 'DoPT', vacancies: '180', payLevel: 'Level 10', salary: 'Service allocation by merit and category' },
          { post: 'IPS', department: 'MHA', vacancies: '200', payLevel: 'Level 10', salary: 'Cadre allocation as per rules' },
          { post: 'IFS', department: 'MEA', vacancies: '37', payLevel: 'Level 10', salary: 'Foreign service allocation rules apply' },
          { post: 'Other Central Services', department: 'Various', vacancies: '516', payLevel: 'Refer service rules', salary: 'Combined final recommendation total' },
        ],
      },
      howToApply: [
        'Open the official UPSC result PDF and search for your roll number or name in the final list.',
        'Download and preserve the result notice, then wait for marks, reserve list, or service-allocation notices if applicable.',
        'Follow only the UPSC website for final confirmation of cut-off marks, marksheets, and post-result instructions.',
      ],
      importantLinks: [
        { label: 'View Final Result', href: '/results/upsc-civil-services-2025-final-result', emphasis: 'primary', note: 'Canonical detail page' },
        { label: 'Latest Results', href: '/results', emphasis: 'secondary' },
        { label: 'Homepage', href: '/', emphasis: 'muted' },
      ],
      sourceNote:
        'UPSC remains the only authoritative source for the final result PDF, marks, cut-off, reserve-list publication, and any further service-allocation or verification instructions.',
    },
  }),
  createAnnouncement('results', {
    title: 'SSC CHSL 2025 - Tier 2 Result',
    org: 'SSC',
    date: '26 Mar 2026',
    tag: 'new',
    postCount: '6,500',
    legacyId: '2',
    detail: {
      notice: {
        title: 'Tier II Result Notice',
        tone: 'success',
        body: [
          'SSC has released the CHSL Tier II result for candidates shortlisted toward document verification and post allocation stages.',
          'Candidates should verify result status, cut-off, and further schedule from the official SSC notice.',
        ],
      },
      importantDates: [
        { label: 'Tier I Result', date: 'Earlier declared', status: 'done' },
        { label: 'Tier II Result', date: '26 Mar 2026', status: 'active' },
        { label: 'Document Verification', date: 'Refer SSC schedule', status: 'upcoming' },
      ],
      selectionProcess: ['Tier I', 'Tier II', 'Skill / Typing test where applicable', 'Document Verification'],
      howToApply: [
        'Open the official result PDF and verify your roll number or name.',
        'Check the post-wise cut-off and shortlist instructions published with the result notice.',
        'Preserve the result copy and prepare for document verification or the next announced stage.',
      ],
      importantLinks: [
        { label: 'View Result', href: '/results/ssc-chsl-2025-tier-2-result', emphasis: 'primary', note: 'Canonical detail page' },
        { label: 'Latest Results', href: '/results', emphasis: 'secondary' },
        { label: 'Latest Jobs', href: '/jobs', emphasis: 'muted' },
      ],
    },
  }),
  createAnnouncement('results', {
    title: 'IBPS Clerk Mains 2025 - Result Declared',
    org: 'IBPS',
    date: '25 Mar 2026',
    tag: 'new',
    postCount: '5,000',
    legacyId: '3',
    detail: {
      notice: {
        title: 'Banking Result Update',
        tone: 'success',
        body: [
          'IBPS Clerk mains result has been declared for the current recruitment cycle.',
          'Candidates should check allotment updates, score card release, and bank-wise notices from IBPS.',
        ],
      },
      importantDates: [
        { label: 'Prelims Result', date: 'Earlier declared', status: 'done' },
        { label: 'Mains Result', date: '25 Mar 2026', status: 'active' },
        { label: 'Final Allotment / Joining Updates', date: 'Refer IBPS notice', status: 'upcoming' },
      ],
      selectionProcess: ['Prelims', 'Mains', 'Provisional allotment'],
      howToApply: [
        'Log in through the official IBPS result portal to download your score card if enabled.',
        'Check state or bank allotment instructions and preserve the score / result copy.',
        'Keep educational and identity documents ready for later joining formalities.',
      ],
      importantLinks: [
        { label: 'View Result', href: '/results/ibps-clerk-mains-2025-result-declared', emphasis: 'primary', note: 'Canonical detail page' },
        { label: 'Latest Results', href: '/results', emphasis: 'secondary' },
        { label: 'Banking Jobs', href: '/jobs?department=Banking', emphasis: 'muted' },
      ],
    },
  }),
  createAnnouncement('results', {
    title: 'RRB NTPC CBT 2 Result 2025',
    org: 'RRB',
    date: '24 Mar 2026',
    postCount: '35,208',
    legacyId: '4',
  }),
  createAnnouncement('results', {
    title: 'NTA CUET UG 2026 - Score Card Released',
    org: 'NTA',
    date: '23 Mar 2026',
    tag: 'new',
    legacyId: '5',
  }),
  createAnnouncement('results', {
    title: 'CTET December 2025 Result',
    org: 'CBSE',
    date: '22 Mar 2026',
    legacyId: '6',
  }),
  createAnnouncement('results', {
    title: 'Bihar BPSC 69th CCE - Final Result',
    org: 'BPSC',
    date: '21 Mar 2026',
    tag: 'hot',
    postCount: '553',
    stateSlugs: ['bihar', ALL_INDIA],
  }),
  createAnnouncement('results', {
    title: 'SSC MTS 2025 - Tier 1 Result',
    org: 'SSC',
    date: '20 Mar 2026',
    postCount: '9,500',
  }),
  createAnnouncement('results', {
    title: 'Rajasthan Police Constable Result 2025',
    org: 'RPSC',
    date: '19 Mar 2026',
    tag: 'update',
    postCount: '4,438',
    stateSlugs: ['rajasthan', ALL_INDIA],
  }),
  createAnnouncement('results', {
    title: 'NDA 2025 II - Written Exam Result',
    org: 'UPSC',
    date: '18 Mar 2026',
    postCount: '400',
  }),
  createAnnouncement('results', {
    title: 'UP TGT PGT 2025 - Final Merit List',
    org: 'UPSESSB',
    date: '17 Mar 2026',
    postCount: '3,539',
    stateSlugs: ['uttar-pradesh', ALL_INDIA],
  }),
  createAnnouncement('results', {
    title: 'RBI Grade B 2025 - Phase II Result',
    org: 'RBI',
    date: '16 Mar 2026',
    tag: 'new',
    postCount: '143',
  }),
  createAnnouncement('results', {
    title: 'UP Police Constable Result 2025',
    org: 'UP Police Recruitment Board',
    date: '14 Dec 2025',
    listed: false,
    legacySlugs: ['up-police'],
    postCount: '60,244',
    stateSlugs: ['uttar-pradesh', ALL_INDIA],
  }),
  createAnnouncement('results', {
    title: 'SSC GD Constable Final Result 2025',
    org: 'SSC',
    date: '10 Dec 2025',
    listed: false,
    legacySlugs: ['ssc-gd'],
    postCount: '39,481',
  }),
  createAnnouncement('results', {
    title: 'BPSC RO ARO Pre Result 2025',
    org: 'BPSC',
    date: '06 Dec 2025',
    listed: false,
    legacySlugs: ['bpsc'],
    postCount: '379',
    stateSlugs: ['bihar', ALL_INDIA],
  }),
  createAnnouncement('results', {
    title: 'IBPS PO Mains Result 2025',
    org: 'IBPS',
    date: '03 Dec 2025',
    listed: false,
    legacySlugs: ['ibps'],
    postCount: '4,455',
  }),
  createAnnouncement('results', {
    title: 'NTA UGC NET Result 2025',
    org: 'NTA',
    date: '30 Nov 2025',
    listed: false,
    legacySlugs: ['net'],
  }),
  createAnnouncement('results', {
    title: 'Railway RRB ALP Result 2025',
    org: 'Railway Recruitment Board',
    date: '28 Nov 2025',
    listed: false,
    legacySlugs: ['rrb-alp'],
    postCount: '18,799',
  }),
  createAnnouncement('results', {
    title: 'SBI Clerk Final Result 2025',
    org: 'State Bank of India',
    date: '24 Nov 2025',
    listed: false,
    legacySlugs: ['sbi-clerk'],
    postCount: '8,283',
  }),
  createAnnouncement('results', {
    title: 'Navy Agniveer SSR Result 2025',
    org: 'Indian Navy',
    date: '21 Nov 2025',
    listed: false,
    legacySlugs: ['navy'],
    postCount: '2,500',
  }),
  createAnnouncement('results', {
    title: 'Airforce Intake 01 2026 Result',
    org: 'Indian Air Force',
    date: '17 Nov 2025',
    listed: false,
    legacySlugs: ['airforce'],
    postCount: '3,500',
  }),
  createAnnouncement('results', {
    title: 'CTET 2025 Result',
    org: 'CBSE',
    date: '15 Nov 2025',
    listed: false,
    legacySlugs: ['ctet'],
  }),
];

const admitCardAnnouncements: AnnouncementItem[] = [
  createAnnouncement('admit-cards', {
    title: 'SSC GD Constable 2026 - PET PST Admit Card',
    org: 'SSC',
    date: '28 Mar 2026',
    tag: 'hot',
    postCount: '46,617',
    slug: 'ssc-gd-constable-pet-pst',
    legacyId: '1',
    detail: {
      notice: {
        title: 'PET / PST Admit Card Notice',
        tone: 'warning',
        body: [
          'Candidates shortlisted for the physical stages should verify reporting venue, time, and document checklist before downloading the admit card.',
          'Photo identity proof and the printed admit card should be carried exactly as instructed by the authority.',
        ],
      },
      importantDates: [
        { label: 'Written Result', date: 'Earlier declared', status: 'done' },
        { label: 'PET / PST Admit Card', date: '28 Mar 2026', status: 'active' },
        { label: 'Physical Test Window', date: 'Apr 2026', status: 'upcoming' },
      ],
      applicationFee: {
        title: 'Original Application Fee',
        rows: [
          { label: 'General / OBC / EWS', value: 'Rs. 100/-' },
          { label: 'SC / ST / Female / ExSM', value: 'Nil' },
        ],
        note: 'This fee block refers to the original exam cycle and is shown here for reference.',
      },
      ageLimit: {
        summary: 'SSC GD age criteria follow the recruitment notification for the original application cycle.',
        points: [
          'Reserved-category relaxation applies according to SSC and central rules.',
          'Candidates should verify age proof and category certificates before physical verification.',
        ],
      },
      eligibility: [
        { title: 'Document Readiness', description: 'Carry admit card printout, valid photo ID, and any physical-test supporting documents required by the authority.' },
        { title: 'Physical Stage', description: 'PET / PST standards are post-specific and should be cross-checked from the SSC notification and region notice.' },
      ],
      selectionProcess: ['Written examination result', 'PET / PST stage', 'Document verification', 'Final merit / medical procedures where applicable'],
      howToApply: [
        'Open the SSC regional admit-card link and log in with your exam credentials.',
        'Check exam city, reporting slot, and physical-stage instructions before printing the admit card.',
        'Reach the venue with all original documents listed in the PET / PST instructions.',
      ],
      importantLinks: [
        { label: 'Download Admit Card', href: '/admit-cards/ssc-gd-constable-pet-pst', emphasis: 'primary', note: 'Canonical detail page' },
        { label: 'All Admit Cards', href: '/admit-cards', emphasis: 'secondary' },
        { label: 'Latest Jobs', href: '/jobs', emphasis: 'muted' },
      ],
    },
  }),
  createAnnouncement('admit-cards', {
    title: 'UPSC EPFO 2026 Admit Card',
    org: 'UPSC',
    date: '27 Mar 2026',
    tag: 'new',
    postCount: '577',
    slug: 'upsc-epfo-2026',
    legacyId: '2',
    detail: {
      notice: {
        title: 'UPSC EPFO Admit Card Notice',
        tone: 'warning',
        body: [
          'Candidates should verify exam date, centre, and reporting instructions after downloading the EPFO admit card.',
          'UPSC candidates must follow the exact instructions printed on the admit card and e-admission certificate notice.',
        ],
      },
      importantDates: [
        { label: 'Admit Card Released', date: '27 Mar 2026', status: 'active' },
        { label: 'Written Exam / RT', date: 'Refer UPSC schedule', status: 'upcoming' },
      ],
      selectionProcess: ['Recruitment test / exam', 'Interview or further stage if notified', 'Document verification'],
      howToApply: [
        'Download the e-admit card from the official UPSC portal using your registration details.',
        'Read all exam-day instructions, prohibited items, and identity-proof requirements carefully.',
        'Keep extra printed copies and reach the venue according to the reporting schedule.',
      ],
      importantLinks: [
        { label: 'Download Admit Card', href: '/admit-cards/upsc-epfo-2026', emphasis: 'primary', note: 'Canonical detail page' },
        { label: 'All Admit Cards', href: '/admit-cards', emphasis: 'secondary' },
        { label: 'UPSC Updates', href: '/jobs?department=UPSC', emphasis: 'muted' },
      ],
    },
  }),
  createAnnouncement('admit-cards', {
    title: 'NTA CUET UG 2026 - City Slip Released',
    org: 'NTA',
    date: '26 Mar 2026',
    tag: 'new',
    slug: 'nta-cuet-ug-city-slip',
    legacyId: '3',
  }),
  createAnnouncement('admit-cards', {
    title: 'Bihar STET 2026 Admit Card',
    org: 'BSEB',
    date: '25 Mar 2026',
    postCount: '7,500',
    slug: 'bihar-stet-2026',
    legacyId: '4',
    stateSlugs: ['bihar', ALL_INDIA],
  }),
  createAnnouncement('admit-cards', {
    title: 'SSC CGL 2026 - Tier 1 Admit Card',
    org: 'SSC',
    date: '24 Mar 2026',
    tag: 'new',
    postCount: '14,582',
    slug: 'ssc-cgl-tier-1',
    legacyId: '5',
  }),
  createAnnouncement('admit-cards', {
    title: 'IBPS PO Prelims 2026 - Call Letter',
    org: 'IBPS',
    date: '23 Mar 2026',
    postCount: '4,500',
    slug: 'ibps-po-mains',
    legacyId: '6',
  }),
  createAnnouncement('admit-cards', {
    title: 'Railway Group D CBT Admit Card 2026',
    org: 'RRB',
    date: '22 Mar 2026',
    postCount: '32,000',
    slug: 'rrb-ntpc-stage-2',
  }),
  createAnnouncement('admit-cards', {
    title: 'UPSC CSE Prelims 2026 - E Admit Card',
    org: 'UPSC',
    date: '21 Mar 2026',
    tag: 'hot',
    slug: 'upsc-cse-mains',
  }),
  createAnnouncement('admit-cards', {
    title: 'NDA 2026 - Exam Admit Card Released',
    org: 'UPSC',
    date: '20 Mar 2026',
    postCount: '400',
    slug: 'nda-2026',
  }),
  createAnnouncement('admit-cards', {
    title: 'Delhi Police Head Constable Admit Card',
    org: 'SSC',
    date: '19 Mar 2026',
    tag: 'new',
    postCount: '835',
    slug: 'delhi-police-head-constable',
    stateSlugs: ['delhi', ALL_INDIA],
  }),
  createAnnouncement('admit-cards', {
    title: 'UPSC IAS IFS 2025 Admit Card',
    org: 'UPSC',
    date: '12 Dec 2025',
    listed: false,
    legacySlugs: ['upsc'],
    postCount: '1,205',
  }),
  createAnnouncement('admit-cards', {
    title: 'Bihar BPSC Teacher 2025 - Exam Date',
    org: 'BPSC Bihar',
    date: '07 Dec 2025',
    listed: false,
    legacySlugs: ['bpsc'],
    postCount: '1,706',
    stateSlugs: ['bihar', ALL_INDIA],
  }),
  createAnnouncement('admit-cards', {
    title: 'Railway RPF Constable Admit Card 2025',
    org: 'Railway Protection Force',
    date: '05 Dec 2025',
    listed: false,
    legacySlugs: ['rpf'],
    postCount: '4,208',
  }),
  createAnnouncement('admit-cards', {
    title: 'SSC CHSL Tier 1 Admit Card 2025',
    org: 'SSC',
    date: '03 Dec 2025',
    listed: false,
    legacySlugs: ['ssc-chsl'],
    postCount: '6,500',
  }),
  createAnnouncement('admit-cards', {
    title: 'CRPF Sub Inspector Admit Card 2025',
    org: 'CRPF',
    date: '30 Nov 2025',
    listed: false,
    legacySlugs: ['crpf'],
    postCount: '212',
  }),
  createAnnouncement('admit-cards', {
    title: 'DSSSB Various Post Admit Card 2025',
    org: 'DSSSB Delhi',
    date: '28 Nov 2025',
    listed: false,
    legacySlugs: ['dsssb'],
    postCount: '1,982',
    stateSlugs: ['delhi', ALL_INDIA],
  }),
  createAnnouncement('admit-cards', {
    title: 'UPPSC Prelims Admit Card 2025',
    org: 'UPPSC',
    date: '24 Nov 2025',
    listed: false,
    legacySlugs: ['uppsc'],
    postCount: '268',
    stateSlugs: ['uttar-pradesh', ALL_INDIA],
  }),
];

const answerKeyAnnouncements: AnnouncementItem[] = [
  createAnnouncement('answer-keys', {
    title: 'SSC CGL 2025 Tier 1 - Answer Key Released',
    org: 'SSC',
    date: '27 Mar 2026',
    tag: 'hot',
    postCount: '14,000',
    detail: {
      notice: {
        title: 'Tier I Answer Key Released',
        tone: 'info',
        body: [
          'Candidates can review the provisional answer key and response sheet for SSC CGL Tier I.',
          'Objection fee, challenge window, and final answer-key publication should be checked from the official notice.',
        ],
      },
      importantDates: [
        { label: 'Tier I Exam Window', date: 'Completed', status: 'done' },
        { label: 'Provisional Answer Key', date: '27 Mar 2026', status: 'active' },
        { label: 'Objection Last Date', date: 'Refer SSC notice', status: 'upcoming' },
      ],
      eligibility: [
        { title: 'Answer-Key Access', description: 'Use the official login window to open both the response sheet and answer key, if the authority provides candidate login access.' },
        { title: 'Challenge Process', description: 'Read the objection rules carefully before raising a challenge. Keep question ID, evidence, and payment proof ready if required.' },
      ],
      selectionProcess: ['Download answer key', 'Verify responses', 'Submit challenge if needed', 'Wait for final answer key / result notice'],
      howToApply: [
        'Open the official SSC answer-key link and log in with your application credentials.',
        'Match each marked response with the published key and note disputed questions separately.',
        'Submit objections within the official window only if the authority permits a challenge process.',
      ],
      importantLinks: [
        { label: 'View Answer Key', href: '/answer-keys/ssc-cgl-2025-tier-1-answer-key-released', emphasis: 'primary', note: 'Canonical detail page' },
        { label: 'All Answer Keys', href: '/answer-keys', emphasis: 'secondary' },
        { label: 'Latest Results', href: '/results', emphasis: 'muted' },
      ],
    },
  }),
  createAnnouncement('answer-keys', {
    title: 'UPSC CAPF 2025 - Answer Key',
    org: 'UPSC',
    date: '25 Mar 2026',
    tag: 'new',
    postCount: '322',
    detail: {
      notice: {
        title: 'CAPF Answer Key Notice',
        tone: 'info',
        body: [
          'UPSC CAPF candidates should verify the published key and follow any official objection or representation process only if announced by the authority.',
          'The final answer key and result timeline should always be checked on the UPSC website.',
        ],
      },
      importantDates: [
        { label: 'Exam Conducted', date: 'Completed', status: 'done' },
        { label: 'Answer Key Update', date: '25 Mar 2026', status: 'active' },
        { label: 'Final Result', date: 'Refer UPSC schedule', status: 'upcoming' },
      ],
      selectionProcess: ['Review answer key', 'Check result notice', 'Physical / interview stages as per CAPF recruitment rules'],
      howToApply: [
        'Download or open the official answer-key notice from the UPSC portal.',
        'Compare responses carefully and preserve a copy of the answer key for reference.',
        'Track further notices for results, physical standards, and interview stages.',
      ],
      importantLinks: [
        { label: 'View Answer Key', href: '/answer-keys/upsc-capf-2025-answer-key', emphasis: 'primary', note: 'Canonical detail page' },
        { label: 'All Answer Keys', href: '/answer-keys', emphasis: 'secondary' },
        { label: 'UPSC Jobs', href: '/jobs?department=UPSC', emphasis: 'muted' },
      ],
    },
  }),
  createAnnouncement('answer-keys', {
    title: 'NTA UGC NET Dec 2025 - Answer Key',
    org: 'NTA',
    date: '24 Mar 2026',
    tag: 'new',
  }),
  createAnnouncement('answer-keys', {
    title: 'CTET 2025 Dec - Answer Key Available',
    org: 'CBSE',
    date: '23 Mar 2026',
  }),
  createAnnouncement('answer-keys', {
    title: 'RRB NTPC CBT 2 - Answer Key',
    org: 'RRB',
    date: '22 Mar 2026',
    postCount: '35,208',
  }),
  createAnnouncement('answer-keys', {
    title: 'SSC CHSL 2025 Tier 2 - Answer Key',
    org: 'SSC',
    date: '21 Mar 2026',
    tag: 'update',
    postCount: '6,500',
  }),
  createAnnouncement('answer-keys', {
    title: 'Bihar BPSC 70th Prelims - Answer Key',
    org: 'BPSC',
    date: '20 Mar 2026',
    tag: 'new',
    stateSlugs: ['bihar', ALL_INDIA],
  }),
  createAnnouncement('answer-keys', {
    title: 'UPSC NDA 2025 II - Answer Key',
    org: 'UPSC',
    date: '19 Mar 2026',
    postCount: '400',
  }),
  createAnnouncement('answer-keys', {
    title: 'SSC MTS 2025 Tier 1 - Answer Key',
    org: 'SSC',
    date: '18 Mar 2026',
    postCount: '9,500',
  }),
  createAnnouncement('answer-keys', {
    title: 'IBPS Clerk Prelims 2025 - Answer Key',
    org: 'IBPS',
    date: '17 Mar 2026',
    tag: 'new',
    postCount: '5,000',
  }),
];

const admissionAnnouncements: AnnouncementItem[] = [
  createAnnouncement('admissions', {
    title: 'DU Undergraduate Admission 2026 - CUET Based',
    org: 'Delhi University',
    date: '28 Mar 2026',
    tag: 'new',
    stateSlugs: ['delhi', ALL_INDIA],
    detail: {
      notice: {
        title: 'University Admission Notice',
        tone: 'info',
        body: [
          'Delhi University undergraduate admissions for the 2026 session are expected to follow the CUET-based process.',
          'Candidates should track the central admission portal for registration, preference filling, and seat-allocation rounds.',
        ],
      },
      importantDates: [
        { label: 'Admission Update Published', date: '28 Mar 2026', status: 'done' },
        { label: 'Registration Window', date: 'Expected after CUET process', status: 'active' },
        { label: 'Preference / Allocation Rounds', date: 'Refer DU schedule', status: 'upcoming' },
      ],
      applicationFee: {
        title: 'Registration / Counseling Fee',
        rows: [
          { label: 'General Category', value: 'Refer DU admission bulletin' },
          { label: 'Reserved Categories', value: 'Refer DU admission bulletin' },
        ],
        note: 'Portal fee, counseling fee, and category concessions may differ by programme or round.',
      },
      ageLimit: {
        summary: 'Most DU undergraduate programmes focus on academic eligibility rather than a strict upper age limit.',
        points: [
          'Programme-specific exceptions should be verified from the official information bulletin.',
          'Category and subject-combination rules are determined by the admission authority.',
        ],
      },
      eligibility: [
        { title: 'Academic Requirement', description: 'Candidates should satisfy programme-wise class 12 marks, subject mapping, and CUET participation rules published by the university.' },
        { title: 'Document Readiness', description: 'Keep class 10 and 12 mark sheets, identity proof, category certificate, domicile or EWS documents, and CUET application details ready.' },
        { title: 'Programme Choice', description: 'Admission is usually guided by programme preference, merit, reservation, and seat availability across colleges.' },
      ],
      selectionProcess: ['CUET participation', 'Portal registration', 'Programme preference filling', 'Seat allocation and document verification'],
      howToApply: [
        'Read the DU admission bulletin and CUET-linked eligibility notes before registering.',
        'Complete the admission portal registration with accurate academic, category, and communication details.',
        'Fill programme / college preferences carefully and preserve all portal acknowledgements for later allocation rounds.',
      ],
      importantLinks: [
        { label: 'Admission Details', href: '/admissions/du-undergraduate-admission-2026-cuet-based', emphasis: 'primary', note: 'Canonical detail page' },
        { label: 'All Admissions', href: '/admissions', emphasis: 'secondary' },
        { label: 'Scholarships', href: '/scholarship', emphasis: 'muted' },
      ],
    },
  }),
  createAnnouncement('admissions', {
    title: 'JEE Advanced 2026 - Registration Open',
    org: 'IIT Kanpur',
    date: '27 Mar 2026',
    tag: 'hot',
    detail: {
      notice: {
        title: 'JEE Advanced Registration Notice',
        tone: 'info',
        body: [
          'JEE Advanced registration should be completed carefully after checking JEE Main qualification status and category-specific rules.',
          'Candidates must follow the official information brochure for exam cities, eligibility attempts, and fee categories.',
        ],
      },
      importantDates: [
        { label: 'Registration Open', date: '27 Mar 2026', status: 'active' },
        { label: 'Last Date to Apply', date: 'Refer official schedule', status: 'upcoming' },
        { label: 'Exam Date', date: 'Refer official schedule', status: 'upcoming' },
      ],
      applicationFee: {
        rows: [
          { label: 'Indian Candidates', value: 'Refer JEE Advanced notice' },
          { label: 'Foreign / OCI / PIO', value: 'Refer JEE Advanced notice' },
        ],
        note: 'Fee varies by category and candidate type; use only the official brochure for final payment rules.',
      },
      eligibility: [
        { title: 'Qualification Path', description: 'Only eligible JEE Main qualified candidates can register, subject to the official attempt and rank rules.' },
        { title: 'Academic Rule', description: 'Class 12 performance and subject eligibility should be verified from the official JEE Advanced brochure.' },
      ],
      selectionProcess: ['JEE Main qualification', 'JEE Advanced registration', 'JEE Advanced examination', 'JoSAA counseling / seat allocation'],
      howToApply: [
        'Confirm JEE Main qualification and read the full JEE Advanced brochure before registering.',
        'Complete registration, pay the applicable fee, and download the confirmation page.',
        'Track admit card, exam, answer key, and counseling notices through the official portals only.',
      ],
      importantLinks: [
        { label: 'Admission Details', href: '/admissions/jee-advanced-2026-registration-open', emphasis: 'primary', note: 'Canonical detail page' },
        { label: 'All Admissions', href: '/admissions', emphasis: 'secondary' },
        { label: 'Scholarships', href: '/scholarship', emphasis: 'muted' },
      ],
    },
  }),
  createAnnouncement('admissions', {
    title: 'NEET UG 2026 - Application Form Out',
    org: 'NTA',
    date: '26 Mar 2026',
    tag: 'new',
  }),
  createAnnouncement('admissions', {
    title: 'IIM CAT 2026 - Admission Process Begins',
    org: 'IIMs',
    date: '25 Mar 2026',
    tag: 'hot',
  }),
  createAnnouncement('admissions', {
    title: 'IGNOU July 2026 Admission Open',
    org: 'IGNOU',
    date: '24 Mar 2026',
    tag: 'new',
  }),
  createAnnouncement('admissions', {
    title: 'BHU UET 2026 - Online Registration',
    org: 'Banaras Hindu University',
    date: '23 Mar 2026',
  }),
  createAnnouncement('admissions', {
    title: 'AMU Admission 2026 - All Courses',
    org: 'Aligarh Muslim University',
    date: '22 Mar 2026',
    tag: 'new',
  }),
  createAnnouncement('admissions', {
    title: 'CLAT 2026 - Law Entrance Registration',
    org: 'Consortium of NLUs',
    date: '21 Mar 2026',
  }),
  createAnnouncement('admissions', {
    title: 'NIFT 2026 Admission - Design Programmes',
    org: 'NIFT',
    date: '20 Mar 2026',
    tag: 'update',
  }),
  createAnnouncement('admissions', {
    title: 'NDA 2026 II - Admission Form Released',
    org: 'UPSC',
    date: '19 Mar 2026',
    tag: 'new',
    postCount: '400',
    qualification: '12th Pass',
  }),
];

export const announcementItemsBySection: Record<AnnouncementSection, AnnouncementItem[]> = {
  jobs: jobAnnouncements,
  results: resultAnnouncements,
  'admit-cards': admitCardAnnouncements,
  'answer-keys': answerKeyAnnouncements,
  admissions: admissionAnnouncements,
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

function normalizeFilterValue(value?: string | null) {
  return value?.trim().toLowerCase() ?? '';
}

function matchesSearch(item: AnnouncementItem, searchValue: string) {
  if (!searchValue) {
    return true;
  }

  const haystack = [
    item.title,
    item.org,
    item.slug,
    item.headline,
    ...item.legacySlugs,
    ...item.keywords,
    ...item.departments,
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(searchValue);
}

function matchesDepartment(item: AnnouncementItem, departmentValue: string) {
  if (!departmentValue) {
    return true;
  }

  return item.departments.some((department) => department.toLowerCase() === departmentValue);
}

export function buildAnnouncementPath(item: AnnouncementItem) {
  return `${sectionPathMap[item.section]}/${item.slug}`;
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
  return meta.externalUrl ?? meta.canonicalPath;
}

export function toPortalEntry(item: AnnouncementItem): PortalListEntry {
  return {
    href: buildAnnouncementPath(item),
    title: item.title,
    org: item.org,
    date: item.date,
    tag: item.tag,
    postCount: item.postCount,
    qualification: item.qualification,
  };
}

export function getAnnouncementEntries(section: AnnouncementSection, filters: AnnouncementFilters = {}) {
  const searchValue = normalizeFilterValue(filters.search);
  const departmentValue = normalizeFilterValue(filters.department);
  const includeHidden = filters.includeHidden ?? Boolean(searchValue || departmentValue);

  return announcementItemsBySection[section]
    .filter((item) => (includeHidden || item.listed) && matchesSearch(item, searchValue) && matchesDepartment(item, departmentValue))
    .map(toPortalEntry);
}

export function resolveAnnouncementParam(section: AnnouncementSection, param: string) {
  const items = announcementItemsBySection[section];
  const directMatch = items.find((item) => item.slug === param);

  if (directMatch) {
    return {
      canonicalPath: buildAnnouncementPath(directMatch),
      item: directMatch,
      matchType: 'canonical' as AnnouncementRouteMatchType,
    };
  }

  const aliasMatch = items.find((item) => item.legacySlugs.includes(param));
  if (aliasMatch) {
    return {
      canonicalPath: buildAnnouncementPath(aliasMatch),
      item: aliasMatch,
      matchType: 'legacy-alias' as AnnouncementRouteMatchType,
    };
  }

  const numericLegacyMatch = items.find((item) => item.legacyId === param);
  return numericLegacyMatch
    ? {
        canonicalPath: buildAnnouncementPath(numericLegacyMatch),
        item: numericLegacyMatch,
        matchType: 'numeric-legacy' as AnnouncementRouteMatchType,
      }
    : null;
}

export function resolveAnnouncementAcrossSections(param: string) {
  for (const section of homePageSectionOrder) {
    const resolved = resolveAnnouncementParam(section, param);
    if (resolved) {
      return { ...resolved, section };
    }
  }

  return null;
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
        { label: 'States Covered', value: `${statePageMeta.length}` },
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

export function getStateMeta(slug: string) {
  return statePageMeta.find((state) => state.slug === slug) ?? null;
}

export function getStateAnnouncements(slug: string, section?: AnnouncementSection) {
  const sections = section ? [section] : (Object.keys(announcementItemsBySection) as AnnouncementSection[]);
  const exact: AnnouncementItem[] = [];
  const allIndia: AnnouncementItem[] = [];

  for (const sectionKey of sections) {
    for (const item of announcementItemsBySection[sectionKey]) {
      if (!item.listed) {
        continue;
      }

      if (item.stateSlugs.includes(slug)) {
        exact.push(item);
      } else if (item.stateSlugs.includes(ALL_INDIA)) {
        allIndia.push(item);
      }
    }
  }

  return [...exact, ...allIndia];
}

export function getSearchResults(query?: string) {
  const normalizedQuery = query?.trim() ?? '';
  return homePageSectionOrder
    .map((section) => ({
      entries: getAnnouncementEntries(section, {
        includeHidden: true,
        search: normalizedQuery,
      }),
      meta: announcementCategoryMeta[section],
      section,
    }))
    .filter((group) => group.entries.length > 0);
}

export function getStateDirectoryEntries() {
  return statePageMeta.map((state) => ({
    slug: state.slug,
    title: state.title,
    description: state.description,
    count: getStateAnnouncements(state.slug, 'jobs').length,
  }));
}

export const homePageSectionOrder: AnnouncementSection[] = [
  'results',
  'admit-cards',
  'jobs',
  'answer-keys',
  'admissions',
];
