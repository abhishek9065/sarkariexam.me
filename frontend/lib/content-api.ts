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
  const response = await fetchJson<{ data: BackendPublicDetail }>(`/posts/${encodeURIComponent(slug)}`);
  return response.data;
}

export async function getTaxonomyList(type: BackendTaxonomyType) {
  const response = await fetchJson<{ data: BackendTaxonomyDocument[] }>(`/taxonomies/${type}`);
  return response.data;
}

export async function getTaxonomyLanding(type: BackendTaxonomyType, slug: string) {
  const response = await fetchJson<{ data: BackendTaxonomyLanding }>(`/taxonomies/${type}/${encodeURIComponent(slug)}`);
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
