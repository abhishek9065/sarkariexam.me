import { resolvePublicApiBase } from './api';
import type {
  AnnouncementItem,
  AnnouncementSection,
  AuxiliaryActionCard,
  AuxiliaryPageMeta,
  AuxiliaryPageSlug,
  CategoryPageMeta,
  CommunityChannel,
  CommunityPageMeta,
  DetailImportantLink,
  DetailThemeTokens,
  InfoPageMeta,
  InfoPageSection,
  PortalListEntry,
  PublicStat,
  QuickLink,
  ResourceCard,
  ResourceCategoryMeta,
  ResourceCategorySlug,
  StatePageMeta,
} from '@/app/lib/public-content';
import { announcementCategoryMeta } from '@/app/lib/public-content';

type BackendSection = 'jobs' | 'results' | 'admit-cards' | 'admissions' | 'answer-keys' | 'syllabus';

interface BackendTaxonomyRef {
  name: string;
  slug: string;
}

interface BackendOfficialSource {
  label: string;
  url: string;
  sourceType?: 'notification' | 'result' | 'admit-card' | 'website' | 'prospectus' | 'notice';
  isPrimary?: boolean;
}

interface BackendPostRecord {
  id: string;
  legacyId?: string;
  title: string;
  slug: string;
  legacySlugs: string[];
  type: 'job' | 'result' | 'admit-card' | 'admission' | 'answer-key' | 'syllabus';
  summary: string;
  shortInfo?: string;
  body?: string;
  organization?: BackendTaxonomyRef | null;
  categories: BackendTaxonomyRef[];
  states: BackendTaxonomyRef[];
  qualifications: BackendTaxonomyRef[];
  importantDates: Array<{ label: string; value: string; kind?: string }>;
  eligibility: Array<{ label: string; description: string }>;
  feeRules: Array<{ category: string; amount: string; paymentNote?: string }>;
  vacancyRows: Array<{ postName: string; department?: string; vacancies: string; payLevel?: string; salaryNote?: string }>;
  admissionPrograms: Array<{ programName: string; level?: string; department?: string; intake?: string; eligibilityNote?: string }>;
  officialSources: BackendOfficialSource[];
  trust: { verificationNote?: string };
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    canonicalPath?: string;
    indexable?: boolean;
    ogImage?: string;
    effectiveTitle?: string;
    effectiveDescription?: string;
    effectiveCanonicalPath?: string;
  };
  tag?: 'new' | 'hot' | 'update' | 'last-date';
  location?: string;
  salary?: string;
  postCount?: string;
  applicationStartDate?: string;
  lastDate?: string;
  examDate?: string;
  resultDate?: string;
  publishedAt?: string;
  updatedAt: string;
}

interface BackendPublicCard {
  id: string;
  legacyId?: string;
  title: string;
  slug: string;
  legacySlugs: string[];
  type: BackendPostRecord['type'];
  section: BackendSection;
  href: string;
  org: string;
  date: string;
  postCount?: string;
  qualification?: string;
  tag?: 'new' | 'hot' | 'update' | 'last-date';
  summary?: string;
  stateSlugs: string[];
  publishedAt?: string;
  updatedAt?: string;
  indexable?: boolean;
}

interface BackendPublicDetail {
  post: BackendPostRecord;
  card: BackendPublicCard;
  canonicalPath: string;
  section: BackendSection;
  relatedCards: BackendPublicCard[];
  breadcrumbs: Array<{ label: string; href: string }>;
  archiveState: 'active' | 'expired' | 'archived';
}

interface BackendTaxonomyDocument {
  id: string;
  name: string;
  slug: string;
  updatedAt?: string;
}

interface BackendTaxonomyLanding {
  taxonomy: BackendTaxonomyDocument;
  cards: BackendPublicCard[];
  relatedCounts: Record<string, number>;
}

type BackendTaxonomyType = 'states' | 'organizations' | 'categories' | 'institutions' | 'exams' | 'qualifications';

type BackendContentPageType = 'auxiliary' | 'info' | 'community' | 'category_meta' | 'resource_meta' | 'state_directory';

interface BackendContentPageRecord {
  id: string;
  slug: string;
  pageType: BackendContentPageType;
  title: string;
  eyebrow?: string;
  description?: string;
  headerColor?: string;
  payload: Record<string, unknown>;
  seoCanonicalPath?: string;
}

const CONTENT_BASE = `${resolvePublicApiBase()}/content`;
const CONTENT_REVALIDATE_SECONDS = Number.parseInt(process.env.CONTENT_CACHE_REVALIDATE_SECONDS ?? '300', 10);

function sanitizeTagSegment(value?: string) {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildContentTags(path: string) {
  const url = new URL(path, 'https://content.local');
  const tags = new Set<string>(['content']);

  if (url.pathname === '/homepage') {
    tags.add('content:homepage');
    tags.add('content:listings');
    tags.add('content:posts');
  }

  if (url.pathname === '/posts') {
    tags.add('content:listings');
    tags.add('content:posts');

    const type = sanitizeTagSegment(url.searchParams.get('type') ?? undefined);
    const category = sanitizeTagSegment(url.searchParams.get('category') ?? undefined);
    const state = sanitizeTagSegment(url.searchParams.get('state') ?? undefined);
    const organization = sanitizeTagSegment(url.searchParams.get('organization') ?? undefined);
    const qualification = sanitizeTagSegment(url.searchParams.get('qualification') ?? undefined);
    const status = sanitizeTagSegment(url.searchParams.get('status') ?? undefined);
    const search = url.searchParams.get('search')?.trim();

    if (type) tags.add(`content:type:${type}`);
    if (category) tags.add(`content:category:${category}`);
    if (state) tags.add(`content:state:${state}`);
    if (organization) tags.add(`content:organization:${organization}`);
    if (qualification) tags.add(`content:qualification:${qualification}`);
    if (status) tags.add(`content:status:${status}`);
    if (search) tags.add('content:search');
  }

  if (url.pathname.startsWith('/posts/')) {
    const slug = sanitizeTagSegment(url.pathname.split('/').pop());
    tags.add('content:detail');
    tags.add('content:posts');
    if (slug) tags.add(`content:post:${slug}`);
  }

  if (url.pathname === '/pages') {
    tags.add('content:pages');
    const type = sanitizeTagSegment(url.searchParams.get('type') ?? undefined);
    if (type) tags.add(`content:pages:type:${type}`);
  }

  if (url.pathname.startsWith('/pages/')) {
    const slug = sanitizeTagSegment(url.pathname.split('/').pop());
    tags.add('content:pages');
    if (slug) tags.add(`content:page:${slug}`);
  }

  if (url.pathname.startsWith('/taxonomies/')) {
    const [, , taxonomyType, taxonomySlug] = url.pathname.split('/');
    const safeType = sanitizeTagSegment(taxonomyType);
    const safeSlug = sanitizeTagSegment(taxonomySlug);

    tags.add('content:taxonomies');
    if (safeType) tags.add(`content:taxonomies:${safeType}`);
    if (safeType === 'states' && safeSlug) tags.add(`content:state:${safeSlug}`);
    if (safeType === 'organizations' && safeSlug) tags.add(`content:organization:${safeSlug}`);
    if (safeType === 'categories' && safeSlug) tags.add(`content:category:${safeSlug}`);
    if (safeType === 'institutions' && safeSlug) tags.add(`content:institution:${safeSlug}`);
    if (safeType === 'exams' && safeSlug) tags.add(`content:exam:${safeSlug}`);
    if (safeType === 'qualifications' && safeSlug) tags.add(`content:qualification:${safeSlug}`);
  }

  return Array.from(tags);
}

const sectionThemeMap: Record<AnnouncementSection, DetailThemeTokens> = {
  jobs: { accent: '#e65100', gradientFrom: '#1a237e', gradientTo: '#283593', sidebarFrom: '#0d1b6e', sidebarTo: '#bf360c' },
  results: { accent: '#c62828', gradientFrom: '#8e0000', gradientTo: '#c62828', sidebarFrom: '#7f0000', sidebarTo: '#d32f2f' },
  'admit-cards': { accent: '#6a1b9a', gradientFrom: '#4a148c', gradientTo: '#6a1b9a', sidebarFrom: '#3f007d', sidebarTo: '#8e24aa' },
  'answer-keys': { accent: '#00695c', gradientFrom: '#004d40', gradientTo: '#00695c', sidebarFrom: '#00332d', sidebarTo: '#00796b' },
  admissions: { accent: '#ad1457', gradientFrom: '#880e4f', gradientTo: '#ad1457', sidebarFrom: '#6a0032', sidebarTo: '#c2185b' },
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleFromSlug(slug: string) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function sectionFromType(type: BackendPostRecord['type']): BackendSection {
  if (type === 'job') return 'jobs';
  if (type === 'result') return 'results';
  if (type === 'admit-card') return 'admit-cards';
  if (type === 'admission') return 'admissions';
  if (type === 'answer-key') return 'answer-keys';
  return 'syllabus';
}

function hrefFromType(type: BackendPostRecord['type'], slug: string) {
  if (type === 'job') return `/jobs/${slug}`;
  if (type === 'result') return `/results/${slug}`;
  if (type === 'admit-card') return `/admit-cards/${slug}`;
  if (type === 'admission') return `/admissions/${slug}`;
  if (type === 'answer-key') return `/answer-keys/${slug}`;
  return '/syllabus';
}

function createFallbackCard(input: {
  date: string;
  org: string;
  postCount?: string;
  qualification?: string;
  slug: string;
  stateSlugs?: string[];
  summary: string;
  tag?: BackendPublicCard['tag'];
  title: string;
  type: BackendPostRecord['type'];
}): BackendPublicCard {
  const section = sectionFromType(input.type);

  return {
    id: `fallback-${input.slug}`,
    legacySlugs: [],
    title: input.title,
    slug: input.slug,
    type: input.type,
    section,
    href: hrefFromType(input.type, input.slug),
    org: input.org,
    date: input.date,
    postCount: input.postCount,
    qualification: input.qualification,
    tag: input.tag,
    summary: input.summary,
    stateSlugs: input.stateSlugs ?? [],
    publishedAt: '2026-03-28T05:00:00.000Z',
    updatedAt: '2026-04-29T06:00:00.000Z',
    indexable: true,
  };
}

const fallbackTaxonomies: Record<BackendTaxonomyType, BackendTaxonomyDocument[]> = {
  states: [
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
  ].map((name) => ({ id: `fallback-state-${slugify(name)}`, name, slug: slugify(name) })),
  organizations: ['SSC', 'UPSC', 'IBPS', 'Railway', 'NTA', 'BPSC', 'BSEB', 'CSBC'].map((name) => ({
    id: `fallback-org-${slugify(name)}`,
    name,
    slug: slugify(name),
  })),
  categories: ['SSC', 'Railway', 'Banking', 'Teaching', 'Defence', 'State Govt'].map((name) => ({
    id: `fallback-category-${slugify(name)}`,
    name,
    slug: slugify(name),
  })),
  institutions: ['NTA', 'CBSE', 'BSEB'].map((name) => ({ id: `fallback-institution-${slugify(name)}`, name, slug: slugify(name) })),
  exams: ['SSC CGL', 'UPSC CSE', 'IBPS PO', 'RRB Group D', 'CUET UG'].map((name) => ({
    id: `fallback-exam-${slugify(name)}`,
    name,
    slug: slugify(name),
  })),
  qualifications: ['10th Pass', '12th Pass', 'Graduate', 'Post Graduate', 'Diploma'].map((name) => ({
    id: `fallback-qualification-${slugify(name)}`,
    name,
    slug: slugify(name),
  })),
};

const fallbackCards: BackendPublicCard[] = [
  createFallbackCard({
    type: 'job',
    slug: 'ssc-cgl-2026',
    title: 'SSC CGL 2026 Combined Graduate Level',
    org: 'SSC',
    date: '28 Mar',
    tag: 'hot',
    postCount: '14,582',
    qualification: 'Graduate',
    stateSlugs: ['delhi', 'uttar-pradesh', 'bihar'],
    summary: 'Staff Selection Commission has opened a sample public listing for SSC CGL 2026 with official-link style detail content.',
  }),
  createFallbackCard({
    type: 'job',
    slug: 'ibps-po-2026',
    title: 'IBPS PO 2026 Probationary Officer',
    org: 'IBPS',
    date: '26 Mar',
    tag: 'new',
    postCount: '4,500',
    qualification: 'Graduate',
    stateSlugs: ['maharashtra', 'delhi', 'karnataka'],
    summary: 'IBPS PO 2026 fallback listing keeps the jobs page populated when the backend API is not available.',
  }),
  createFallbackCard({
    type: 'job',
    slug: 'rrb-group-d-level-1-2026',
    title: 'RRB Group D Level 1 Posts 2026',
    org: 'Railway',
    date: '25 Mar',
    tag: 'new',
    postCount: '32,438',
    qualification: '10th Pass',
    stateSlugs: ['bihar', 'uttar-pradesh', 'rajasthan'],
    summary: 'Railway Group D sample entry provides a valid detail page and state-wise browsing fallback.',
  }),
  createFallbackCard({
    type: 'job',
    slug: 'bihar-police-constable-2026',
    title: 'Bihar Police Constable 2026',
    org: 'CSBC',
    date: '22 Mar',
    tag: 'new',
    postCount: '21,391',
    qualification: '12th Pass',
    stateSlugs: ['bihar'],
    summary: 'Bihar Police Constable fallback entry supports Bihar state pages and jobs search without API data.',
  }),
  createFallbackCard({
    type: 'result',
    slug: 'upsc-civil-services-2025-final-result',
    title: 'UPSC Civil Services 2025 Final Result',
    org: 'UPSC',
    date: '27 Mar',
    tag: 'hot',
    qualification: 'Graduate',
    stateSlugs: ['delhi'],
    summary: 'UPSC Civil Services final result sample entry keeps result routes and search pages available offline.',
  }),
  createFallbackCard({
    type: 'result',
    slug: 'ssc-chsl-2025-tier-2-result',
    title: 'SSC CHSL 2025 Tier 2 Result',
    org: 'SSC',
    date: '26 Mar',
    tag: 'new',
    qualification: '12th Pass',
    stateSlugs: ['uttar-pradesh', 'bihar', 'delhi'],
    summary: 'SSC CHSL result fallback provides a valid public result detail route.',
  }),
  createFallbackCard({
    type: 'result',
    slug: 'bihar-bpsc-69th-cce-final-result',
    title: 'Bihar BPSC 69th CCE Final Result',
    org: 'BPSC',
    date: '21 Mar',
    tag: 'hot',
    qualification: 'Graduate',
    stateSlugs: ['bihar'],
    summary: 'BPSC result fallback supports organization and Bihar state result pages.',
  }),
  createFallbackCard({
    type: 'admit-card',
    slug: 'ssc-gd-constable-2026-pet-pst',
    title: 'SSC GD Constable 2026 PET/PST Admit Card',
    org: 'SSC',
    date: '28 Mar',
    tag: 'hot',
    qualification: '10th Pass',
    stateSlugs: ['uttar-pradesh', 'bihar', 'rajasthan'],
    summary: 'SSC GD PET/PST admit card sample keeps admit-card listing and detail pages working.',
  }),
  createFallbackCard({
    type: 'admit-card',
    slug: 'upsc-epfo-2026-admit-card',
    title: 'UPSC EPFO 2026 Admit Card',
    org: 'UPSC',
    date: '27 Mar',
    tag: 'new',
    qualification: 'Graduate',
    stateSlugs: ['delhi'],
    summary: 'UPSC EPFO admit card fallback gives users a valid document-style detail page.',
  }),
  createFallbackCard({
    type: 'admission',
    slug: 'cuet-ug-admission-online-form-2026',
    title: 'CUET UG Admission Online Form 2026',
    org: 'NTA',
    date: '23 Mar',
    tag: 'new',
    qualification: '12th Pass',
    stateSlugs: ['delhi', 'uttar-pradesh'],
    summary: 'CUET UG admission fallback keeps admissions pages populated without the backend.',
  }),
  createFallbackCard({
    type: 'answer-key',
    slug: 'ssc-cgl-tier-1-answer-key-2026',
    title: 'SSC CGL Tier 1 Answer Key 2026',
    org: 'SSC',
    date: '24 Mar',
    tag: 'update',
    qualification: 'Graduate',
    stateSlugs: ['delhi', 'uttar-pradesh'],
    summary: 'SSC CGL answer key fallback supports answer-key listing and detail pages.',
  }),
];

function fallbackSections(): Record<BackendSection, BackendPublicCard[]> {
  return {
    jobs: fallbackCards.filter((card) => card.section === 'jobs'),
    results: fallbackCards.filter((card) => card.section === 'results'),
    'admit-cards': fallbackCards.filter((card) => card.section === 'admit-cards'),
    admissions: fallbackCards.filter((card) => card.section === 'admissions'),
    'answer-keys': fallbackCards.filter((card) => card.section === 'answer-keys'),
    syllabus: [],
  };
}

function officialSourceForOrg(org: string): BackendOfficialSource {
  const slug = slugify(org);
  const sourceMap: Record<string, string> = {
    bpsc: 'https://bpsc.bih.nic.in',
    bseb: 'https://biharboardonline.bihar.gov.in',
    csbc: 'https://csbc.bih.nic.in',
    ibps: 'https://www.ibps.in',
    nta: 'https://nta.ac.in',
    railway: 'https://indianrailways.gov.in',
    ssc: 'https://ssc.nic.in',
    upsc: 'https://upsc.gov.in',
  };

  return {
    label: `${org} Official Website`,
    url: sourceMap[slug] || 'https://www.india.gov.in',
    sourceType: 'website',
    isPrimary: true,
  };
}

function fallbackCardToPost(card: BackendPublicCard): BackendPostRecord {
  const organization = { name: card.org, slug: slugify(card.org) };
  const categoryName = card.type === 'job' ? 'Recruitment' : announcementCategoryMeta[toSection(card.type)].title;
  const qualification = card.qualification || 'Refer official notice';

  return {
    id: card.id,
    title: card.title,
    slug: card.slug,
    legacySlugs: card.legacySlugs,
    type: card.type,
    summary: card.summary || card.title,
    shortInfo: card.summary || card.title,
    body: `${card.title} is available as a static fallback page so SarkariExams.me can run without a live backend API. Verify all final dates, eligibility, fees, and downloads on the official portal before taking action.`,
    organization,
    categories: [{ name: categoryName, slug: slugify(categoryName) }],
    states: card.stateSlugs.map((slug) => ({ name: titleFromSlug(slug), slug })),
    qualifications: [{ name: qualification, slug: slugify(qualification) }],
    importantDates: [
      { label: 'Notification Date', value: '2026-03-28T05:00:00.000Z', kind: 'notification' },
      { label: card.type === 'result' ? 'Result Date' : 'Last Date / Next Update', value: '2026-04-30T05:00:00.000Z', kind: 'last_date' },
    ],
    eligibility: [
      { label: 'Qualification', description: qualification },
      { label: 'Age Limit', description: 'Check the official notification for post-wise age limits and relaxation rules.' },
    ],
    feeRules: [
      { category: 'General / OBC / EWS', amount: 'Check official notice', paymentNote: 'Fee rules vary by category and update type.' },
      { category: 'SC / ST / PwD', amount: 'Check official notice' },
    ],
    vacancyRows: card.type === 'job'
      ? [
          {
            postName: card.title,
            department: card.org,
            vacancies: card.postCount || 'Refer official notice',
            payLevel: 'As per rules',
            salaryNote: 'See official notification',
          },
        ]
      : [],
    admissionPrograms: card.type === 'admission'
      ? [
          {
            programName: card.title,
            level: qualification,
            department: card.org,
            intake: card.postCount || 'Refer official notice',
            eligibilityNote: qualification,
          },
        ]
      : [],
    officialSources: [officialSourceForOrg(card.org)],
    trust: {
      verificationNote: 'Static fallback content is shown because the live API is unavailable. Always verify from the official portal.',
    },
    seo: {
      effectiveTitle: `${card.title} | SarkariExams.me`,
      effectiveDescription: card.summary || card.title,
      effectiveCanonicalPath: card.href,
      indexable: true,
    },
    tag: card.tag,
    location: card.stateSlugs.length ? card.stateSlugs.map(titleFromSlug).join(', ') : 'India',
    salary: card.type === 'job' ? 'Refer to the official notification' : undefined,
    postCount: card.postCount,
    lastDate: '2026-04-30T05:00:00.000Z',
    resultDate: card.type === 'result' ? '2026-03-27T05:00:00.000Z' : undefined,
    publishedAt: card.publishedAt,
    updatedAt: card.updatedAt || '2026-04-29T06:00:00.000Z',
  };
}

function fallbackDetailForCard(card: BackendPublicCard): BackendPublicDetail {
  const relatedCards = fallbackCards
    .filter((item) => item.slug !== card.slug && item.section === card.section)
    .slice(0, 4);

  return {
    post: fallbackCardToPost(card),
    card,
    canonicalPath: card.href,
    section: card.section,
    relatedCards,
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: announcementCategoryMeta[toSection(card.type)].title, href: announcementCategoryMeta[toSection(card.type)].canonicalPath },
      { label: card.title, href: card.href },
    ],
    archiveState: 'active',
  };
}

function fallbackDetailBySlug(slug: string): BackendPublicDetail | null {
  const card = fallbackCards.find((item) => item.slug === slug || item.legacySlugs.includes(slug));
  return card ? fallbackDetailForCard(card) : null;
}

function matchesFallbackParams(card: BackendPublicCard, params: {
  category?: string;
  organization?: string;
  qualification?: string;
  search?: string;
  state?: string;
  type?: BackendPostRecord['type'];
}) {
  if (params.type && card.type !== params.type) return false;
  if (params.state && !card.stateSlugs.includes(slugify(params.state))) return false;
  if (params.organization && slugify(card.org) !== slugify(params.organization)) return false;
  if (params.qualification && !slugify(card.qualification || '').includes(slugify(params.qualification))) return false;
  if (params.category && !slugify(card.title).includes(slugify(params.category)) && !slugify(card.org).includes(slugify(params.category))) return false;

  if (params.search) {
    const search = params.search.trim().toLowerCase();
    const haystack = [card.title, card.org, card.summary, card.qualification, card.postCount].filter(Boolean).join(' ').toLowerCase();
    if (!haystack.includes(search)) return false;
  }

  return true;
}

function getFallbackCards(params: {
  category?: string;
  limit?: number;
  organization?: string;
  qualification?: string;
  search?: string;
  state?: string;
  status?: 'active' | 'expired' | 'archived' | 'all';
  type?: BackendPostRecord['type'];
}) {
  void params.status;
  const limit = params.limit && params.limit > 0 ? params.limit : fallbackCards.length;
  return fallbackCards.filter((card) => matchesFallbackParams(card, params)).slice(0, limit);
}

function fallbackTaxonomy(type: BackendTaxonomyType, slug: string): BackendTaxonomyDocument {
  const normalizedSlug = slugify(slug);
  const existing = fallbackTaxonomies[type].find((item) => item.slug === normalizedSlug);
  return existing || {
    id: `fallback-${type}-${normalizedSlug}`,
    name: titleFromSlug(normalizedSlug),
    slug: normalizedSlug,
  };
}

function fallbackTaxonomyLanding(type: BackendTaxonomyType, slug: string): BackendTaxonomyLanding {
  const taxonomy = fallbackTaxonomy(type, slug);
  const cards = type === 'states'
    ? getFallbackCards({ state: taxonomy.slug, limit: 30 })
    : type === 'organizations'
      ? getFallbackCards({ organization: taxonomy.slug, limit: 30 })
      : fallbackCards.slice(0, 30);

  return {
    taxonomy,
    cards,
    relatedCounts: cards.reduce<Record<string, number>>((counts, card) => {
      counts[card.section] = (counts[card.section] || 0) + 1;
      return counts;
    }, {}),
  };
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${CONTENT_BASE}${path}`, {
    next: {
      revalidate: Number.isFinite(CONTENT_REVALIDATE_SECONDS) ? CONTENT_REVALIDATE_SECONDS : 300,
      tags: buildContentTags(path),
    },
  });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

const DEFAULT_HEADER_COLOR = 'bg-[#37474f]';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

function coerceQuickLinks(value: unknown, fallback: QuickLink[] = []): QuickLink[] {
  if (!Array.isArray(value)) return fallback;
  const links = value
    .map((item) => {
      const row = asRecord(item);
      const label = asString(row?.label);
      const href = asString(row?.href);
      if (!label || !href) return null;
      return { label, href };
    })
    .filter((item): item is QuickLink => Boolean(item));
  return links.length > 0 ? links : fallback;
}

function coerceStats(value: unknown, fallback: PublicStat[] = []): PublicStat[] {
  if (!Array.isArray(value)) return fallback;
  const stats = value
    .map((item) => {
      const row = asRecord(item);
      const label = asString(row?.label);
      const statValue = asString(row?.value);
      if (!label || !statValue) return null;
      return { label, value: statValue };
    })
    .filter((item): item is PublicStat => Boolean(item));
  return stats.length > 0 ? stats : fallback;
}

function coerceSections(value: unknown, fallback: InfoPageSection[] = []): InfoPageSection[] {
  if (!Array.isArray(value)) return fallback;
  const sections = value
    .map((item) => {
      const row = asRecord(item);
      const title = asString(row?.title);
      const bodyRaw = row?.body;
      const body = Array.isArray(bodyRaw)
        ? bodyRaw.map((entry) => asString(entry)).filter((entry): entry is string => Boolean(entry))
        : asString(bodyRaw)
          ? [asString(bodyRaw)!]
          : [];

      if (!title || body.length === 0) return null;
      return { title, body };
    })
    .filter((item): item is InfoPageSection => Boolean(item));
  return sections.length > 0 ? sections : fallback;
}

function coerceAuxiliaryCards(value: unknown, fallback: AuxiliaryActionCard[] = []): AuxiliaryActionCard[] {
  if (!Array.isArray(value)) return fallback;
  const cards = value
    .map((item) => {
      const row = asRecord(item);
      const label = asString(row?.label);
      const href = asString(row?.href);
      const description = asString(row?.description) || '';
      if (!label || !href) return null;
      return { label, href, description };
    })
    .filter((item): item is AuxiliaryActionCard => Boolean(item));
  return cards.length > 0 ? cards : fallback;
}

function coerceResourceCards(value: unknown, fallback: ResourceCard[] = []): ResourceCard[] {
  if (!Array.isArray(value)) return fallback;
  const cards = value
    .map((item) => {
      const row = asRecord(item);
      const label = asString(row?.label);
      const href = asString(row?.href);
      const description = asString(row?.description) || '';
      if (!label || !href) return null;
      return { label, href, description };
    })
    .filter((item): item is ResourceCard => Boolean(item));
  return cards.length > 0 ? cards : fallback;
}

function coerceHighlights(value: unknown, fallback: string[] = []): string[] {
  const highlights = asStringArray(value);
  return highlights.length > 0 ? highlights : fallback;
}

function canonicalPathFromPage(page: BackendContentPageRecord, fallback?: string) {
  return page.seoCanonicalPath || fallback || `/${page.slug}`;
}

export async function getContentPageBySlug(slug: string): Promise<BackendContentPageRecord | null> {
  try {
    const response = await fetchJson<{ data: BackendContentPageRecord }>(`/pages/${encodeURIComponent(slug)}`);
    return response.data;
  } catch {
    return null;
  }
}

export async function getContentPagesByType(type: BackendContentPageType, limit = 100): Promise<BackendContentPageRecord[]> {
  const params = new URLSearchParams({ type, limit: String(limit) });
  try {
    const response = await fetchJson<{ data: BackendContentPageRecord[] }>(`/pages?${params.toString()}`);
    return response.data;
  } catch {
    return [];
  }
}

export function mapContentPageToInfoMeta(page: BackendContentPageRecord, fallback?: InfoPageMeta): InfoPageMeta {
  const payload = asRecord(page.payload) || {};
  return {
    canonicalPath: canonicalPathFromPage(page, fallback?.canonicalPath),
    description: page.description || fallback?.description || '',
    eyebrow: page.eyebrow || fallback?.eyebrow || 'Public Information',
    headerColor: page.headerColor || fallback?.headerColor || DEFAULT_HEADER_COLOR,
    quickLinks: coerceQuickLinks(payload.quickLinks, fallback?.quickLinks || []),
    sections: coerceSections(payload.sections, fallback?.sections || []),
    slug: (fallback?.slug || page.slug) as InfoPageMeta['slug'],
    stats: coerceStats(payload.stats, fallback?.stats || []),
    title: page.title || fallback?.title || page.slug,
  };
}

export function mapContentPageToAuxiliaryMeta(page: BackendContentPageRecord, fallback?: AuxiliaryPageMeta): AuxiliaryPageMeta {
  const payload = asRecord(page.payload) || {};
  return {
    canonicalPath: canonicalPathFromPage(page, fallback?.canonicalPath),
    cards: coerceAuxiliaryCards(payload.cards, fallback?.cards || []),
    description: page.description || fallback?.description || '',
    eyebrow: page.eyebrow || fallback?.eyebrow || 'Utility Pages',
    headerColor: page.headerColor || fallback?.headerColor || DEFAULT_HEADER_COLOR,
    quickLinks: coerceQuickLinks(payload.quickLinks, fallback?.quickLinks || []),
    sections: coerceSections(payload.sections, fallback?.sections || []),
    slug: (fallback?.slug || page.slug) as AuxiliaryPageSlug,
    stats: coerceStats(payload.stats, fallback?.stats || []),
    title: page.title || fallback?.title || page.slug,
  };
}

export function mapContentPageToCommunityMeta(page: BackendContentPageRecord, fallback?: CommunityPageMeta): CommunityPageMeta {
  const payload = asRecord(page.payload) || {};
  return {
    canonicalPath: canonicalPathFromPage(page, fallback?.canonicalPath),
    channel: (fallback?.channel || page.slug) as CommunityChannel,
    ctaLabel: asString(payload.ctaLabel) || fallback?.ctaLabel || 'Join Community',
    description: page.description || fallback?.description || '',
    externalUrl: asString(payload.externalUrl) || fallback?.externalUrl,
    eyebrow: page.eyebrow || fallback?.eyebrow || 'Community',
    headerColor: page.headerColor || fallback?.headerColor || DEFAULT_HEADER_COLOR,
    quickLinks: coerceQuickLinks(payload.quickLinks, fallback?.quickLinks || []),
    sections: coerceSections(payload.sections, fallback?.sections || []),
    stats: coerceStats(payload.stats, fallback?.stats || []),
    title: page.title || fallback?.title || page.slug,
  };
}

export function mapContentPageToResourceMeta(page: BackendContentPageRecord, fallback?: ResourceCategoryMeta): ResourceCategoryMeta {
  const payload = asRecord(page.payload) || {};
  return {
    canonicalPath: canonicalPathFromPage(page, fallback?.canonicalPath),
    description: page.description || fallback?.description || '',
    eyebrow: page.eyebrow || fallback?.eyebrow || 'Resource Hub',
    headerColor: page.headerColor || fallback?.headerColor || DEFAULT_HEADER_COLOR,
    highlights: coerceHighlights(payload.highlights, fallback?.highlights || []),
    listingTitle: asString(payload.listingTitle) || fallback?.listingTitle || 'Featured Resources',
    quickLinks: coerceQuickLinks(payload.quickLinks, fallback?.quickLinks || []),
    resourceCards: coerceResourceCards(payload.resourceCards || payload.cards, fallback?.resourceCards || []),
    slug: (fallback?.slug || page.slug) as ResourceCategorySlug,
    stats: coerceStats(payload.stats, fallback?.stats || []),
    title: page.title || fallback?.title || page.slug,
  };
}

export async function loadInfoPageMeta(slug: string, fallback?: InfoPageMeta): Promise<InfoPageMeta | null> {
  const page = await getContentPageBySlug(slug);
  if (!page || page.pageType !== 'info') {
    return fallback || null;
  }
  return mapContentPageToInfoMeta(page, fallback);
}

export async function loadAuxiliaryPageMeta(slug: string, fallback?: AuxiliaryPageMeta): Promise<AuxiliaryPageMeta | null> {
  const page = await getContentPageBySlug(slug);
  if (!page || page.pageType !== 'auxiliary') {
    return fallback || null;
  }
  return mapContentPageToAuxiliaryMeta(page, fallback);
}

export async function loadCommunityPageMeta(slug: string, fallback?: CommunityPageMeta): Promise<CommunityPageMeta | null> {
  const page = await getContentPageBySlug(slug);
  if (!page || page.pageType !== 'community') {
    return fallback || null;
  }
  return mapContentPageToCommunityMeta(page, fallback);
}

export async function loadResourceCategoryMeta(slug: string, fallback?: ResourceCategoryMeta): Promise<ResourceCategoryMeta | null> {
  const page = await getContentPageBySlug(slug);
  if (!page || page.pageType !== 'resource_meta') {
    return fallback || null;
  }
  return mapContentPageToResourceMeta(page, fallback);
}

function safeDateLabel(value?: string) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function toPortalEntry(card: BackendPublicCard): PortalListEntry {
  return {
    href: card.href,
    title: card.title,
    org: card.org,
    date: card.date,
    tag: card.tag,
    postCount: card.postCount,
    qualification: card.qualification,
    publishedAt: card.publishedAt,
    updatedAt: card.updatedAt,
  };
}

function toSection(type: BackendPostRecord['type']): AnnouncementSection {
  if (type === 'job') return 'jobs';
  if (type === 'result') return 'results';
  if (type === 'admit-card') return 'admit-cards';
  if (type === 'admission') return 'admissions';
  return 'answer-keys';
}

function sourceLinks(sources: BackendOfficialSource[]): DetailImportantLink[] {
  return sources.map((source, index) => ({
    href: source.url,
    label: source.label,
    note: source.sourceType ? source.sourceType.replace('-', ' ') : undefined,
    emphasis: index === 0 ? 'primary' : 'secondary',
    icon: source.sourceType === 'notification' || source.sourceType === 'result' ? 'pdf' : 'web',
    type: source.sourceType === 'result' ? 'result' : source.sourceType === 'website' ? 'website' : 'download',
  }));
}

export function mapDetailToAnnouncementItem(detail: BackendPublicDetail): AnnouncementItem {
  const section = toSection(detail.post.type);
  const theme = sectionThemeMap[section];
  const officialLinks = sourceLinks(detail.post.officialSources);
  const feeRows = detail.post.feeRules.map((rule) => ({
    label: rule.category,
    value: rule.amount,
  }));

  return {
    departments: detail.post.categories.map((item) => item.name),
    date: detail.card.date,
    detail: {
      applicationFee: feeRows.length
        ? {
            note: detail.post.feeRules[0]?.paymentNote,
            rows: feeRows,
            title: 'Application Fee',
          }
        : undefined,
      cta: officialLinks[0]
        ? {
            primaryHref: officialLinks[0].href,
            primaryLabel: officialLinks[0].label,
            secondaryHref: officialLinks[1]?.href,
            secondaryLabel: officialLinks[1]?.label,
          }
        : undefined,
      engagement: {
        comments: 0,
        likes: '0',
        views: '0',
      },
      extraSections: detail.post.body
        ? [
            {
              id: 'body',
              title: 'Detailed Overview',
              paragraphs: detail.post.body.split(/\n+/).map((item) => item.trim()).filter(Boolean).slice(0, 8),
            },
          ]
        : [],
      eligibility: detail.post.eligibility.map((item) => ({
        title: item.label,
        description: item.description,
      })),
      eyebrow: announcementCategoryMeta[section].eyebrow,
      heroStats: [
        { label: 'Organization', value: detail.card.org },
        { label: 'Status', value: detail.archiveState === 'archived' ? 'Archived' : detail.archiveState === 'expired' ? 'Expired' : 'Live' },
        { label: 'Updated', value: safeDateLabel(detail.post.updatedAt) || detail.card.date || 'Recent' },
        { label: 'Official Links', value: `${officialLinks.length}` },
      ],
      importantDates: detail.post.importantDates.map((item) => ({
        label: item.label,
        date: safeDateLabel(item.value),
        status: item.kind === 'last_date' ? 'active' : 'upcoming',
      })),
      importantLinks: officialLinks,
      notice: detail.archiveState !== 'active'
        ? {
            title: detail.archiveState === 'archived' ? 'Archived Notice' : 'Expired Notice',
            tone: 'warning',
            body: ['This item is no longer active. Verify any next action from the latest official source before proceeding.'],
          }
        : detail.post.trust.verificationNote
          ? {
              title: 'Verification Note',
              tone: 'info',
              body: [detail.post.trust.verificationNote],
            }
          : undefined,
      overviewTitle: 'Official Update Summary',
      qa: [],
      relatedPosts: detail.relatedCards.map((card) => ({
        category: announcementCategoryMeta[toSection(card.type)].title,
        date: card.date,
        href: card.href,
        posts: card.postCount,
        tag: card.tag,
        title: card.title,
      })),
      selectionProcess: [],
      sourceNote: detail.post.trust.verificationNote || (detail.post.officialSources[0] ? `Primary source: ${detail.post.officialSources[0].label}` : undefined),
      subscribePrompt: {
        title: 'Track Similar Updates',
        description: 'Subscribe for state, organization, and category alerts as this platform expands its notification workflow.',
        buttonLabel: 'Get Alerts',
      },
      summaryMeta: {
        ageLimit: detail.post.eligibility.find((item) => /age/i.test(item.label))?.description,
        applicationStartDate: safeDateLabel(detail.post.applicationStartDate) || 'Check official notice',
        examDate: safeDateLabel(detail.post.examDate) || safeDateLabel(detail.post.resultDate) || 'Check official notice',
        lastDate: safeDateLabel(detail.post.lastDate) || 'Check official notice',
        location: detail.post.location || 'India',
        orgShort: detail.card.org,
        publishedDate: safeDateLabel(detail.post.publishedAt) || detail.card.date || 'Recent',
        salary: detail.post.salary || 'Refer to the official notification',
      },
      theme,
      vacancyTable: detail.post.vacancyRows.length
        ? {
            columns: ['Post', 'Department', 'Vacancies', 'Pay Level', 'Salary'],
            rows: detail.post.vacancyRows.map((row) => ({
              post: row.postName,
              department: row.department || '-',
              vacancies: row.vacancies,
              payLevel: row.payLevel,
              salary: row.salaryNote,
            })),
          }
        : undefined,
    },
    headline: detail.post.summary,
    keyPoints: [
      detail.post.summary,
      detail.post.lastDate ? `Last date: ${safeDateLabel(detail.post.lastDate)}` : '',
      detail.post.qualifications[0]?.name ? `Eligibility: ${detail.post.qualifications[0].name}` : '',
    ].filter(Boolean),
    legacyId: detail.card.legacyId,
    legacySlugs: detail.card.legacySlugs,
    listed: true,
    keywords: [
      detail.post.title,
      detail.card.org,
      ...detail.post.categories.map((item) => item.name),
      ...detail.post.qualifications.map((item) => item.name),
    ],
    org: detail.card.org,
    postCount: detail.card.postCount,
    publishedAt: detail.post.publishedAt,
    qualification: detail.card.qualification,
    section,
    shortInfo: detail.post.shortInfo || detail.post.summary,
    slug: detail.post.slug,
    stateSlugs: detail.card.stateSlugs,
    summary: detail.post.summary,
    tag: detail.card.tag,
    title: detail.post.title,
    updatedAt: detail.post.updatedAt,
    usefulLinks: detail.breadcrumbs.slice(0, 3).map((crumb) => ({ href: crumb.href, label: crumb.label })),
  };
}

export async function getHomepageSections() {
  try {
    const response = await fetchJson<{ data: Record<BackendSection, BackendPublicCard[]> }>('/homepage');
    return response.data;
  } catch {
    return fallbackSections();
  }
}

export async function getListingEntries(params: {
  type?: BackendPostRecord['type'];
  search?: string;
  category?: string;
  state?: string;
  organization?: string;
  qualification?: string;
  status?: 'active' | 'expired' | 'archived' | 'all';
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) searchParams.set(key, String(value));
  }

  try {
    const response = await fetchJson<{ data: BackendPublicCard[]; total: number; count: number }>(`/posts?${searchParams.toString()}`);
    return response.data.map(toPortalEntry);
  } catch {
    return getFallbackCards(params).map(toPortalEntry);
  }
}

export async function getRawListing(params: {
  type?: BackendPostRecord['type'];
  search?: string;
  category?: string;
  state?: string;
  organization?: string;
  qualification?: string;
  status?: 'active' | 'expired' | 'archived' | 'all';
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) searchParams.set(key, String(value));
  }
  try {
    const response = await fetchJson<{ data: BackendPublicCard[]; total: number; count: number }>(`/posts?${searchParams.toString()}`);
    return response.data;
  } catch {
    return getFallbackCards(params);
  }
}

export async function getDetail(slug: string) {
  try {
    const response = await fetchJson<{ data: BackendPublicDetail }>(`/posts/${encodeURIComponent(slug)}`);
    return response.data;
  } catch {
    const fallbackDetail = fallbackDetailBySlug(slug);
    if (!fallbackDetail) {
      throw new Error(`Fallback detail not found: ${slug}`);
    }
    return fallbackDetail;
  }
}

export async function getTaxonomyList(type: BackendTaxonomyType) {
  try {
    const response = await fetchJson<{ data: BackendTaxonomyDocument[] }>(`/taxonomies/${type}`);
    return response.data;
  } catch {
    return fallbackTaxonomies[type] || [];
  }
}

export async function getTaxonomyLanding(type: BackendTaxonomyType, slug: string) {
  try {
    const response = await fetchJson<{ data: BackendTaxonomyLanding }>(`/taxonomies/${type}/${encodeURIComponent(slug)}`);
    return response.data;
  } catch {
    return fallbackTaxonomyLanding(type, slug);
  }
}

export function mapTaxonomyStateToMeta(state: BackendTaxonomyDocument, _counts?: Partial<Record<string, number>>): StatePageMeta {
  void _counts;

  return {
    canonicalPath: `/states/${state.slug}`,
    description: `Browse state-wise government jobs, results, admit cards, and admissions for ${state.name}.`,
    featuredLinks: [
      { label: `${state.name} Jobs`, href: `/jobs?state=${state.slug}` },
      { label: `${state.name} Results`, href: `/results?state=${state.slug}` },
      { label: `${state.name} Admit Cards`, href: `/admit-cards?state=${state.slug}` },
      { label: `${state.name} Admissions`, href: `/admissions?state=${state.slug}` },
    ],
    slug: state.slug,
    title: `${state.name} Government Opportunities`,
  };
}

export function buildOrganizationMeta(name: string): CategoryPageMeta {
  return {
    canonicalPath: '/organizations',
    description: `Officially sourced government jobs, results, admit cards, and admissions from ${name}.`,
    eyebrow: 'Organization Wise Updates',
    headerColor: 'bg-[#37474f]',
    highlights: [
      'Organization pages group updates from one recruiting body or institution.',
      'Each listing and detail page keeps official links, dates, and verification notes easy to review.',
      'Official links and verification notes remain visible on detail pages.',
    ],
    listingTitle: `Latest ${name} Updates`,
    quickLinks: [
      { label: 'Latest Jobs', href: '/jobs' },
      { label: 'Latest Results', href: '/results' },
      { label: 'Latest Admit Cards', href: '/admit-cards' },
      { label: 'Latest Admissions', href: '/admissions' },
    ],
    slug: 'organizations',
    stats: [
      { label: 'Source', value: 'Backend' },
      { label: 'Trust', value: 'Official Links' },
      { label: 'Workflow', value: 'Editorial' },
      { label: 'SEO', value: 'Canonical' },
    ],
    title: `${name} Updates`,
  };
}
