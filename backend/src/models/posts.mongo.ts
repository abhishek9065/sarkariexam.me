import type { Collection, Document, Filter, Sort, WithId } from 'mongodb';
import { ObjectId } from 'mongodb';

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
import { getCollection } from '../services/cosmosdb.js';
import { slugify } from '../utils/slugify.js';

import { AuditLogModelMongo } from './auditLogs.mongo.js';
import { ContentTaxonomyModelMongo } from './contentTaxonomies.mongo.js';
import { PostVersionModelMongo } from './postVersions.mongo.js';

interface TaxonomyRefDoc {
  id?: string;
  name: string;
  slug: string;
}

interface OfficialSourceDoc {
  label: string;
  url: string;
  sourceType?: 'notification' | 'result' | 'admit-card' | 'website' | 'prospectus' | 'notice';
  isPrimary?: boolean;
  capturedAt?: string;
}

interface ImportantDateDoc {
  label: string;
  value: string;
  kind?: 'application_start' | 'last_date' | 'exam_date' | 'result_date' | 'admit_card' | 'counselling' | 'other';
  isPrimary?: boolean;
  note?: string;
}

interface EligibilityDoc {
  label: string;
  description: string;
  qualificationSlug?: string;
  minAge?: number;
  maxAge?: number;
  relaxationNote?: string;
}

interface FeeRuleDoc {
  category: string;
  amount: string;
  currency?: string;
  paymentNote?: string;
}

interface VacancyRowDoc {
  postName: string;
  department?: string;
  category?: string;
  vacancies: string;
  payLevel?: string;
  salaryNote?: string;
}

interface AdmissionProgramDoc {
  programName: string;
  level?: string;
  department?: string;
  intake?: string;
  eligibilityNote?: string;
}

interface PostDoc extends Document {
  _id: ObjectId;
  legacyAnnouncementId?: string;
  legacyId?: string;
  title: string;
  slug: string;
  legacySlugs: string[];
  type: PostType;
  status: PostWorkflowStatus;
  summary: string;
  shortInfo?: string;
  body?: string;
  organization?: TaxonomyRefDoc | null;
  categories: TaxonomyRefDoc[];
  states: TaxonomyRefDoc[];
  qualifications: TaxonomyRefDoc[];
  institution?: TaxonomyRefDoc | null;
  exam?: TaxonomyRefDoc | null;
  importantDates: ImportantDateDoc[];
  eligibility: EligibilityDoc[];
  feeRules: FeeRuleDoc[];
  vacancyRows: VacancyRowDoc[];
  admissionPrograms: AdmissionProgramDoc[];
  officialSources: OfficialSourceDoc[];
  trust: {
    verificationNote?: string;
    updatedLabel?: string;
    officialSources: OfficialSourceDoc[];
  };
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    canonicalPath?: string;
    indexable?: boolean;
    ogImage?: string;
  };
  tag?: 'new' | 'hot' | 'update' | 'last-date';
  flags: {
    urgent?: boolean;
    isNew?: boolean;
    lastDate?: boolean;
    featured?: boolean;
  };
  home: {
    section?: string;
    stickyRank?: number;
    highlight?: boolean;
    trendingScore?: number;
  };
  location?: string;
  salary?: string;
  postCount?: string;
  applicationStartDate?: string;
  lastDate?: string;
  examDate?: string;
  resultDate?: string;
  expiresAt?: Date | null;
  archivedAt?: Date | null;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
  approvedBy?: string;
  publishedBy?: string;
  currentVersion: number;
  searchText: string;
  organizationSlug?: string;
  organizationName?: string;
  categorySlugs: string[];
  categoryNames: string[];
  stateSlugs: string[];
  stateNames: string[];
  qualificationSlugs: string[];
  qualificationNames: string[];
  institutionSlug?: string;
  examSlug?: string;
}

type PostInput = Omit<PostRecord, 'id' | 'createdAt' | 'updatedAt' | 'currentVersion' | 'searchText'>;

function normalizeRef(ref?: TaxonomyRef | null): TaxonomyRefDoc | null {
  if (!ref?.name?.trim()) return null;
  const name = ref.name.trim();
  return {
    id: ref.id,
    name,
    slug: slugify(ref.slug || name),
  };
}

function normalizeRefs(refs: TaxonomyRef[] = []): TaxonomyRefDoc[] {
  const unique = new Map<string, TaxonomyRefDoc>();
  for (const ref of refs) {
    const normalized = normalizeRef(ref);
    if (!normalized) continue;
    unique.set(normalized.slug, normalized);
  }
  return Array.from(unique.values());
}

function maybeDate(value?: string | null): Date | null {
  if (!value?.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildSearchText(input: {
  title: string;
  summary: string;
  organization?: TaxonomyRefDoc | null;
  categories: TaxonomyRefDoc[];
  states: TaxonomyRefDoc[];
  qualifications: TaxonomyRefDoc[];
  institution?: TaxonomyRefDoc | null;
  exam?: TaxonomyRefDoc | null;
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

function buildCanonicalPath(doc: Pick<PostDoc, 'slug' | 'type'>): string {
  return `/${publicSectionMap[doc.type]}/${doc.slug}`;
}

function toDisplayDate(date?: Date | null, fallback?: string | null): string {
  if (date && !Number.isNaN(date.getTime())) {
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  if (fallback?.trim()) return fallback.trim();
  return '';
}

function buildPublicQuery(filters?: {
  type?: PostType;
  search?: string;
  category?: string;
  state?: string;
  organization?: string;
  qualification?: string;
  status?: 'active' | 'expired' | 'archived' | 'all';
}): Filter<PostDoc> {
  const now = new Date();
  const query: Filter<PostDoc> = {};
  const clauses: Filter<PostDoc>[] = [];

  if (filters?.type) query.type = filters.type;
  if (filters?.category) query.categorySlugs = slugify(filters.category);
  if (filters?.state) query.stateSlugs = slugify(filters.state);
  if (filters?.organization) query.organizationSlug = slugify(filters.organization);
  if (filters?.qualification) query.qualificationSlugs = slugify(filters.qualification);

  if (filters?.search?.trim()) {
    const safe = filters.search.trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    clauses.push({
      $or: [
        { searchText: { $regex: safe, $options: 'i' } },
        { title: { $regex: safe, $options: 'i' } },
        { summary: { $regex: safe, $options: 'i' } },
      ],
    });
  }

  if (filters?.status === 'archived') {
    query.status = 'archived';
  } else if (filters?.status === 'expired') {
    query.status = 'published';
    clauses.push({ expiresAt: { $ne: null, $lte: now } });
  } else if (filters?.status !== 'all') {
    query.status = 'published';
    clauses.push({
      $or: [
        { expiresAt: null },
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: now } },
      ],
    });
  }

  if (clauses.length > 0) {
    query.$and = [...(query.$and ?? []), ...clauses];
  }

  return query;
}

function buildAdminQuery(filters?: {
  type?: PostType;
  status?: PostWorkflowStatus | 'all';
  search?: string;
  category?: string;
  state?: string;
  organization?: string;
}): Filter<PostDoc> {
  const query: Filter<PostDoc> = {};

  if (filters?.type) query.type = filters.type;
  if (filters?.status && filters.status !== 'all') query.status = filters.status;
  if (filters?.category) query.categorySlugs = slugify(filters.category);
  if (filters?.state) query.stateSlugs = slugify(filters.state);
  if (filters?.organization) query.organizationSlug = slugify(filters.organization);
  if (filters?.search?.trim()) {
    const safe = filters.search.trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { searchText: { $regex: safe, $options: 'i' } },
      { title: { $regex: safe, $options: 'i' } },
      { slug: { $regex: safe, $options: 'i' } },
    ];
  }

  return query;
}

function buildSort(sort?: 'newest' | 'oldest' | 'updated' | 'published' | 'closing'): Sort {
  switch (sort) {
    case 'oldest':
      return { createdAt: 1, _id: 1 };
    case 'updated':
      return { updatedAt: -1, _id: -1 };
    case 'published':
      return { publishedAt: -1, _id: -1 };
    case 'closing':
      return { expiresAt: 1, publishedAt: -1 };
    case 'newest':
    default:
      return { createdAt: -1, _id: -1 };
  }
}

function mapRecordForDoc(input: PostInput, actorId?: string, existing?: PostDoc | null): Omit<PostDoc, '_id'> {
  const organization = normalizeRef(input.organization);
  const categories = normalizeRefs(input.categories);
  const states = normalizeRefs(input.states);
  const qualifications = normalizeRefs(input.qualifications);
  const institution = normalizeRef(input.institution);
  const exam = normalizeRef(input.exam);
  const now = new Date();
  const slug = slugify(input.slug || input.title);
  const expiresAt = maybeDate(input.expiresAt) || maybeDate(input.lastDate);

  const draft: Omit<PostDoc, '_id'> = {
    legacyAnnouncementId: input.legacyAnnouncementId,
    legacyId: input.legacyId,
    title: input.title.trim(),
    slug,
    legacySlugs: Array.from(new Set((input.legacySlugs || []).map((item) => slugify(item)).filter(Boolean))),
    type: input.type,
    status: input.status,
    summary: input.summary.trim(),
    shortInfo: input.shortInfo?.trim(),
    body: input.body?.trim(),
    organization,
    categories,
    states,
    qualifications,
    institution,
    exam,
    importantDates: input.importantDates || [],
    eligibility: input.eligibility || [],
    feeRules: input.feeRules || [],
    vacancyRows: input.vacancyRows || [],
    admissionPrograms: input.admissionPrograms || [],
    officialSources: input.officialSources || [],
    trust: {
      verificationNote: input.trust.verificationNote?.trim(),
      updatedLabel: input.trust.updatedLabel,
      officialSources: input.officialSources || [],
    },
    seo: input.seo || {},
    tag: input.tag,
    flags: input.flags || {},
    home: input.home || {},
    location: input.location?.trim(),
    salary: input.salary?.trim(),
    postCount: input.postCount?.trim(),
    applicationStartDate: input.applicationStartDate?.trim(),
    lastDate: input.lastDate?.trim(),
    examDate: input.examDate?.trim(),
    resultDate: input.resultDate?.trim(),
    expiresAt,
    archivedAt: existing?.archivedAt ?? null,
    publishedAt: existing?.publishedAt ?? (input.status === 'published' ? now : null),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    createdBy: existing?.createdBy ?? actorId,
    updatedBy: actorId ?? existing?.updatedBy,
    approvedBy: existing?.approvedBy,
    publishedBy: existing?.publishedBy,
    currentVersion: existing?.currentVersion ?? 1,
    searchText: buildSearchText({
      title: input.title,
      summary: input.summary,
      organization,
      categories,
      states,
      qualifications,
      institution,
      exam,
      body: input.body,
    }),
    organizationSlug: organization?.slug,
    organizationName: organization?.name,
    categorySlugs: categories.map((item) => item.slug),
    categoryNames: categories.map((item) => item.name),
    stateSlugs: states.map((item) => item.slug),
    stateNames: states.map((item) => item.name),
    qualificationSlugs: qualifications.map((item) => item.slug),
    qualificationNames: qualifications.map((item) => item.name),
    institutionSlug: institution?.slug,
    examSlug: exam?.slug,
  };

  return draft;
}

async function syncTaxonomies(doc: Omit<PostDoc, '_id'>) {
  await Promise.all([
    doc.organization ? ContentTaxonomyModelMongo.upsert('organizations', doc.organization) : Promise.resolve(null),
    doc.institution ? ContentTaxonomyModelMongo.upsert('institutions', doc.institution) : Promise.resolve(null),
    doc.exam ? ContentTaxonomyModelMongo.upsert('exams', doc.exam) : Promise.resolve(null),
    ContentTaxonomyModelMongo.upsertMany('categories', doc.categories),
    ContentTaxonomyModelMongo.upsertMany('states', doc.states),
    ContentTaxonomyModelMongo.upsertMany('qualifications', doc.qualifications),
    ContentTaxonomyModelMongo.upsertMany('exams', doc.exam ? [doc.exam] : []),
  ]);
}

export class PostModelMongo {
  private static get collection(): Collection<PostDoc> {
    return getCollection<PostDoc>('posts');
  }

  static async countDocuments() {
    return this.collection.countDocuments({});
  }

  static async create(input: PostInput, actorId?: string, actorRole?: string, note?: string) {
    const prepared = mapRecordForDoc(input, actorId, null);
    prepared.slug = await this.ensureUniqueSlug(prepared.slug);
    await syncTaxonomies(prepared);

    const result = await this.collection.insertOne(prepared as PostDoc);
    const inserted = await this.collection.findOne({ _id: result.insertedId });
    if (!inserted) throw new Error('Failed to create post');

    const post = this.docToPost(inserted);
    await PostVersionModelMongo.create({
      postId: post.id,
      version: post.currentVersion,
      note,
      reason: 'create',
      actorId,
      snapshot: post,
    });
    await AuditLogModelMongo.create({
      entityType: 'post',
      entityId: post.id,
      action: 'create',
      actorId,
      actorRole,
      summary: `Created ${post.type} draft "${post.title}"`,
      metadata: { status: post.status },
    });
    return post;
  }

  static async update(id: string, input: Partial<PostInput>, actorId?: string, actorRole?: string, note?: string) {
    const existing = await this.findDocById(id);
    if (!existing) return null;

    const next = mapRecordForDoc({
      ...this.docToPost(existing),
      ...input,
      id,
      status: input.status || existing.status,
      trust: {
        verificationNote: input.trust?.verificationNote ?? existing.trust?.verificationNote,
        updatedLabel: input.trust?.updatedLabel ?? existing.trust?.updatedLabel,
        officialSources: input.officialSources ?? existing.officialSources ?? [],
      },
      officialSources: input.officialSources ?? existing.officialSources ?? [],
      seo: input.seo ?? existing.seo ?? {},
      flags: input.flags ?? existing.flags ?? {},
      home: input.home ?? existing.home ?? {},
    } as unknown as PostInput, actorId, existing);

    next.slug = await this.ensureUniqueSlug(next.slug, id);
    next.currentVersion = (existing.currentVersion ?? 1) + 1;
    next.publishedAt = existing.publishedAt ?? next.publishedAt;
    next.archivedAt = existing.archivedAt ?? next.archivedAt;

    await syncTaxonomies(next);
    await this.collection.updateOne({ _id: existing._id }, { $set: next });

    const updated = await this.collection.findOne({ _id: existing._id });
    if (!updated) return null;
    const post = this.docToPost(updated);
    await PostVersionModelMongo.create({
      postId: post.id,
      version: post.currentVersion,
      note,
      reason: 'update',
      actorId,
      snapshot: post,
    });
    await AuditLogModelMongo.create({
      entityType: 'post',
      entityId: post.id,
      action: 'update',
      actorId,
      actorRole,
      summary: `Updated ${post.type} "${post.title}"`,
      metadata: { status: post.status },
    });
    return post;
  }

  static async findById(id: string) {
    const doc = await this.findDocById(id);
    return doc ? this.docToPost(doc) : null;
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
    const limit = filters?.limit ?? 20;
    const offset = filters?.offset ?? 0;
    const query = buildPublicQuery(filters);

    const [docs, total] = await Promise.all([
      this.collection.find(query).sort(buildSort(filters?.sort)).skip(offset).limit(limit).toArray(),
      this.collection.countDocuments(query),
    ]);

    const cards = docs.map((doc) => this.docToPublicCard(doc));
    return { data: cards, total, count: cards.length };
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
    const limit = filters?.limit ?? 20;
    const offset = filters?.offset ?? 0;
    const query = buildAdminQuery(filters);
    const [docs, total] = await Promise.all([
      this.collection.find(query).sort(buildSort(filters?.sort)).skip(offset).limit(limit).toArray(),
      this.collection.countDocuments(query),
    ]);
    const data = docs.map((doc) => this.docToPost(doc));
    return { data, total, count: data.length };
  }

  static async findBySlugOrLegacy(slugOrLegacy: string): Promise<PublicPostDetail | null> {
    const slug = slugify(slugOrLegacy);
    const doc = await this.collection.findOne({
      $or: [
        { slug },
        { legacySlugs: slug },
        { legacyId: slugOrLegacy },
      ],
    });
    if (!doc) return null;

    const card = this.docToPublicCard(doc);
    const canonicalPath = buildCanonicalPath(doc);
    const relatedResult = await this.findPublicCards({
      type: doc.type,
      organization: doc.organizationSlug,
      status: 'active',
      limit: 6,
    });
    const relatedCards = relatedResult.data.filter((item) => item.id !== card.id).slice(0, 6);
    return {
      post: this.docToPost(doc),
      card,
      canonicalPath,
      section: publicSectionMap[doc.type],
      relatedCards,
      breadcrumbs: this.buildBreadcrumbs(doc),
      archiveState: this.getArchiveState(doc),
    };
  }

  static async getHomepageSections(limitPerType = 12): Promise<Record<PublicSection, PublicPostCard[]>> {
    const sections = {} as Record<PublicSection, PublicPostCard[]>;
    await Promise.all(
      (Object.entries(publicSectionMap) as Array<[PostType, PublicSection]>).map(async ([type, section]) => {
        const result = await this.findPublicCards({ type, limit: limitPerType, status: 'active', sort: 'newest' });
        sections[section] = result.data;
      }),
    );
    return sections;
  }

  static async getTaxonomyLanding(type: 'states' | 'organizations' | 'categories' | 'institutions' | 'exams' | 'qualifications', slug: string, limit = 20) {
    const normalized = slugify(slug);
    const taxonomy = await ContentTaxonomyModelMongo.findBySlug(type, normalized);
    if (!taxonomy) return null;

    const filter =
      type === 'states'
        ? { state: normalized }
        : type === 'organizations'
          ? { organization: normalized }
          : type === 'categories'
            ? { category: normalized }
            : type === 'qualifications'
              ? { qualification: normalized }
              : {};

    const cards = await this.findPublicCards({ ...filter, limit, status: 'active' });
    const relatedCounts = await this.getTypeCounts(filter);
    return {
      taxonomy,
      cards: cards.data,
      relatedCounts,
    };
  }

  static async getTypeCounts(filters?: { category?: string; organization?: string; state?: string }) {
    const counts: Record<string, number> = {};
    await Promise.all(
      (Object.keys(publicSectionMap) as PostType[]).map(async (type) => {
        counts[type] = await this.collection.countDocuments(buildPublicQuery({ ...filters, type, status: 'active' }));
      }),
    );
    return counts;
  }

  static async getHistory(id: string): Promise<{ versions: PostVersionRecord[]; audit: AuditLogRecord[] }> {
    return {
      versions: await PostVersionModelMongo.listByPost(id),
      audit: await AuditLogModelMongo.list({ entityId: id, limit: 100 }),
    };
  }

  static async transition(
    id: string,
    action: 'submit' | 'approve' | 'publish' | 'unpublish' | 'archive' | 'restore',
    actorId?: string,
    actorRole?: string,
    note?: string,
  ) {
    const existing = await this.findDocById(id);
    if (!existing) return null;

    const now = new Date();
    const nextStatus = this.resolveNextStatus(existing.status, action);
    const patch: Partial<PostDoc> = {
      status: nextStatus,
      updatedAt: now,
      updatedBy: actorId,
    };

    if (action === 'approve') patch.approvedBy = actorId;
    if (action === 'publish') {
      patch.publishedAt = now;
      patch.publishedBy = actorId;
      patch.archivedAt = null;
    }
    if (action === 'archive') patch.archivedAt = now;
    if (action === 'restore') patch.archivedAt = null;

    await this.collection.updateOne({ _id: existing._id }, { $set: patch });
    const updated = await this.collection.findOne({ _id: existing._id });
    if (!updated) return null;

    const post = this.docToPost(updated);
    const nextVersion = (updated.currentVersion ?? existing.currentVersion ?? 1) + 1;
    await this.collection.updateOne({ _id: existing._id }, { $set: { currentVersion: nextVersion } });
    const finalDoc = await this.collection.findOne({ _id: existing._id });
    if (!finalDoc) return post;
    const finalPost = this.docToPost(finalDoc);

    await PostVersionModelMongo.create({
      postId: finalPost.id,
      version: finalPost.currentVersion,
      note,
      reason: action,
      actorId,
      snapshot: finalPost,
    });
    await AuditLogModelMongo.create({
      entityType: 'workflow',
      entityId: finalPost.id,
      action,
      actorId,
      actorRole,
      summary: `${action} ${finalPost.type} "${finalPost.title}"`,
      metadata: { from: existing.status, to: finalPost.status, note },
    });

    return finalPost;
  }

  private static resolveNextStatus(current: PostWorkflowStatus, action: 'submit' | 'approve' | 'publish' | 'unpublish' | 'archive' | 'restore'): PostWorkflowStatus {
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

  private static async ensureUniqueSlug(baseSlug: string, excludeId?: string) {
    const safeBase = slugify(baseSlug);
    let candidate = safeBase;
    let attempt = 1;

    while (true) {
      const doc = await this.collection.findOne({ slug: candidate });
      if (!doc) return candidate;
      if (excludeId && doc._id.toString() === excludeId) return candidate;
      attempt += 1;
      candidate = `${safeBase}-${attempt}`;
    }
  }

  private static async findDocById(id: string) {
    if (!ObjectId.isValid(id)) return null;
    return this.collection.findOne({ _id: new ObjectId(id) });
  }

  private static buildBreadcrumbs(doc: PostDoc): Array<{ label: string; href: string }> {
    const crumbs = [
      { label: 'Home', href: '/' },
      { label: this.sectionTitle(publicSectionMap[doc.type]), href: `/${publicSectionMap[doc.type]}` },
    ];

    if (doc.organizationSlug && doc.organizationName) {
      crumbs.push({ label: doc.organizationName, href: `/organizations/${doc.organizationSlug}` });
    }

    crumbs.push({ label: doc.title, href: buildCanonicalPath(doc) });
    return crumbs;
  }

  private static sectionTitle(section: PublicSection) {
    switch (section) {
      case 'jobs':
        return 'Latest Jobs';
      case 'results':
        return 'Latest Results';
      case 'admit-cards':
        return 'Latest Admit Cards';
      case 'admissions':
        return 'Latest Admissions';
      case 'answer-keys':
        return 'Latest Answer Keys';
      case 'syllabus':
      default:
        return 'Latest Syllabus';
    }
  }

  private static getArchiveState(doc: PostDoc): 'active' | 'expired' | 'archived' {
    if (doc.status === 'archived') return 'archived';
    if (doc.expiresAt && doc.expiresAt.getTime() <= Date.now()) return 'expired';
    return 'active';
  }

  private static docToPublicCard(doc: WithId<PostDoc>): PublicPostCard {
    const publishedDate = doc.publishedAt ?? doc.updatedAt ?? doc.createdAt;
    return {
      id: doc._id.toString(),
      legacyId: doc.legacyId,
      title: doc.title,
      slug: doc.slug,
      legacySlugs: doc.legacySlugs || [],
      type: doc.type,
      section: publicSectionMap[doc.type],
      href: buildCanonicalPath(doc),
      org: doc.organizationName || doc.organization?.name || 'Government of India',
      date: toDisplayDate(publishedDate, doc.lastDate),
      postCount: doc.postCount,
      qualification: doc.qualificationNames?.join(', ') || undefined,
      tag: doc.tag,
      summary: doc.summary,
      stateSlugs: doc.stateSlugs || [],
    };
  }

  private static docToPost(doc: WithId<PostDoc>): PostRecord {
    return {
      id: doc._id.toString(),
      legacyAnnouncementId: doc.legacyAnnouncementId,
      legacyId: doc.legacyId,
      title: doc.title,
      slug: doc.slug,
      legacySlugs: doc.legacySlugs || [],
      type: doc.type,
      status: doc.status,
      summary: doc.summary,
      shortInfo: doc.shortInfo,
      body: doc.body,
      organization: doc.organization ?? null,
      categories: doc.categories || [],
      states: doc.states || [],
      qualifications: doc.qualifications || [],
      institution: doc.institution ?? null,
      exam: doc.exam ?? null,
      importantDates: doc.importantDates || [],
      eligibility: doc.eligibility || [],
      feeRules: doc.feeRules || [],
      vacancyRows: doc.vacancyRows || [],
      admissionPrograms: doc.admissionPrograms || [],
      officialSources: doc.officialSources || [],
      trust: {
        verificationNote: doc.trust?.verificationNote,
        updatedLabel: doc.trust?.updatedLabel,
        officialSources: doc.officialSources || [],
      },
      seo: doc.seo || {},
      tag: doc.tag,
      flags: doc.flags || {},
      home: doc.home || {},
      location: doc.location,
      salary: doc.salary,
      postCount: doc.postCount,
      applicationStartDate: doc.applicationStartDate,
      lastDate: doc.lastDate,
      examDate: doc.examDate,
      resultDate: doc.resultDate,
      expiresAt: doc.expiresAt?.toISOString(),
      archivedAt: doc.archivedAt?.toISOString(),
      publishedAt: doc.publishedAt?.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      createdAt: doc.createdAt.toISOString(),
      createdBy: doc.createdBy,
      updatedBy: doc.updatedBy,
      approvedBy: doc.approvedBy,
      publishedBy: doc.publishedBy,
      currentVersion: doc.currentVersion ?? 1,
      searchText: doc.searchText,
    };
  }
}

export default PostModelMongo;
