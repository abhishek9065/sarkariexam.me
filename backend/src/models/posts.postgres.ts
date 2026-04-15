import type { Prisma } from '@prisma/client';
import {
  ImportantDateKind as PrismaImportantDateKind,
  PostType as PrismaPostType,
  TrustTag as PrismaTrustTag,
  WorkflowStatus as PrismaWorkflowStatus,
} from '@prisma/client';

import type {
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

type PostWithRelations = Prisma.PostGetPayload<{ include: typeof postInclude }>;
type PostInput = Omit<PostRecord, 'id' | 'createdAt' | 'updatedAt' | 'currentVersion' | 'searchText'>;

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

function toPublicCard(post: PostWithRelations): PublicPostCard {
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

  return {
    id: post.id,
    legacyAnnouncementId: post.legacyAnnouncementId || undefined,
    legacyId: post.legacyId || undefined,
    title: post.title,
    slug: post.slug,
    legacySlugs: Array.from(new Set([...(post.legacySlugs || []), ...post.slugAliases.map((item) => item.slug)])),
    type: mapPrismaTypeToContent(post.type),
    status: mapWorkflowStatus(post.status),
    summary: post.summary,
    shortInfo: post.shortInfo || undefined,
    body: post.body || undefined,
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
      updatedLabel: post.updatedLabel || undefined,
      officialSources,
    },
    seo: {
      metaTitle: post.seoTitle || undefined,
      metaDescription: post.seoDescription || undefined,
      canonicalPath: post.seoCanonicalPath || undefined,
      indexable: post.seoIndexable,
      ogImage: post.seoOgImage || undefined,
    },
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
    andClauses.push({ OR: [
      { title: { contains: term, mode: 'insensitive' } },
      { summary: { contains: term, mode: 'insensitive' } },
      { slug: { contains: term, mode: 'insensitive' } },
      { searchText: { contains: term, mode: 'insensitive' } },
    ] });
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
  organization?: TaxonomyRef | null;
  categories: TaxonomyRef[];
  states: TaxonomyRef[];
  qualifications: TaxonomyRef[];
  institution?: TaxonomyRef | null;
  exam?: TaxonomyRef | null;
  body?: string;
}): string {
  return [
    input.title,
    input.summary,
    input.organization?.name,
    ...input.categories.map((item) => item.name),
    ...input.states.map((item) => item.name),
    ...input.qualifications.map((item) => item.name),
    input.institution?.name,
    input.exam?.name,
    input.body,
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
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
    andClauses.push({ OR: [
      { searchText: { contains: term, mode: 'insensitive' } },
      { title: { contains: term, mode: 'insensitive' } },
      { slug: { contains: term, mode: 'insensitive' } },
    ] });
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
        include: postInclude,
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
    const related = await this.findPublicCards({
      type: postType,
      organization: row.organization?.slug || undefined,
      status: 'active',
      limit: 6,
    });

    return {
      post: toPostRecord(row),
      card,
      canonicalPath: canonicalPath(postType, row.slug),
      section: publicSectionMap[postType],
      relatedCards: related.data.filter((item) => item.id !== row.id).slice(0, 6),
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
    const merged = {
      ...existingRecord,
      ...input,
      id,
      status: input.status || existingRecord.status,
      trust: {
        verificationNote: input.trust?.verificationNote ?? existingRecord.trust?.verificationNote,
        updatedLabel: input.trust?.updatedLabel ?? existingRecord.trust?.updatedLabel,
        officialSources: input.officialSources ?? existingRecord.officialSources ?? [],
      },
      officialSources: input.officialSources ?? existingRecord.officialSources ?? [],
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
      const publishedAt = existing?.publishedAt ?? maybeDate(input.publishedAt) ?? (status === PrismaWorkflowStatus.PUBLISHED ? now : null);
      const archivedAt = existing?.archivedAt ?? maybeDate(input.archivedAt) ?? null;

      const searchText = buildSearchText({
        title: input.title,
        summary: input.summary,
        organization: normalizedOrganization,
        categories: normalizedCategories,
        states: normalizedStates,
        qualifications: normalizedQualifications,
        institution: normalizedInstitution,
        exam: normalizedExam,
        body: input.body,
      });

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
        verificationNote: input.trust?.verificationNote?.trim() || null,
        updatedLabel: input.trust?.updatedLabel?.trim() || null,
        tag: mapTagToPrisma(input.tag),
        isUrgent: Boolean(input.flags?.urgent),
        isNew: Boolean(input.flags?.isNew),
        isLastDate: Boolean(input.flags?.lastDate),
        isFeatured: Boolean(input.flags?.featured),
        homeSection: input.home?.section?.trim() || null,
        stickyRank: input.home?.stickyRank ?? null,
        highlight: Boolean(input.home?.highlight),
        trendingScore: input.home?.trendingScore ?? null,
        seoTitle: input.seo?.metaTitle?.trim() || null,
        seoDescription: input.seo?.metaDescription?.trim() || null,
        seoCanonicalPath: input.seo?.canonicalPath?.trim() || null,
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
