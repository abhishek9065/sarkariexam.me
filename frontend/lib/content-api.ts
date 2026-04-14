import { resolvePublicApiBase } from './api';
import type {
  AnnouncementItem,
  AnnouncementSection,
  CategoryPageMeta,
  DetailImportantLink,
  DetailThemeTokens,
  PortalListEntry,
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
}

interface BackendTaxonomyLanding {
  taxonomy: BackendTaxonomyDocument;
  cards: BackendPublicCard[];
  relatedCounts: Record<string, number>;
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
        applicationStartDate: safeDateLabel(detail.post.applicationStartDate) || 'Check notice',
        examDate: safeDateLabel(detail.post.examDate) || safeDateLabel(detail.post.resultDate) || 'Check notice',
        lastDate: safeDateLabel(detail.post.lastDate) || 'Check notice',
        location: detail.post.location || 'India',
        orgShort: detail.card.org,
        publishedDate: safeDateLabel(detail.post.publishedAt) || detail.card.date || 'Recent',
        salary: detail.post.salary || 'Refer official notification',
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
    qualification: detail.card.qualification,
    section,
    shortInfo: detail.post.shortInfo || detail.post.summary,
    slug: detail.post.slug,
    stateSlugs: detail.card.stateSlugs,
    summary: detail.post.summary,
    tag: detail.card.tag,
    title: detail.post.title,
    usefulLinks: detail.breadcrumbs.slice(0, 3).map((crumb) => ({ href: crumb.href, label: crumb.label })),
  };
}

export async function getHomepageSections() {
  try {
    const response = await fetchJson<{ data: Record<BackendSection, BackendPublicCard[]> }>('/homepage');
    return response.data;
  } catch {
    return {
      jobs: [],
      results: [],
      'admit-cards': [],
      admissions: [],
      'answer-keys': [],
      syllabus: [],
    } satisfies Record<BackendSection, BackendPublicCard[]>;
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
    return [];
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
  const response = await fetchJson<{ data: BackendPublicCard[]; total: number; count: number }>(`/posts?${searchParams.toString()}`);
  return response.data;
}

export async function getDetail(slug: string) {
  const response = await fetchJson<{ data: BackendPublicDetail }>(`/posts/${slug}`);
  return response.data;
}

export async function getTaxonomyList(type: 'states' | 'organizations' | 'categories' | 'institutions' | 'exams') {
  const response = await fetchJson<{ data: BackendTaxonomyDocument[] }>(`/taxonomies/${type}`);
  return response.data;
}

export async function getTaxonomyLanding(type: 'states' | 'organizations' | 'categories' | 'institutions' | 'exams', slug: string) {
  const response = await fetchJson<{ data: BackendTaxonomyLanding }>(`/taxonomies/${type}/${slug}`);
  return response.data;
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
    canonicalPath: `/organizations/${name}`,
    description: `Officially sourced government jobs, results, admit cards, and admissions from ${name}.`,
    eyebrow: 'Organization Wise Updates',
    headerColor: 'bg-[#37474f]',
    highlights: [
      'Organization pages group updates from one recruiting body or institution.',
      'Each listing and detail page preserves canonical public paths and dense browsing.',
      'Official links and verification notes remain visible on detail pages.',
    ],
    listingTitle: `Latest ${name} Updates`,
    quickLinks: [
      { label: 'Latest Jobs', href: '/jobs' },
      { label: 'Latest Results', href: '/results' },
      { label: 'Latest Admit Cards', href: '/admit-cards' },
      { label: 'Latest Admissions', href: '/admissions' },
    ],
    slug: 'states',
    stats: [
      { label: 'Source', value: 'Backend' },
      { label: 'Trust', value: 'Official Links' },
      { label: 'Workflow', value: 'Editorial' },
      { label: 'SEO', value: 'Canonical' },
    ],
    title: `${name} Updates`,
  };
}
