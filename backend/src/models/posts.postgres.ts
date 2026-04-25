import type { Prisma } from '@prisma/client';
import {
  ImportantDateKind as PrismaImportantDateKind,
  PostType as PrismaPostType,
  TrustTag as PrismaTrustTag,
  WorkflowStatus as PrismaWorkflowStatus,
} from '@prisma/client';

import type {
  AlertMatchPreview,
  AdminPostListResult,
  AuditLogRecord,
  PostRecord,
  PostType,
  PostWorkflowStatus,
  PostVersionRecord,
  PublicPostCard,
  PublicPostDetail,
  PublicSection,
  TaxonomyRef,
} from '../content/types.js';
import { publicSectionMap } from '../content/types.js';
import { prisma } from '../services/postgres/prisma.js';
import { slugify } from '../utils/slugify.js';

import AlertSubscriptionModelPostgres from './alertSubscriptions.postgres.js';
import ContentTaxonomyModelPostgres from './contentTaxonomies.postgres.js';

const postInclude = {
  organization: true,
  institution: true,
  exam: true,
  program: true,
  postCategories: {
    include: { category: true },
  },
  postStates: {
    include: { state: true },
  },
  postQualifications: {
    include: { qualification: true },
  },
  officialSources: {
    orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
  },
  importantDates: {
    orderBy: { position: 'asc' },
  },
  eligibilityRules: {
    include: { qualification: true },
    orderBy: { position: 'asc' },
  },
  feeRules: {
    orderBy: { position: 'asc' },
  },
  vacancyRows: {
    orderBy: { position: 'asc' },
  },
  admissionDetails: true,
  slugAliases: true,
} satisfies Prisma.PostInclude;

const postCardInclude = {
  organization: true,
  postQualifications: {
    include: { qualification: true },
  },
  postStates: {
    include: { state: true },
  },
  slugAliases: true,
} satisfies Prisma.PostInclude;

type PostWithRelations = Prisma.PostGetPayload<{ include: typeof postInclude }>;
type PostCardWithRelations = Prisma.PostGetPayload<{ include: typeof postCardInclude }>;
type PostInput = Omit<PostRecord, 'id' | 'createdAt' | 'updatedAt' | 'currentVersion' | 'searchText' | 'freshness' | 'searchMeta' | 'readiness'>;

const SEARCH_STOP_WORDS = new Set(['the', 'for', 'and', 'with', 'from', 'into', 'over', 'under', 'exam', 'online']);
const SEARCH_TYPE_TERMS: Record<PostType, string[]> = {
  job: ['job', 'jobs', 'recruitment', 'vacancy', 'vacancies', 'bharti'],
  result: ['result', 'results', 'score', 'merit', 'cutoff'],
  'admit-card': ['admit', 'card', 'hall', 'ticket'],
  admission: ['admission', 'admissions', 'counselling', 'seat'],
  'answer-key': ['answer', 'key', 'objection', 'response'],
  syllabus: ['syllabus', 'scheme', 'exam', 'pattern'],
};
const TRUST_SOURCE_REFRESH_DAYS = 30;
const TRUST_SOURCE_STALE_DAYS = 45;
const SEARCH_READY_MIN_TERMS = 8;
const SEARCH_PUBLISH_MIN_TERMS = 12;

function formatEditorialDate(value?: Date | null): string | undefined {
  if (!value) return undefined;
  return value.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function normalizeHostname(value?: string | null): string | null {
  if (!value?.trim()) return null;
  try {
    return new URL(value).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

function hostsMatch(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`);
}

function trimToLength(value: string, max: number) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function normalizeSearchTokens(value?: string | null) {
  return Array.from(new Set(
    (value || '')
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2 && !SEARCH_STOP_WORDS.has(token)),
  ));
}

function buildSearchTokenClauses(term?: string | null): Prisma.PostWhereInput[] {
  const tokens = normalizeSearchTokens(term);
  return tokens.map((token) => ({
    OR: [
      { slug: { contains: token, mode: 'insensitive' } },
      { title: { contains: token, mode: 'insensitive' } },
      { summary: { contains: token, mode: 'insensitive' } },
      { searchText: { contains: token, mode: 'insensitive' } },
      { organization: { is: { OR: [
        { name: { contains: token, mode: 'insensitive' } },
        { slug: { contains: token, mode: 'insensitive' } },
      ] } } },
      { postCategories: { some: { category: { OR: [
        { name: { contains: token, mode: 'insensitive' } },
        { slug: { contains: token, mode: 'insensitive' } },
      ] } } } },
      { postStates: { some: { state: { OR: [
        { name: { contains: token, mode: 'insensitive' } },
        { slug: { contains: token, mode: 'insensitive' } },
      ] } } } },
      { postQualifications: { some: { qualification: { OR: [
        { name: { contains: token, mode: 'insensitive' } },
        { slug: { contains: token, mode: 'insensitive' } },
      ] } } } },
    ],
  }));
}

function toTaxonomyRef(record?: { id: string; name: string; slug: string } | null): TaxonomyRef | null {
  if (!record) return null;
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
  };
}

function mapPrismaTypeToContent(type: PrismaPostType): PostType {
  switch (type) {
    case PrismaPostType.JOB:
      return 'job';
    case PrismaPostType.RESULT:
      return 'result';
    case PrismaPostType.ADMIT_CARD:
      return 'admit-card';
    case PrismaPostType.ANSWER_KEY:
      return 'answer-key';
    case PrismaPostType.ADMISSION:
      return 'admission';
    case PrismaPostType.SYLLABUS:
      return 'syllabus';
    // Compatibility mapping until public-section routes for these types are expanded.
    case PrismaPostType.SCHOLARSHIP:
      return 'admission';
    case PrismaPostType.BOARD_RESULT:
      return 'result';
    default:
      return 'job';
  }
}

function mapContentTypeToPrisma(type: PostType): PrismaPostType {
  switch (type) {
    case 'job':
      return PrismaPostType.JOB;
    case 'result':
      return PrismaPostType.RESULT;
    case 'admit-card':
      return PrismaPostType.ADMIT_CARD;
    case 'answer-key':
      return PrismaPostType.ANSWER_KEY;
    case 'admission':
      return PrismaPostType.ADMISSION;
    case 'syllabus':
    default:
      return PrismaPostType.SYLLABUS;
  }
}

function mapWorkflowStatus(status: PrismaWorkflowStatus): PostRecord['status'] {
  if (status === PrismaWorkflowStatus.DRAFT) return 'draft';
  if (status === PrismaWorkflowStatus.IN_REVIEW) return 'in_review';
  if (status === PrismaWorkflowStatus.APPROVED) return 'approved';
  if (status === PrismaWorkflowStatus.PUBLISHED) return 'published';
  return 'archived';
}

function formatDate(value?: Date | null, fallback?: string | null): string {
  if (value) {
    return value.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
  if (fallback?.trim()) return fallback;
  return '';
}

function canonicalPath(type: PostType, slug: string): string {
  const section: PublicSection = publicSectionMap[type];
  return `/${section}/${slug}`;
}

function toPublicCard(post: PostWithRelations | PostCardWithRelations): PublicPostCard {
  const contentType = mapPrismaTypeToContent(post.type);
  const qualificationNames = post.postQualifications.map((item) => item.qualification.name).filter(Boolean);

  return {
    id: post.id,
    legacyId: post.legacyId || undefined,
    title: post.title,
    slug: post.slug,
    legacySlugs: Array.from(new Set([...(post.legacySlugs || []), ...post.slugAliases.map((item) => item.slug)])),
    type: contentType,
    section: publicSectionMap[contentType],
    href: canonicalPath(contentType, post.slug),
    org: post.organization?.name || 'Government of India',
    date: formatDate(post.publishedAt || post.updatedAt, post.lastDate),
    postCount: post.postCount || undefined,
    qualification: qualificationNames.length > 0 ? qualificationNames.join(', ') : undefined,
    tag: post.tag ? post.tag.toLowerCase().replace('_', '-') as PublicPostCard['tag'] : undefined,
    summary: post.summary,
    stateSlugs: post.postStates.map((item) => item.state.slug),
  };
}

function toPostRecord(post: PostWithRelations): PostRecord {
  const officialSources = post.officialSources.map((item) => ({
    label: item.label,
    url: item.url,
    sourceType: (item.sourceType || undefined) as any,
    isPrimary: item.isPrimary,
    capturedAt: item.capturedAt?.toISOString(),
  }));
  const contentType = mapPrismaTypeToContent(post.type);
  const legacySlugs = Array.from(new Set([...(post.legacySlugs || []), ...post.slugAliases.map((item) => item.slug)]));
  const trustSummary = deriveTrust({
    organization: post.organization,
    officialSources: post.officialSources,
    verificationNote: post.verificationNote,
  });
  const seoSummary = deriveSeo({
    title: post.title,
    summary: post.summary,
    type: contentType,
    slug: post.slug,
    organization: post.organization,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    seoCanonicalPath: post.seoCanonicalPath,
    seoIndexable: post.seoIndexable,
    seoOgImage: post.seoOgImage,
    lastDate: post.lastDate,
    examDate: post.examDate,
    resultDate: post.resultDate,
  });
  const freshnessSummary = deriveFreshness({
    status: post.status,
    expiresAt: post.expiresAt,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    trust: trustSummary,
  });
  const searchMeta = deriveSearchMeta(post.searchText, legacySlugs);
  const readiness = deriveReadiness({
    status: mapWorkflowStatus(post.status),
    summary: post.summary,
    body: post.body || undefined,
    type: contentType,
    officialSources: post.officialSources,
    trust: trustSummary,
    seo: seoSummary,
    freshness: freshnessSummary,
    searchMeta,
    lastDate: post.lastDate,
    importantDates: post.importantDates,
  });

  return {
    id: post.id,
    legacyAnnouncementId: post.legacyAnnouncementId || undefined,
    legacyId: post.legacyId || undefined,
    title: post.title,
    slug: post.slug,
    legacySlugs,
    type: contentType,
    status: mapWorkflowStatus(post.status),
    summary: post.summary,
    shortInfo: post.shortInfo || undefined,
    body: post.body || undefined,
    contentJson: post.contentJson ?? undefined,
    organization: toTaxonomyRef(post.organization),
    categories: post.postCategories.map((item) => ({ id: item.category.id, name: item.category.name, slug: item.category.slug })),
    states: post.postStates.map((item) => ({ id: item.state.id, name: item.state.name, slug: item.state.slug })),
    qualifications: post.postQualifications.map((item) => ({
      id: item.qualification.id,
      name: item.qualification.name,
      slug: item.qualification.slug,
    })),
    institution: toTaxonomyRef(post.institution),
    exam: toTaxonomyRef(post.exam),
    importantDates: post.importantDates.map((item) => ({
      label: item.label,
      value: item.value,
      kind: item.kind?.toLowerCase() as any,
      isPrimary: item.isPrimary,
      note: item.note || undefined,
    })),
    eligibility: post.eligibilityRules.map((item) => ({
      label: item.label,
      description: item.description,
      qualificationSlug: item.qualification?.slug || undefined,
      minAge: item.minAge || undefined,
      maxAge: item.maxAge || undefined,
      relaxationNote: item.relaxationNote || undefined,
    })),
    feeRules: post.feeRules.map((item) => ({
      category: item.category,
      amount: item.amount,
      currency: item.currency || undefined,
      paymentNote: item.paymentNote || undefined,
    })),
    vacancyRows: post.vacancyRows.map((item) => ({
      postName: item.postName,
      department: item.department || undefined,
      category: item.category || undefined,
      vacancies: item.vacancies,
      payLevel: item.payLevel || undefined,
      salaryNote: item.salaryNote || undefined,
    })),
    admissionPrograms: post.admissionDetails?.programId
      ? [{
          programName: post.program?.name || post.title,
          level: post.program?.level || undefined,
          department: post.program?.department || undefined,
          intake: post.program?.intake || post.admissionDetails.intake || undefined,
          eligibilityNote: post.admissionDetails.scholarshipNote || undefined,
        }]
      : [],
    officialSources,
    trust: {
      verificationNote: post.verificationNote || undefined,
      sourceNote: post.sourceNote || undefined,
      correctionNote: post.correctionNote || undefined,
      updatedLabel: post.updatedLabel || formatEditorialDate(post.updatedAt),
      officialSources,
      ...trustSummary,
    },
    seo: seoSummary,
    tag: post.tag ? post.tag.toLowerCase().replace('_', '-') as PostRecord['tag'] : undefined,
    flags: {
      urgent: post.isUrgent,
      isNew: post.isNew,
      lastDate: post.isLastDate,
      featured: post.isFeatured,
    },
    home: {
      section: post.homeSection || undefined,
      stickyRank: post.stickyRank || undefined,
      highlight: post.highlight,
      trendingScore: post.trendingScore || undefined,
    },
    location: post.location || undefined,
    salary: post.salary || undefined,
    postCount: post.postCount || undefined,
    applicationStartDate: post.applicationStartDate || undefined,
    lastDate: post.lastDate || undefined,
    examDate: post.examDate || undefined,
    resultDate: post.resultDate || undefined,
    expiresAt: post.expiresAt?.toISOString(),
    archivedAt: post.archivedAt?.toISOString(),
    publishedAt: post.publishedAt?.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    createdAt: post.createdAt.toISOString(),
    createdBy: post.createdBy || undefined,
    updatedBy: post.updatedBy || undefined,
    approvedBy: post.approvedBy || undefined,
    publishedBy: post.publishedBy || undefined,
    currentVersion: post.currentVersion,
    searchText: post.searchText,
    freshness: freshnessSummary,
    searchMeta,
    readiness,
  };
}

function buildPublicWhere(filters?: {
  type?: PostType;
  search?: string;
  category?: string;
  state?: string;
  organization?: string;
  qualification?: string;
  status?: 'active' | 'expired' | 'archived' | 'all';
}): Prisma.PostWhereInput {
  const where: Prisma.PostWhereInput = {};
  const andClauses: Prisma.PostWhereInput[] = [];
  const now = new Date();

  if (filters?.type) {
    andClauses.push({ type: mapContentTypeToPrisma(filters.type) });
  }

  if (filters?.search?.trim()) {
    const term = filters.search.trim();
    andClauses.push({
      OR: [
        { title: { contains: term, mode: 'insensitive' } },
        { summary: { contains: term, mode: 'insensitive' } },
        { slug: { contains: term, mode: 'insensitive' } },
        { searchText: { contains: term, mode: 'insensitive' } },
      ],
    });
    andClauses.push(...buildSearchTokenClauses(term));
  }

  if (filters?.organization) {
    andClauses.push({ organization: { slug: slugify(filters.organization) } });
  }

  if (filters?.category) {
    andClauses.push({ postCategories: {
      some: {
        category: {
          slug: slugify(filters.category),
        },
      },
    } });
  }

  if (filters?.state) {
    andClauses.push({ postStates: {
      some: {
        state: {
          slug: slugify(filters.state),
        },
      },
    } });
  }

  if (filters?.qualification) {
    andClauses.push({ postQualifications: {
      some: {
        qualification: {
          slug: slugify(filters.qualification),
        },
      },
    } });
  }

  if (filters?.status === 'archived') {
    andClauses.push({ status: PrismaWorkflowStatus.ARCHIVED });
    if (andClauses.length > 0) where.AND = andClauses;
    return where;
  }

  if (filters?.status === 'expired') {
    andClauses.push({ status: PrismaWorkflowStatus.PUBLISHED });
    andClauses.push({ expiresAt: { lte: now } });
    if (andClauses.length > 0) where.AND = andClauses;
    return where;
  }

  if (filters?.status === 'all') {
    if (andClauses.length > 0) where.AND = andClauses;
    return where;
  }

  andClauses.push({ status: PrismaWorkflowStatus.PUBLISHED });
  andClauses.push({ OR: [
    { expiresAt: null },
    { expiresAt: { gt: now } },
  ] });
  if (andClauses.length > 0) where.AND = andClauses;
  return where;
}

function buildSort(sort?: 'newest' | 'oldest' | 'updated' | 'published' | 'closing'): Prisma.PostOrderByWithRelationInput[] {
  if (sort === 'oldest') return [{ createdAt: 'asc' }, { id: 'asc' }];
  if (sort === 'updated') return [{ updatedAt: 'desc' }, { id: 'desc' }];
  if (sort === 'published') return [{ publishedAt: 'desc' }, { id: 'desc' }];
  if (sort === 'closing') return [{ expiresAt: 'asc' }, { publishedAt: 'desc' }];
  return [{ createdAt: 'desc' }, { id: 'desc' }];
}

function mapContentStatusToPrisma(status: PostWorkflowStatus): PrismaWorkflowStatus {
  if (status === 'draft') return PrismaWorkflowStatus.DRAFT;
  if (status === 'in_review') return PrismaWorkflowStatus.IN_REVIEW;
  if (status === 'approved') return PrismaWorkflowStatus.APPROVED;
  if (status === 'published') return PrismaWorkflowStatus.PUBLISHED;
  return PrismaWorkflowStatus.ARCHIVED;
}

function mapTagToPrisma(tag?: PostRecord['tag']): PrismaTrustTag | null {
  if (tag === 'new') return PrismaTrustTag.NEW;
  if (tag === 'hot') return PrismaTrustTag.HOT;
  if (tag === 'update') return PrismaTrustTag.UPDATE;
  if (tag === 'last-date') return PrismaTrustTag.LAST_DATE;
  return null;
}

function mapImportantDateKind(kind?: string): PrismaImportantDateKind | null {
  if (kind === 'application_start') return PrismaImportantDateKind.APPLICATION_START;
  if (kind === 'last_date') return PrismaImportantDateKind.LAST_DATE;
  if (kind === 'exam_date') return PrismaImportantDateKind.EXAM_DATE;
  if (kind === 'result_date') return PrismaImportantDateKind.RESULT_DATE;
  if (kind === 'admit_card') return PrismaImportantDateKind.ADMIT_CARD;
  if (kind === 'counselling') return PrismaImportantDateKind.COUNSELLING;
  if (kind === 'other') return PrismaImportantDateKind.OTHER;
  return null;
}

function maybeDate(value?: string | null): Date | null {
  if (!value?.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeRef(ref?: TaxonomyRef | null): TaxonomyRef | null {
  if (!ref?.name?.trim()) return null;
  const name = ref.name.trim();
  return {
    id: ref.id,
    name,
    slug: slugify(ref.slug || name),
  };
}

function normalizeRefs(refs: TaxonomyRef[] = []): TaxonomyRef[] {
  const unique = new Map<string, TaxonomyRef>();
  for (const item of refs) {
    const normalized = normalizeRef(item);
    if (!normalized) continue;
    unique.set(normalized.slug, normalized);
  }
  return Array.from(unique.values());
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function buildSearchText(input: {
  title: string;
  summary: string;
  type: PostType;
  organization?: TaxonomyRef | null;
  categories: TaxonomyRef[];
  states: TaxonomyRef[];
  qualifications: TaxonomyRef[];
  institution?: TaxonomyRef | null;
  exam?: TaxonomyRef | null;
  shortInfo?: string;
  body?: string;
  legacySlugs?: string[];
  location?: string;
  officialSources?: Array<{ label: string; sourceType?: string }>;
  importantDates?: Array<{ label: string; value: string; kind?: string }>;
  admissionPrograms?: Array<{ programName: string; department?: string; level?: string }>;
}): string {
  return Array.from(new Set([
    input.title,
    input.summary,
    input.shortInfo,
    input.organization?.name,
    ...input.categories.map((item) => item.name),
    ...input.states.map((item) => item.name),
    ...input.qualifications.map((item) => item.name),
    input.institution?.name,
    input.exam?.name,
    input.location,
    ...SEARCH_TYPE_TERMS[input.type],
    ...(input.legacySlugs || []),
    ...(input.officialSources || []).flatMap((item) => [item.label, item.sourceType || '']),
    ...(input.importantDates || []).flatMap((item) => [item.label, item.value, item.kind || '']),
    ...(input.admissionPrograms || []).flatMap((item) => [item.programName, item.department || '', item.level || '']),
    input.body,
  ]))
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function deriveTrust(post: {
  organization?: { officialWebsite?: string | null } | null;
  officialSources: Array<{ label: string; url: string; isPrimary: boolean; capturedAt?: Date | null; sourceType?: string | null }>;
  verificationNote?: string | null;
}) {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const sourceCount = post.officialSources.length;
  const primarySource = post.officialSources.find((item) => item.isPrimary) || post.officialSources[0] || null;
  const latestSourceCapturedAt = post.officialSources
    .map((item) => item.capturedAt || null)
    .filter((item): item is Date => Boolean(item))
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const primarySourceCapturedAt = primarySource?.capturedAt || latestSourceCapturedAt || null;
  const daysSincePrimarySourceCapture = primarySourceCapturedAt
    ? Math.max(0, Math.floor((now - primarySourceCapturedAt.getTime()) / dayMs))
    : undefined;
  const sourceNeedsRefresh = typeof daysSincePrimarySourceCapture === 'number'
    ? daysSincePrimarySourceCapture >= TRUST_SOURCE_REFRESH_DAYS
    : sourceCount > 0;
  const primarySourceDomain = normalizeHostname(primarySource?.url || null);
  const officialDomain = normalizeHostname(post.organization?.officialWebsite || null);
  const domainMatch = primarySourceDomain && officialDomain ? hostsMatch(primarySourceDomain, officialDomain) : undefined;
  const hasVerificationNote = Boolean(post.verificationNote?.trim());

  let verificationStatus: 'verified' | 'review' | 'source_light' = 'source_light';
  if (sourceCount > 0 && Boolean(primarySource) && hasVerificationNote) {
    const sourceRecencyOk = typeof daysSincePrimarySourceCapture === 'number' && daysSincePrimarySourceCapture <= TRUST_SOURCE_STALE_DAYS;
    const domainLooksValid = domainMatch !== false;
    verificationStatus = sourceRecencyOk && domainLooksValid ? 'verified' : 'review';
  } else if (sourceCount > 0 || hasVerificationNote) {
    verificationStatus = 'review';
  }

  return {
    verificationStatus,
    sourceCount,
    hasPrimarySource: Boolean(primarySource),
    primarySourceLabel: primarySource?.label || undefined,
    latestSourceCapturedAt: latestSourceCapturedAt?.toISOString(),
    primarySourceCapturedAt: primarySourceCapturedAt?.toISOString(),
    daysSincePrimarySourceCapture,
    sourceNeedsRefresh,
    primarySourceDomain: primarySourceDomain || undefined,
    officialDomain: officialDomain || undefined,
    domainMatch,
  };
}

function deriveSeo(post: {
  title: string;
  summary: string;
  type: PostType;
  slug: string;
  organization?: { name: string } | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoCanonicalPath?: string | null;
  seoIndexable: boolean;
  seoOgImage?: string | null;
  lastDate?: string | null;
  examDate?: string | null;
  resultDate?: string | null;
}) {
  const orgName = post.organization?.name?.trim();
  const effectiveTitle = trimToLength(
    post.seoTitle?.trim()
      || [post.title.trim(), orgName ? `- ${orgName}` : '', '| Sarkari Exam'].filter(Boolean).join(' '),
    160,
  );
  const dateHint = post.lastDate || post.examDate || post.resultDate;
  const effectiveDescription = trimToLength(
    post.seoDescription?.trim()
      || [
        post.summary.trim(),
        orgName ? `Official update from ${orgName}.` : '',
        dateHint ? `Important date: ${dateHint}.` : '',
      ].filter(Boolean).join(' '),
    320,
  );
  const effectiveCanonicalPath = post.seoCanonicalPath?.trim() || canonicalPath(post.type, post.slug);

  return {
    metaTitle: post.seoTitle || undefined,
    metaDescription: post.seoDescription || undefined,
    canonicalPath: post.seoCanonicalPath || undefined,
    indexable: post.seoIndexable,
    ogImage: post.seoOgImage || undefined,
    effectiveTitle,
    effectiveDescription,
    effectiveCanonicalPath,
  };
}

function deriveFreshness(post: {
  status: PrismaWorkflowStatus;
  expiresAt?: Date | null;
  publishedAt?: Date | null;
  updatedAt: Date;
  trust: ReturnType<typeof deriveTrust>;
}) {
  const now = Date.now();
  const archiveState =
    post.status === PrismaWorkflowStatus.ARCHIVED
      ? 'archived'
      : post.expiresAt && post.expiresAt.getTime() <= now
        ? 'expired'
        : 'active';
  const daysToExpiry = post.expiresAt
    ? Math.ceil((post.expiresAt.getTime() - now) / (24 * 60 * 60 * 1000))
    : undefined;
  const daysSinceUpdate = Math.floor((now - post.updatedAt.getTime()) / (24 * 60 * 60 * 1000));
  const sourceCapturedAtRef = post.trust.primarySourceCapturedAt || post.trust.latestSourceCapturedAt;
  const sourceCapturedAt = sourceCapturedAtRef ? new Date(sourceCapturedAtRef) : null;
  const daysSinceSourceCapture = sourceCapturedAt
    ? Math.floor((now - sourceCapturedAt.getTime()) / (24 * 60 * 60 * 1000))
    : undefined;

  const expiresSoon = typeof daysToExpiry === 'number' && daysToExpiry >= 0 && daysToExpiry <= 7;
  const isStale = archiveState === 'active' && (
    daysSinceUpdate >= 45
    || typeof daysSinceSourceCapture === 'number' && daysSinceSourceCapture >= 30
  );

  let staleReason: string | undefined;
  if (archiveState === 'expired') staleReason = 'Expiry date has passed';
  else if (typeof daysToExpiry === 'number' && daysToExpiry < 0) staleReason = 'Content should be archived';
  else if (typeof daysSinceSourceCapture === 'number' && daysSinceSourceCapture >= 30) staleReason = `Primary source check is ${daysSinceSourceCapture} days old`;
  else if (daysSinceUpdate >= 45) staleReason = `Content has not been updated for ${daysSinceUpdate} days`;

  return {
    archiveState,
    expiresSoon,
    isStale,
    needsReview: archiveState !== 'active' || expiresSoon || isStale || post.trust.verificationStatus !== 'verified',
    daysToExpiry,
    daysSinceUpdate,
    daysSinceSourceCapture,
    staleReason,
  } as const;
}

function deriveSearchMeta(searchText: string, legacySlugs: string[]) {
  const tokens = normalizeSearchTokens(searchText);
  const coverageScore = Math.min(100, (tokens.length * 8) + (Math.min(legacySlugs.length, 5) * 6));
  return {
    termCount: tokens.length,
    aliasCount: legacySlugs.length,
    termsPreview: tokens.slice(0, 12),
    searchReady: tokens.length >= SEARCH_READY_MIN_TERMS,
    coverageScore,
  };
}

function deriveReadiness(post: {
  status: PostWorkflowStatus;
  summary: string;
  body?: string;
  type: PostType;
  officialSources: Array<{ isPrimary: boolean }>;
  trust: ReturnType<typeof deriveTrust>;
  seo: ReturnType<typeof deriveSeo>;
  freshness: ReturnType<typeof deriveFreshness>;
  searchMeta: ReturnType<typeof deriveSearchMeta>;
  lastDate?: string | null;
  importantDates: Array<unknown>;
}) {
  const issues: string[] = [];
  const warnings: string[] = [];
  const publishOnlyIssues: string[] = [];

  if (post.officialSources.length === 0) {
    issues.push('Add at least one official source before review or publish.');
  }
  if (!post.trust.hasPrimarySource) {
    issues.push('Mark one official source as primary.');
  }
  if (!post.trust.verificationStatus || post.trust.verificationStatus === 'source_light') {
    issues.push('Add a verification note that explains what was checked.');
  }
  if (post.freshness.archiveState === 'expired') {
    issues.push('This content is already expired and should not be newly published.');
  }
  if (post.trust.verificationStatus === 'review') {
    warnings.push('Trust verification is pending review; publish is blocked until sources are refreshed and matched.');
    publishOnlyIssues.push('Trust verification is pending review. Refresh source timestamps and confirm authority domain match before publishing.');
  }
  if (!post.searchMeta.searchReady) {
    publishOnlyIssues.push('Search readiness is low. Expand summary/body with precise keywords and entities before publishing.');
  } else if (post.searchMeta.termCount < SEARCH_PUBLISH_MIN_TERMS) {
    publishOnlyIssues.push(`Search readiness has only ${post.searchMeta.termCount} indexed terms; target at least ${SEARCH_PUBLISH_MIN_TERMS}.`);
  }
  if (post.summary.trim().length < 40) {
    warnings.push('Summary is short; expand it for search snippets and trust context.');
  }
  if (!post.body?.trim()) {
    warnings.push('Detailed body content is missing.');
  }
  if (post.searchMeta.coverageScore !== undefined && post.searchMeta.coverageScore < 55) {
    warnings.push('Search coverage score is low; add more concrete terms such as exam, organization, state, and qualification.');
  }
  if (!post.lastDate?.trim() && ['job', 'admission'].includes(post.type)) {
    warnings.push('Last date is missing for this application-driven post.');
  }
  if (post.importantDates.length === 0 && ['result', 'admit-card', 'answer-key', 'admission'].includes(post.type)) {
    warnings.push('Important dates are missing for this post type.');
  }
  if (post.freshness.expiresSoon) {
    warnings.push('This content is close to expiry. Confirm dates before publishing.');
  }
  if (post.freshness.isStale && post.freshness.staleReason) {
    warnings.push(post.freshness.staleReason);
  }
  if (!post.seo.effectiveTitle || !post.seo.effectiveDescription) {
    warnings.push('SEO fallbacks could not be generated cleanly.');
  }
  if ((post.seo.effectiveDescription || '').trim().length < 110) {
    warnings.push('SEO description is short; add more context for better search snippet quality.');
  }
  if (post.seo.indexable === false && post.status !== 'archived') {
    warnings.push('Post is marked noindex while still in active workflow. Confirm if this is intentional.');
  }

  const publishIssues = [...issues, ...publishOnlyIssues];
  const blocked = issues.length > 0;
  return {
    canSubmit: !blocked,
    canApprove: !blocked,
    canPublish: publishIssues.length === 0,
    issueCount: issues.length,
    warningCount: warnings.length,
    issues,
    warnings,
    publishIssueCount: publishIssues.length,
    publishIssues,
  };
}

async function ensureUniqueSlug(tx: Prisma.TransactionClient, baseSlug: string, excludeId?: string) {
  const safeBase = slugify(baseSlug);
  let candidate = safeBase;
  let attempt = 1;

  while (true) {
    const existing = await tx.post.findFirst({ where: { slug: candidate }, select: { id: true } });
    if (!existing) return candidate;
    if (excludeId && existing.id === excludeId) return candidate;
    attempt += 1;
    candidate = `${safeBase}-${attempt}`;
  }
}

async function upsertOrganization(tx: Prisma.TransactionClient, ref?: TaxonomyRef | null) {
  const normalized = normalizeRef(ref);
  if (!normalized) return null;
  const row = await tx.organization.upsert({
    where: { slug: normalized.slug },
    update: {
      name: normalized.name,
      shortName: normalized.name.slice(0, 60),
    },
    create: {
      name: normalized.name,
      slug: normalized.slug,
      shortName: normalized.name.slice(0, 60),
    },
  });
  return row;
}

async function upsertCollege(tx: Prisma.TransactionClient, ref?: TaxonomyRef | null) {
  const normalized = normalizeRef(ref);
  if (!normalized) return null;
  const row = await tx.college.upsert({
    where: { slug: normalized.slug },
    update: {
      name: normalized.name,
      shortName: normalized.name.slice(0, 60),
    },
    create: {
      name: normalized.name,
      slug: normalized.slug,
      shortName: normalized.name.slice(0, 60),
    },
  });
  return row;
}

async function upsertExam(tx: Prisma.TransactionClient, ref?: TaxonomyRef | null, organizationId?: string | null) {
  const normalized = normalizeRef(ref);
  if (!normalized) return null;
  const row = await tx.exam.upsert({
    where: { slug: normalized.slug },
    update: {
      name: normalized.name,
      organizationId: organizationId || null,
    },
    create: {
      name: normalized.name,
      slug: normalized.slug,
      organizationId: organizationId || null,
    },
  });
  return row;
}

async function upsertProgram(
  tx: Prisma.TransactionClient,
  programInput: PostInput['admissionPrograms'][number] | undefined,
  collegeId?: string | null,
) {
  if (!programInput?.programName?.trim()) return null;
  const name = programInput.programName.trim();
  const slug = slugify(name);
  const row = await tx.program.upsert({
    where: { slug },
    update: {
      name,
      level: programInput.level?.trim() || null,
      department: programInput.department?.trim() || null,
      intake: programInput.intake?.trim() || null,
      collegeId: collegeId || null,
    },
    create: {
      name,
      slug,
      level: programInput.level?.trim() || null,
      department: programInput.department?.trim() || null,
      intake: programInput.intake?.trim() || null,
      collegeId: collegeId || null,
    },
  });
  return row;
}

async function upsertCategories(tx: Prisma.TransactionClient, refs: TaxonomyRef[]) {
  const normalized = normalizeRefs(refs);
  const rows = await Promise.all(normalized.map((ref) => tx.category.upsert({
    where: { slug: ref.slug },
    update: { name: ref.name },
    create: { name: ref.name, slug: ref.slug },
  })));
  return rows;
}

async function upsertStates(tx: Prisma.TransactionClient, refs: TaxonomyRef[]) {
  const normalized = normalizeRefs(refs);
  const rows = await Promise.all(normalized.map((ref) => tx.state.upsert({
    where: { slug: ref.slug },
    update: { name: ref.name },
    create: { name: ref.name, slug: ref.slug },
  })));
  return rows;
}

async function upsertQualifications(tx: Prisma.TransactionClient, refs: TaxonomyRef[]) {
  const normalized = normalizeRefs(refs);
  const rows = await Promise.all(normalized.map((ref) => tx.qualification.upsert({
    where: { slug: ref.slug },
    update: { name: ref.name },
    create: { name: ref.name, slug: ref.slug },
  })));
  return rows;
}

function buildAdminWhere(filters?: {
  type?: PostType;
  status?: PostWorkflowStatus | 'all';
  search?: string;
  category?: string;
  state?: string;
  organization?: string;
}): Prisma.PostWhereInput {
  const where: Prisma.PostWhereInput = {};
  const andClauses: Prisma.PostWhereInput[] = [];

  if (filters?.type) {
    andClauses.push({ type: mapContentTypeToPrisma(filters.type) });
  }

  if (filters?.status && filters.status !== 'all') {
    andClauses.push({ status: mapContentStatusToPrisma(filters.status) });
  }

  if (filters?.search?.trim()) {
    const term = filters.search.trim();
    andClauses.push({
      OR: [
        { searchText: { contains: term, mode: 'insensitive' } },
        { title: { contains: term, mode: 'insensitive' } },
        { slug: { contains: term, mode: 'insensitive' } },
      ],
    });
    andClauses.push(...buildSearchTokenClauses(term));
  }

  if (filters?.category) {
    andClauses.push({ postCategories: {
      some: {
        category: {
          slug: slugify(filters.category),
        },
      },
    } });
  }

  if (filters?.state) {
    andClauses.push({ postStates: {
      some: {
        state: {
          slug: slugify(filters.state),
        },
      },
    } });
  }

  if (filters?.organization) {
    andClauses.push({ organization: { slug: slugify(filters.organization) } });
  }

  if (andClauses.length > 0) {
    where.AND = andClauses;
  }

  return where;
}

export class PostModelPostgres {
  static async findById(id: string): Promise<PostRecord | null> {
    const row = await prisma.post.findUnique({
      where: { id },
      include: postInclude,
    });
    return row ? toPostRecord(row) : null;
  }

  static async findPublicCards(filters?: {
    type?: PostType;
    search?: string;
    category?: string;
    state?: string;
    organization?: string;
    qualification?: string;
    status?: 'active' | 'expired' | 'archived' | 'all';
    sort?: 'newest' | 'oldest' | 'updated' | 'closing';
    limit?: number;
    offset?: number;
  }) {
    const where = buildPublicWhere(filters);
    const take = filters?.limit ?? 20;
    const skip = filters?.offset ?? 0;

    const [rows, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: postCardInclude,
        orderBy: buildSort(filters?.sort),
        skip,
        take,
      }),
      prisma.post.count({ where }),
    ]);

    const cards = rows.map((row) => toPublicCard(row));
    return {
      data: cards,
      total,
      count: cards.length,
    };
  }

  static async findAdmin(filters?: {
    type?: PostType;
    status?: PostWorkflowStatus | 'all';
    search?: string;
    category?: string;
    state?: string;
    organization?: string;
    sort?: 'newest' | 'oldest' | 'updated' | 'published';
    limit?: number;
    offset?: number;
  }): Promise<AdminPostListResult> {
    const where = buildAdminWhere(filters);
    const take = filters?.limit ?? 20;
    const skip = filters?.offset ?? 0;

    const [rows, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: postInclude,
        orderBy: buildSort(filters?.sort),
        skip,
        take,
      }),
      prisma.post.count({ where }),
    ]);

    const data = rows.map((row) => toPostRecord(row));
    return {
      data,
      total,
      count: data.length,
    };
  }

  static async findBySlugOrLegacy(slugOrLegacy: string): Promise<PublicPostDetail | null> {
    const normalized = slugify(slugOrLegacy);
    const row = await prisma.post.findFirst({
      where: {
        OR: [
          { slug: normalized },
          { legacyId: slugOrLegacy },
          { legacySlugs: { has: normalized } },
          { slugAliases: { some: { slug: normalized } } },
        ],
      },
      include: postInclude,
    });

    if (!row) return null;

    const card = toPublicCard(row);
    const postType = mapPrismaTypeToContent(row.type);
    const relatedRows = await prisma.post.findMany({
      where: {
        ...buildPublicWhere({
          type: postType,
          organization: row.organization?.slug || undefined,
          status: 'active',
        }),
        id: { not: row.id },
      },
      include: postCardInclude,
      orderBy: buildSort('newest'),
      take: 6,
    });

    return {
      post: toPostRecord(row),
      card,
      canonicalPath: canonicalPath(postType, row.slug),
      section: publicSectionMap[postType],
      relatedCards: relatedRows.map((item) => toPublicCard(item)),
      breadcrumbs: [
        { label: 'Home', href: '/' },
        { label: publicSectionMap[postType], href: `/${publicSectionMap[postType]}` },
        ...(row.organization ? [{ label: row.organization.name, href: `/organizations/${row.organization.slug}` }] : []),
        { label: row.title, href: canonicalPath(postType, row.slug) },
      ],
      archiveState: row.status === PrismaWorkflowStatus.ARCHIVED
        ? 'archived'
        : row.expiresAt && row.expiresAt.getTime() <= Date.now()
          ? 'expired'
          : 'active',
    };
  }

  static async getHomepageSections(limitPerType = 12): Promise<Record<PublicSection, PublicPostCard[]>> {
    const entries: Array<[PostType, PublicSection]> = [
      ['job', 'jobs'],
      ['result', 'results'],
      ['admit-card', 'admit-cards'],
      ['admission', 'admissions'],
      ['answer-key', 'answer-keys'],
      ['syllabus', 'syllabus'],
    ];

    const sections = {} as Record<PublicSection, PublicPostCard[]>;

    await Promise.all(entries.map(async ([type, section]) => {
      const result = await this.findPublicCards({
        type,
        limit: limitPerType,
        status: 'active',
        sort: 'newest',
      });
      sections[section] = result.data;
    }));

    return sections;
  }

  static async getTaxonomyLanding(
    type: 'states' | 'organizations' | 'categories' | 'institutions' | 'exams' | 'qualifications',
    slug: string,
    limit = 20,
  ) {
    const normalized = slugify(slug);
    const taxonomy = await ContentTaxonomyModelPostgres.findBySlug(type, normalized);
    if (!taxonomy) return null;

    const filters =
      type === 'states'
        ? { state: normalized }
        : type === 'organizations'
          ? { organization: normalized }
          : type === 'categories'
            ? { category: normalized }
            : type === 'qualifications'
              ? { qualification: normalized }
              : {};

    const cards = await this.findPublicCards({
      ...filters,
      status: 'active',
      limit,
    });

    const relatedCounts = await this.getTypeCounts(filters as any);

    return {
      taxonomy,
      cards: cards.data,
      relatedCounts,
    };
  }

  static async getTypeCounts(filters?: { category?: string; organization?: string; state?: string; qualification?: string }) {
    const supportedTypes: PostType[] = ['job', 'result', 'admit-card', 'admission', 'answer-key', 'syllabus'];
    const counts: Record<string, number> = {};

    await Promise.all(supportedTypes.map(async (type) => {
      const where = buildPublicWhere({
        ...(filters || {}),
        type,
        status: 'active',
      });
      counts[type] = await prisma.post.count({ where });
    }));

    return counts;
  }

  static async create(input: PostInput, actorId?: string, actorRole?: string, note?: string, forcedId?: string) {
    return this.persistPost({ input, actorId, actorRole, note, reason: 'create', forcedId });
  }

  static async update(id: string, input: Partial<PostInput>, actorId?: string, actorRole?: string, note?: string) {
    const existing = await prisma.post.findUnique({
      where: { id },
      include: postInclude,
    });
    if (!existing) return null;

    const existingRecord = toPostRecord(existing);
    const mergedOfficialSources =
      input.officialSources
      ?? input.trust?.officialSources
      ?? existingRecord.officialSources
      ?? [];

    const merged = {
      ...existingRecord,
      ...input,
      id,
      status: input.status || existingRecord.status,
      trust: {
        verificationNote: input.trust?.verificationNote ?? existingRecord.trust?.verificationNote,
        sourceNote: input.trust?.sourceNote ?? existingRecord.trust?.sourceNote,
        correctionNote: input.trust?.correctionNote ?? existingRecord.trust?.correctionNote,
        updatedLabel: input.trust?.updatedLabel ?? existingRecord.trust?.updatedLabel,
        officialSources: mergedOfficialSources,
      },
      officialSources: mergedOfficialSources,
      seo: input.seo ?? existingRecord.seo ?? {},
      flags: input.flags ?? existingRecord.flags ?? {},
      home: input.home ?? existingRecord.home ?? {},
    } as unknown as PostInput;

    return this.persistPost({
      input: merged,
      actorId,
      actorRole,
      note,
      reason: 'update',
      existing,
    });
  }

  static async transition(
    id: string,
    action: 'submit' | 'approve' | 'publish' | 'unpublish' | 'archive' | 'restore',
    actorId?: string,
    actorRole?: string,
    note?: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.post.findUnique({ where: { id }, include: postInclude });
      if (!existing) return null;

      const current = mapWorkflowStatus(existing.status);
      const nextStatus = this.resolveNextStatus(current, action);
      const existingRecord = toPostRecord(existing);
      const readinessGate =
        action === 'submit'
          ? existingRecord.readiness?.canSubmit
          : action === 'approve'
            ? existingRecord.readiness?.canApprove
            : action === 'publish'
              ? existingRecord.readiness?.canPublish
              : true;

      if (['submit', 'approve', 'publish'].includes(action) && !readinessGate) {
        const issues =
          action === 'publish'
            ? existingRecord.readiness?.publishIssues || existingRecord.readiness?.issues
            : existingRecord.readiness?.issues;
        throw new Error((issues && issues.length > 0 ? issues : ['Post is not ready for this workflow action']).join(' '));
      }
      const now = new Date();

      const updated = await tx.post.update({
        where: { id },
        data: {
          status: mapContentStatusToPrisma(nextStatus),
          updatedAt: now,
          updatedBy: actorId || null,
          approvedBy: action === 'approve' ? actorId || null : undefined,
          publishedAt: action === 'publish' ? now : undefined,
          publishedBy: action === 'publish' ? actorId || null : undefined,
          archivedAt: action === 'archive' ? now : action === 'restore' || action === 'publish' ? null : undefined,
          currentVersion: { increment: 1 },
        },
        include: postInclude,
      });

      const record = toPostRecord(updated);
      await tx.postVersion.create({
        data: {
          postId: record.id,
          version: record.currentVersion,
          note: note || null,
          reason: action,
          actorId: actorId || null,
          snapshot: toJsonValue(record),
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: 'workflow',
          entityId: record.id,
          postId: record.id,
          action,
          actorId: actorId || null,
          actorRole: actorRole || null,
          summary: `${action} ${record.type} "${record.title}"`,
          metadata: toJsonValue({ from: current, to: record.status, note }),
        },
      });

      return record;
    }, {
      maxWait: 20_000,
      timeout: 120_000,
    });
  }

  static async getHistory(id: string): Promise<{ versions: PostVersionRecord[]; audit: AuditLogRecord[] }> {
    const [versions, audit] = await Promise.all([
      prisma.postVersion.findMany({
        where: { postId: id },
        orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.auditLog.findMany({
        where: { entityId: id },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    return {
      versions: versions.map((item) => ({
        id: item.id,
        postId: item.postId,
        version: item.version,
        note: item.note || undefined,
        reason: item.reason || undefined,
        actorId: item.actorId || undefined,
        snapshot: item.snapshot as unknown as PostRecord,
        createdAt: item.createdAt.toISOString(),
      })),
      audit: audit.map((item) => ({
        id: item.id,
        entityType: item.entityType as AuditLogRecord['entityType'],
        entityId: item.entityId,
        action: item.action,
        actorId: item.actorId || undefined,
        actorRole: item.actorRole || undefined,
        summary: item.summary,
        metadata:
          item.metadata && typeof item.metadata === 'object' && !Array.isArray(item.metadata)
            ? (item.metadata as Record<string, unknown>)
            : undefined,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  }

  static async revertToVersion(
    id: string,
    version: number,
    actorId?: string,
    actorRole?: string,
    note?: string,
  ): Promise<PostRecord | null> {
    const [existing, versionRow] = await Promise.all([
      prisma.post.findUnique({
        where: { id },
        include: postInclude,
      }),
      prisma.postVersion.findFirst({
        where: { postId: id, version },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    if (!existing || !versionRow) return null;
    if (!versionRow.snapshot || typeof versionRow.snapshot !== 'object' || Array.isArray(versionRow.snapshot)) {
      throw new Error('Selected snapshot payload is invalid');
    }

    const snapshot = versionRow.snapshot as Record<string, unknown>;
    const input: any = { ...snapshot };

    delete input.id;
    delete input.createdAt;
    delete input.updatedAt;
    delete input.currentVersion;
    delete input.searchText;
    delete input.freshness;
    delete input.searchMeta;
    delete input.readiness;

    return this.persistPost({
      input,
      actorId,
      actorRole,
      note: note?.trim() || `Reverted to version ${version}`,
      reason: 'update',
      existing,
    });
  }

  static async getAlertMatchPreview(id: string): Promise<AlertMatchPreview | null> {
    const post = await this.findById(id);
    if (!post) return null;

    const matches = await AlertSubscriptionModelPostgres.listMatchingPost(post);
    return matches.reduce<AlertMatchPreview>((acc, item) => {
      acc.total += 1;
      if (item.frequency === 'instant') acc.instant += 1;
      else if (item.frequency === 'weekly') acc.weekly += 1;
      else acc.daily += 1;
      return acc;
    }, {
      total: 0,
      instant: 0,
      daily: 0,
      weekly: 0,
    });
  }

  static async listFreshnessQueue(limit = 24): Promise<PostRecord[]> {
    const rows = await prisma.post.findMany({
      where: {
        status: {
          in: [PrismaWorkflowStatus.PUBLISHED, PrismaWorkflowStatus.APPROVED],
        },
      },
      include: postInclude,
      orderBy: [
        { expiresAt: 'asc' },
        { updatedAt: 'asc' },
      ],
      take: Math.max(limit * 4, 80),
    });

    return rows
      .map((row) => toPostRecord(row))
      .filter((post) => post.freshness?.needsReview)
      .sort((a, b) => {
        const aPriority = (a.freshness?.archiveState !== 'active' ? 100 : 0)
          + (a.freshness?.expiresSoon ? 50 : 0)
          + (a.freshness?.isStale ? 20 : 0)
          + (a.readiness?.issueCount || 0);
        const bPriority = (b.freshness?.archiveState !== 'active' ? 100 : 0)
          + (b.freshness?.expiresSoon ? 50 : 0)
          + (b.freshness?.isStale ? 20 : 0)
          + (b.readiness?.issueCount || 0);
        return bPriority - aPriority;
      })
      .slice(0, limit);
  }

  static async listTrustQueue(limit = 24): Promise<PostRecord[]> {
    const rows = await prisma.post.findMany({
      where: {
        status: {
          in: [PrismaWorkflowStatus.IN_REVIEW, PrismaWorkflowStatus.APPROVED, PrismaWorkflowStatus.PUBLISHED],
        },
      },
      include: postInclude,
      orderBy: [
        { updatedAt: 'asc' },
        { createdAt: 'asc' },
      ],
      take: Math.max(limit * 4, 80),
    });

    return rows
      .map((row) => toPostRecord(row))
      .filter((post) => {
        const trust = post.trust;
        return (
          trust.verificationStatus !== 'verified'
          || !trust.hasPrimarySource
          || trust.domainMatch === false
          || trust.sourceNeedsRefresh
        );
      })
      .sort((a, b) => {
        const score = (post: PostRecord) => {
          let total = 0;
          if (post.trust.verificationStatus === 'source_light') total += 120;
          else if (post.trust.verificationStatus === 'review') total += 80;
          if (!post.trust.hasPrimarySource) total += 60;
          if (post.trust.domainMatch === false) total += 50;
          if (post.trust.sourceNeedsRefresh) total += 40;
          total += Math.min(post.trust.daysSincePrimarySourceCapture || 0, 60);
          total += post.readiness?.issueCount || 0;
          return total;
        };
        return score(b) - score(a);
      })
      .slice(0, limit);
  }

  static async listSearchReadinessQueue(limit = 24): Promise<PostRecord[]> {
    const rows = await prisma.post.findMany({
      where: {
        status: {
          in: [
            PrismaWorkflowStatus.DRAFT,
            PrismaWorkflowStatus.IN_REVIEW,
            PrismaWorkflowStatus.APPROVED,
            PrismaWorkflowStatus.PUBLISHED,
          ],
        },
      },
      include: postInclude,
      orderBy: [
        { updatedAt: 'asc' },
        { createdAt: 'asc' },
      ],
      take: Math.max(limit * 4, 80),
    });

    return rows
      .map((row) => toPostRecord(row))
      .filter((post) => {
        const searchMeta = post.searchMeta;
        const termCount = searchMeta?.termCount || 0;
        return (
          !searchMeta?.searchReady
          || termCount < SEARCH_PUBLISH_MIN_TERMS
          || post.summary.trim().length < 80
          || !post.body?.trim()
        );
      })
      .sort((a, b) => {
        const score = (post: PostRecord) => {
          const termCount = post.searchMeta?.termCount || 0;
          let total = 0;
          if (!post.searchMeta?.searchReady) total += 90;
          total += Math.max(0, SEARCH_PUBLISH_MIN_TERMS - termCount) * 8;
          if (post.summary.trim().length < 80) total += 25;
          if (!post.body?.trim()) total += 35;
          total += post.readiness?.issueCount || 0;
          return total;
        };
        return score(b) - score(a);
      })
      .slice(0, limit);
  }

  static async listSeoQueue(limit = 24): Promise<PostRecord[]> {
    const rows = await prisma.post.findMany({
      where: {
        status: {
          in: [
            PrismaWorkflowStatus.DRAFT,
            PrismaWorkflowStatus.IN_REVIEW,
            PrismaWorkflowStatus.APPROVED,
            PrismaWorkflowStatus.PUBLISHED,
          ],
        },
      },
      include: postInclude,
      orderBy: [
        { updatedAt: 'asc' },
        { createdAt: 'asc' },
      ],
      take: Math.max(limit * 4, 80),
    });

    return rows
      .map((row) => toPostRecord(row))
      .filter((post) => {
        const titleLength = (post.seo?.effectiveTitle || '').trim().length;
        const descriptionLength = (post.seo?.effectiveDescription || '').trim().length;
        const canonicalPath = (post.seo?.effectiveCanonicalPath || '').trim();
        return (
          titleLength < 35
          || titleLength > 160
          || descriptionLength < 110
          || !canonicalPath.startsWith('/')
          || post.seo?.indexable === false
        );
      })
      .sort((a, b) => {
        const score = (post: PostRecord) => {
          const titleLength = (post.seo?.effectiveTitle || '').trim().length;
          const descriptionLength = (post.seo?.effectiveDescription || '').trim().length;
          const canonicalPath = (post.seo?.effectiveCanonicalPath || '').trim();
          let total = 0;
          if (titleLength < 35 || titleLength > 160) total += 45;
          if (descriptionLength < 110) total += 40;
          if (!canonicalPath.startsWith('/')) total += 35;
          if (post.seo?.indexable === false) total += 20;
          total += post.readiness?.warningCount || 0;
          return total;
        };
        return score(b) - score(a);
      })
      .slice(0, limit);
  }

  static async listAlertImpactQueue(limit = 12): Promise<Array<{ post: PostRecord; preview: AlertMatchPreview }>> {
    const rows = await prisma.post.findMany({
      where: {
        status: {
          in: [PrismaWorkflowStatus.APPROVED, PrismaWorkflowStatus.PUBLISHED],
        },
      },
      include: postInclude,
      orderBy: [
        { updatedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      take: Math.max(limit * 3, 36),
    });

    const candidates = rows.map((row) => toPostRecord(row));
    const withPreview = await Promise.all(candidates.map(async (post) => {
      const matches = await AlertSubscriptionModelPostgres.listMatchingPost(post);
      const preview = matches.reduce<AlertMatchPreview>((acc, item) => {
        acc.total += 1;
        if (item.frequency === 'instant') acc.instant += 1;
        else if (item.frequency === 'weekly') acc.weekly += 1;
        else acc.daily += 1;
        return acc;
      }, {
        total: 0,
        instant: 0,
        daily: 0,
        weekly: 0,
      });

      return {
        post,
        preview,
      };
    }));

    return withPreview
      .sort((a, b) => {
        const aScore = (a.preview.total * 10) + (a.preview.instant * 4) + (a.post.freshness?.expiresSoon ? 2 : 0);
        const bScore = (b.preview.total * 10) + (b.preview.instant * 4) + (b.post.freshness?.expiresSoon ? 2 : 0);
        return bScore - aScore;
      })
      .slice(0, limit);
  }

  static async bulkTransition(
    ids: string[],
    action: 'submit' | 'approve' | 'publish' | 'unpublish' | 'archive' | 'restore',
    actorId?: string,
    actorRole?: string,
    note?: string,
  ) {
    const uniqueIds = Array.from(new Set(ids.map((item) => String(item).trim()).filter(Boolean)));
    const updated: PostRecord[] = [];
    const failures: Array<{ id: string; error: string }> = [];

    for (const id of uniqueIds) {
      try {
        const result = await this.transition(id, action, actorId, actorRole, note);
        if (!result) {
          failures.push({ id, error: 'Post not found' });
          continue;
        }
        updated.push(result);
      } catch (error) {
        failures.push({
          id,
          error: error instanceof Error ? error.message : 'Transition failed',
        });
      }
    }

    return {
      total: uniqueIds.length,
      successCount: updated.length,
      failureCount: failures.length,
      updated,
      failures,
    };
  }

  static async sweepExpiredPublishedPosts(params?: {
    limit?: number;
    dryRun?: boolean;
    actorId?: string;
    actorRole?: string;
    note?: string;
    now?: Date;
  }) {
    const limit = Math.min(Math.max(params?.limit ?? 100, 1), 200);
    const now = params?.now || new Date();

    const rows = await prisma.post.findMany({
      where: {
        status: PrismaWorkflowStatus.PUBLISHED,
        expiresAt: { lte: now },
      },
      include: postInclude,
      orderBy: [
        { expiresAt: 'asc' },
        { updatedAt: 'asc' },
      ],
      take: limit,
    });

    const candidates = rows.map((row) => toPostRecord(row));
    if (params?.dryRun) {
      return {
        dryRun: true,
        totalCandidates: candidates.length,
        archivedCount: 0,
        candidates,
        archived: [] as PostRecord[],
        failures: [] as Array<{ id: string; error: string }>,
      };
    }

    const archived: PostRecord[] = [];
    const failures: Array<{ id: string; error: string }> = [];

    for (const candidate of candidates) {
      try {
        const updated = await this.transition(
          candidate.id,
          'archive',
          params?.actorId,
          params?.actorRole,
          params?.note || 'Auto-archived by freshness sweep (expiry reached)',
        );
        if (!updated) {
          failures.push({ id: candidate.id, error: 'Post not found' });
          continue;
        }
        archived.push(updated);
      } catch (error) {
        failures.push({
          id: candidate.id,
          error: error instanceof Error ? error.message : 'Archive failed',
        });
      }
    }

    return {
      dryRun: false,
      totalCandidates: candidates.length,
      archivedCount: archived.length,
      candidates,
      archived,
      failures,
    };
  }

  private static async persistPost(params: {
    input: PostInput;
    actorId?: string;
    actorRole?: string;
    note?: string;
    reason: 'create' | 'update';
    existing?: PostWithRelations | null;
    forcedId?: string;
  }): Promise<PostRecord> {
    const { input, actorId, actorRole, note, reason, existing, forcedId } = params;

    return prisma.$transaction(async (tx) => {
      const normalizedOrganization = normalizeRef(input.organization);
      const normalizedInstitution = normalizeRef(input.institution);
      const normalizedExam = normalizeRef(input.exam);
      const normalizedCategories = normalizeRefs(input.categories || []);
      const normalizedStates = normalizeRefs(input.states || []);
      const normalizedQualifications = normalizeRefs(input.qualifications || []);

      const organization = await upsertOrganization(tx, normalizedOrganization);
      const institution = await upsertCollege(tx, normalizedInstitution);
      const exam = await upsertExam(tx, normalizedExam, organization?.id);
      const programInput = input.admissionPrograms?.[0];
      const program = await upsertProgram(tx, programInput, institution?.id);
      const categories = await upsertCategories(tx, normalizedCategories);
      const states = await upsertStates(tx, normalizedStates);
      const qualifications = await upsertQualifications(tx, normalizedQualifications);

      const finalSlug = await ensureUniqueSlug(tx, input.slug || input.title, existing?.id);
      const now = new Date();
      const status = mapContentStatusToPrisma(input.status);
      const expiresAt = maybeDate(input.expiresAt) || maybeDate(input.lastDate);
      const legacySlugs = Array.from(new Set((input.legacySlugs || []).map((item) => slugify(item)).filter(Boolean)));
      const hasContentJson = Object.prototype.hasOwnProperty.call(input, 'contentJson');
      const publishedAt = existing?.publishedAt ?? maybeDate(input.publishedAt) ?? (status === PrismaWorkflowStatus.PUBLISHED ? now : null);
      const archivedAt = existing?.archivedAt ?? maybeDate(input.archivedAt) ?? null;

      const searchText = buildSearchText({
        title: input.title,
        summary: input.summary,
        type: input.type,
        organization: normalizedOrganization,
        categories: normalizedCategories,
        states: normalizedStates,
        qualifications: normalizedQualifications,
        institution: normalizedInstitution,
        exam: normalizedExam,
        shortInfo: input.shortInfo,
        body: input.body,
        legacySlugs,
        location: input.location,
        officialSources: input.officialSources,
        importantDates: input.importantDates,
        admissionPrograms: input.admissionPrograms,
      });
      const derivedSeo = deriveSeo({
        title: input.title.trim(),
        summary: input.summary.trim(),
        type: input.type,
        slug: finalSlug,
        organization: normalizedOrganization,
        seoTitle: input.seo?.metaTitle || null,
        seoDescription: input.seo?.metaDescription || null,
        seoCanonicalPath: input.seo?.canonicalPath || null,
        seoIndexable: input.seo?.indexable ?? true,
        seoOgImage: input.seo?.ogImage || null,
        lastDate: input.lastDate || null,
        examDate: input.examDate || null,
        resultDate: input.resultDate || null,
      });
      const defaultUpdatedLabel = formatEditorialDate(now);

      const baseData = {
        legacyAnnouncementId: input.legacyAnnouncementId || null,
        legacyId: input.legacyId || null,
        title: input.title.trim(),
        slug: finalSlug,
        legacySlugs,
        type: mapContentTypeToPrisma(input.type),
        status,
        summary: input.summary.trim(),
        shortInfo: input.shortInfo?.trim() || null,
        body: input.body?.trim() || null,
        organizationId: organization?.id || null,
        institutionId: institution?.id || null,
        examId: exam?.id || null,
        programId: program?.id || null,
        location: input.location?.trim() || null,
        salary: input.salary?.trim() || null,
        postCount: input.postCount?.trim() || null,
        applicationStartDate: input.applicationStartDate?.trim() || null,
        lastDate: input.lastDate?.trim() || null,
        examDate: input.examDate?.trim() || null,
        resultDate: input.resultDate?.trim() || null,
        expiresAt,
        archivedAt,
        publishedAt,
        updatedBy: actorId || input.updatedBy || null,
        approvedBy: input.approvedBy || null,
        publishedBy: input.publishedBy || null,
        searchText,
        sourceNote: input.trust?.sourceNote?.trim() || null,
        correctionNote: input.trust?.correctionNote?.trim() || null,
        verificationNote: input.trust?.verificationNote?.trim() || null,
        updatedLabel: input.trust?.updatedLabel?.trim() || defaultUpdatedLabel || null,
        contentJson:
          hasContentJson && input.contentJson !== undefined
            ? toJsonValue(input.contentJson)
            : null,
        tag: mapTagToPrisma(input.tag),
        isUrgent: Boolean(input.flags?.urgent),
        isNew: Boolean(input.flags?.isNew),
        isLastDate: Boolean(input.flags?.lastDate),
        isFeatured: Boolean(input.flags?.featured),
        homeSection: input.home?.section?.trim() || null,
        stickyRank: input.home?.stickyRank ?? null,
        highlight: Boolean(input.home?.highlight),
        trendingScore: input.home?.trendingScore ?? null,
        seoTitle: derivedSeo.effectiveTitle,
        seoDescription: derivedSeo.effectiveDescription,
        seoCanonicalPath: derivedSeo.effectiveCanonicalPath,
        seoIndexable: input.seo?.indexable ?? true,
        seoOgImage: input.seo?.ogImage?.trim() || null,
      };

      let postId = existing?.id;

      if (existing) {
        await tx.post.update({
          where: { id: existing.id },
          data: {
            ...baseData,
            currentVersion: (existing.currentVersion || 1) + 1,
          },
        });
      } else {
        const created = await tx.post.create({
          data: {
            ...(forcedId ? { id: forcedId } : {}),
            ...baseData,
            createdBy: actorId || input.createdBy || null,
            currentVersion: 1,
          },
          select: { id: true },
        });
        postId = created.id;
      }

      if (!postId) {
        throw new Error('Failed to persist post');
      }

      await Promise.all([
        tx.postCategory.deleteMany({ where: { postId } }),
        tx.postState.deleteMany({ where: { postId } }),
        tx.postQualification.deleteMany({ where: { postId } }),
        tx.officialSource.deleteMany({ where: { postId } }),
        tx.importantDate.deleteMany({ where: { postId } }),
        tx.eligibilityRule.deleteMany({ where: { postId } }),
        tx.feeRule.deleteMany({ where: { postId } }),
        tx.vacancyRow.deleteMany({ where: { postId } }),
        tx.admissionDetail.deleteMany({ where: { postId } }),
        tx.slugAlias.deleteMany({ where: { postId } }),
      ]);

      if (categories.length > 0) {
        await tx.postCategory.createMany({
          data: categories.map((row) => ({
            postId,
            categoryId: row.id,
          })),
          skipDuplicates: true,
        });
      }

      if (states.length > 0) {
        await tx.postState.createMany({
          data: states.map((row) => ({
            postId,
            stateId: row.id,
          })),
          skipDuplicates: true,
        });
      }

      if (qualifications.length > 0) {
        await tx.postQualification.createMany({
          data: qualifications.map((row) => ({
            postId,
            qualificationId: row.id,
          })),
          skipDuplicates: true,
        });
      }

      const aliasSet = new Set<string>(legacySlugs);
      if (existing?.slug && existing.slug !== finalSlug) {
        aliasSet.add(existing.slug);
      }
      aliasSet.delete(finalSlug);
      if (aliasSet.size > 0) {
        await tx.slugAlias.createMany({
          data: Array.from(aliasSet).map((slug) => ({
            postId,
            slug,
            isLegacy: true,
          })),
          skipDuplicates: true,
        });
      }

      if ((input.officialSources || []).length > 0) {
        await tx.officialSource.createMany({
          data: (input.officialSources || []).map((item, index) => ({
            postId,
            label: item.label.trim(),
            url: item.url.trim(),
            sourceType: item.sourceType || null,
            isPrimary: Boolean(item.isPrimary),
            capturedAt: maybeDate(item.capturedAt) || null,
            position: index,
          })),
        });
      }

      if ((input.importantDates || []).length > 0) {
        await tx.importantDate.createMany({
          data: (input.importantDates || []).map((item, index) => ({
            postId,
            kind: mapImportantDateKind(item.kind) || null,
            label: item.label.trim(),
            value: item.value.trim(),
            sortDate: maybeDate(item.value),
            isPrimary: Boolean(item.isPrimary),
            note: item.note?.trim() || null,
            position: index,
          })),
        });
      }

      const qualificationBySlug = new Map<string, string>();
      for (const row of qualifications) {
        qualificationBySlug.set(row.slug, row.id);
      }

      for (const item of input.eligibility || []) {
        if (!item.qualificationSlug?.trim()) continue;
        const normalized = slugify(item.qualificationSlug);
        if (qualificationBySlug.has(normalized)) continue;
        const found = await tx.qualification.findUnique({ where: { slug: normalized }, select: { id: true } });
        if (found) qualificationBySlug.set(normalized, found.id);
      }

      if ((input.eligibility || []).length > 0) {
        await tx.eligibilityRule.createMany({
          data: (input.eligibility || []).map((item, index) => ({
            postId,
            qualificationId: item.qualificationSlug ? qualificationBySlug.get(slugify(item.qualificationSlug)) || null : null,
            label: item.label.trim(),
            description: item.description.trim(),
            minAge: item.minAge ?? null,
            maxAge: item.maxAge ?? null,
            relaxationNote: item.relaxationNote?.trim() || null,
            position: index,
          })),
        });
      }

      if ((input.feeRules || []).length > 0) {
        await tx.feeRule.createMany({
          data: (input.feeRules || []).map((item, index) => ({
            postId,
            category: item.category.trim(),
            amount: item.amount.trim(),
            currency: item.currency?.trim() || 'INR',
            paymentNote: item.paymentNote?.trim() || null,
            position: index,
          })),
        });
      }

      if ((input.vacancyRows || []).length > 0) {
        await tx.vacancyRow.createMany({
          data: (input.vacancyRows || []).map((item, index) => ({
            postId,
            postName: item.postName.trim(),
            department: item.department?.trim() || null,
            category: item.category?.trim() || null,
            vacancies: item.vacancies.trim(),
            payLevel: item.payLevel?.trim() || null,
            salaryNote: item.salaryNote?.trim() || null,
            position: index,
          })),
        });
      }

      if (programInput?.programName?.trim()) {
        await tx.admissionDetail.create({
          data: {
            postId,
            collegeId: institution?.id || null,
            programId: program?.id || null,
            intake: programInput.intake?.trim() || null,
            scholarshipNote: programInput.eligibilityNote?.trim() || null,
          },
        });
      }

      const final = await tx.post.findUnique({
        where: { id: postId },
        include: postInclude,
      });

      if (!final) {
        throw new Error('Failed to fetch persisted post');
      }

      const record = toPostRecord(final);
      await tx.postVersion.create({
        data: {
          postId,
          version: record.currentVersion,
          note: note || null,
          reason,
          actorId: actorId || null,
          snapshot: toJsonValue(record),
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: 'post',
          entityId: postId,
          postId,
          action: reason,
          actorId: actorId || null,
          actorRole: actorRole || null,
          summary:
            reason === 'create'
              ? `Created ${record.type} draft "${record.title}"`
              : `Updated ${record.type} "${record.title}"`,
          metadata: toJsonValue({ status: record.status }),
        },
      });

      return record;
    });
  }

  private static resolveNextStatus(
    current: PostWorkflowStatus,
    action: 'submit' | 'approve' | 'publish' | 'unpublish' | 'archive' | 'restore',
  ): PostWorkflowStatus {
    switch (action) {
      case 'submit':
        if (current !== 'draft') throw new Error('Only drafts can be submitted for review');
        return 'in_review';
      case 'approve':
        if (current !== 'in_review') throw new Error('Only content in review can be approved');
        return 'approved';
      case 'publish':
        if (!['approved', 'published'].includes(current)) throw new Error('Only approved content can be published');
        return 'published';
      case 'unpublish':
        if (current !== 'published') throw new Error('Only published content can be unpublished');
        return 'approved';
      case 'archive':
        if (!['approved', 'published'].includes(current)) throw new Error('Only approved or published content can be archived');
        return 'archived';
      case 'restore':
        if (current !== 'archived') throw new Error('Only archived content can be restored');
        return 'draft';
      default:
        return current;
    }
  }
}

export default PostModelPostgres;
