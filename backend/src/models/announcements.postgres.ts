import { Prisma } from '@prisma/client';

import type { PostRecord } from '../content/types.js';
import { ensureWorkflowLogsTable } from '../services/postgres/legacyTables.js';
import { prisma } from '../services/postgres/prisma.js';
import type { CreateAnnouncementDto, Announcement, AnnouncementStatus, ContentType } from '../types.js';
import { slugify } from '../utils/slugify.js';

import ContentTaxonomyModelPostgres from './contentTaxonomies.postgres.js';
import PostModelPostgres from './posts.postgres.js';

const DEFAULT_LIMIT = 20;

type SortOrder = 'newest' | 'oldest' | 'deadline' | 'updated' | 'views';

type FindFilters = {
  type?: ContentType;
  search?: string;
  category?: string;
  organization?: string;
  location?: string;
  qualification?: string;
  salaryMin?: number;
  salaryMax?: number;
  sort?: SortOrder;
  limit?: number;
  offset?: number;
};

type AdminFindFilters = FindFilters & {
  status?: AnnouncementStatus | 'all';
  includeInactive?: boolean;
  dateStart?: Date;
  dateEnd?: Date;
  author?: string;
  assigneeMode?: 'me' | 'unassigned' | 'assigned';
  assigneeUserId?: string;
  assigneeEmail?: string;
};

function toWorkflowStatus(status?: AnnouncementStatus): PostRecord['status'] {
  if (status === 'draft') return 'draft';
  if (status === 'pending') return 'in_review';
  if (status === 'archived') return 'archived';
  if (status === 'scheduled') return 'approved';
  return 'published';
}

function toAnnouncementStatus(status: PostRecord['status']): AnnouncementStatus {
  if (status === 'draft') return 'draft';
  if (status === 'in_review') return 'pending';
  if (status === 'approved') return 'scheduled';
  if (status === 'archived') return 'archived';
  return 'published';
}

function toPostType(type: ContentType): PostRecord['type'] {
  return type;
}

function parseDeadline(post: PostRecord): Date | undefined {
  const candidates = [post.lastDate, post.expiresAt, post.examDate, post.resultDate].filter(Boolean) as string[];
  for (const value of candidates) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return undefined;
}

function parseSalaryRange(post: PostRecord): { min?: number; max?: number } {
  const text = post.salary || '';
  const matches = text.match(/\d+(?:[,.]\d+)?/g);
  if (!matches || matches.length === 0) return {};
  const values = matches.map((item) => Number(item.replace(/,/g, ''))).filter((value) => Number.isFinite(value));
  if (values.length === 0) return {};
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

function matchesExtraFilters(post: PostRecord, filters?: FindFilters): boolean {
  if (!filters) return true;

  if (filters.location) {
    const needle = filters.location.toLowerCase();
    const haystack = (post.location || '').toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  if (filters.qualification) {
    const needle = filters.qualification.toLowerCase();
    const hasQualification = post.qualifications.some((item) =>
      item.name.toLowerCase().includes(needle) || item.slug.toLowerCase().includes(slugify(needle)),
    );
    if (!hasQualification) return false;
  }

  if (filters.salaryMin !== undefined || filters.salaryMax !== undefined) {
    const range = parseSalaryRange(post);
    if (filters.salaryMin !== undefined && range.max !== undefined && range.max < filters.salaryMin) return false;
    if (filters.salaryMax !== undefined && range.min !== undefined && range.min > filters.salaryMax) return false;
  }

  return true;
}

function mapSort(sort?: SortOrder): 'newest' | 'oldest' | 'published' | 'updated' {
  if (sort === 'oldest') return 'oldest';
  if (sort === 'updated') return 'updated';
  if (sort === 'deadline') return 'published';
  if (sort === 'views') return 'updated';
  return 'newest';
}

function toPostStatus(status?: AnnouncementStatus | 'all'): PostRecord['status'] | 'all' {
  if (!status || status === 'all') return 'all';
  return toWorkflowStatus(status);
}

function toUnixMs(value?: string): number {
  if (!value) return 0;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function sortAdminPosts(posts: PostRecord[], sort?: SortOrder): PostRecord[] {
  const copy = [...posts];

  if (sort === 'oldest') {
    return copy.sort((a, b) => toUnixMs(a.createdAt) - toUnixMs(b.createdAt));
  }
  if (sort === 'updated') {
    return copy.sort((a, b) => toUnixMs(b.updatedAt) - toUnixMs(a.updatedAt));
  }
  if (sort === 'views') {
    return copy.sort((a, b) => (b.home.trendingScore || 0) - (a.home.trendingScore || 0));
  }
  if (sort === 'deadline') {
    return copy.sort((a, b) => {
      const aDeadline = parseDeadline(a)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bDeadline = parseDeadline(b)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return aDeadline - bDeadline;
    });
  }

  return copy.sort((a, b) => toUnixMs(b.createdAt) - toUnixMs(a.createdAt));
}

function applyAdminExtraFilters(posts: PostRecord[], filters?: AdminFindFilters): PostRecord[] {
  let filtered = [...posts];

  if (!filters?.includeInactive) {
    filtered = filtered.filter((post) => post.status !== 'archived');
  }

  if (filters?.location) {
    const needle = filters.location.toLowerCase();
    filtered = filtered.filter((post) => (post.location || '').toLowerCase().includes(needle));
  }

  if (filters?.qualification) {
    const needle = filters.qualification.toLowerCase();
    filtered = filtered.filter((post) =>
      post.qualifications.some((item) => item.name.toLowerCase().includes(needle) || item.slug.toLowerCase().includes(slugify(needle))),
    );
  }

  if (filters?.dateStart || filters?.dateEnd) {
    const startMs = filters.dateStart ? filters.dateStart.getTime() : Number.NEGATIVE_INFINITY;
    const endMs = filters.dateEnd ? filters.dateEnd.getTime() : Number.POSITIVE_INFINITY;
    filtered = filtered.filter((post) => {
      const updatedMs = toUnixMs(post.updatedAt);
      return updatedMs >= startMs && updatedMs <= endMs;
    });
  }

  if (filters?.author) {
    const needle = filters.author.toLowerCase();
    filtered = filtered.filter((post) => (post.createdBy || '').toLowerCase().includes(needle));
  }

  return filtered;
}

async function queryAdminPosts(filters?: AdminFindFilters): Promise<PostRecord[]> {
  const offset = Math.max(0, filters?.offset || 0);
  const limit = Math.min(1000, Math.max(1, filters?.limit || 100));
  const queryLimit = Math.min(10000, Math.max(500, offset + limit + 500));

  const result = await PostModelPostgres.findAdmin({
    type: filters?.type,
    status: toPostStatus(filters?.status),
    search: filters?.search,
    category: filters?.category,
    organization: filters?.organization,
    sort: mapSort(filters?.sort),
    limit: queryLimit,
    offset: 0,
  });

  const filtered = applyAdminExtraFilters(result.data, filters);
  return sortAdminPosts(filtered, filters?.sort);
}

interface WorkflowLogRow {
  announcement_id: string;
  metadata: unknown;
}

interface AssignmentDetails {
  assigneeUserId?: string;
  assigneeEmail?: string;
  reviewDueAt?: Date;
}

function asObject(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function parseOptionalDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

async function loadLatestAssignments(announcementIds: string[]): Promise<Map<string, AssignmentDetails>> {
  await ensureWorkflowLogsTable();
  if (announcementIds.length === 0) return new Map<string, AssignmentDetails>();

  const rows = await prisma.$queryRaw<WorkflowLogRow[]>(Prisma.sql`
    SELECT announcement_id, metadata
    FROM app_workflow_logs
    WHERE announcement_id IN (${Prisma.join(announcementIds)})
      AND action = ${'assigned'}
    ORDER BY created_at DESC
  `);

  const assignments = new Map<string, AssignmentDetails>();
  for (const row of rows) {
    if (assignments.has(row.announcement_id)) continue;

    const metadata = asObject(row.metadata);
    assignments.set(row.announcement_id, {
      assigneeUserId: typeof metadata?.assigneeUserId === 'string' ? metadata.assigneeUserId : undefined,
      assigneeEmail: typeof metadata?.assignee === 'string' ? metadata.assignee : undefined,
      reviewDueAt: parseOptionalDate(metadata?.reviewDueAt),
    });
  }

  return assignments;
}

function announcementFromPost(post: PostRecord): Announcement {
  const deadline = parseDeadline(post);
  const salary = parseSalaryRange(post);
  const status = toAnnouncementStatus(post.status);

  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    type: post.type,
    category: post.categories[0]?.name || 'General',
    organization: post.organization?.name || 'Government of India',
    content: post.body,
    externalLink: post.officialSources[0]?.url,
    location: post.location,
    deadline,
    minQualification: post.qualifications.map((item) => item.name).join(', ') || undefined,
    ageLimit: post.eligibility[0]?.minAge || post.eligibility[0]?.maxAge
      ? `${post.eligibility[0]?.minAge || ''}${post.eligibility[0]?.maxAge ? '-' + post.eligibility[0]?.maxAge : ''}`
      : undefined,
    applicationFee: post.feeRules[0]?.amount,
    salaryMin: salary.min,
    salaryMax: salary.max,
    cutoffMarks: undefined,
    totalPosts: post.postCount ? Number(post.postCount) || undefined : undefined,
    postedBy: post.createdBy,
    postedAt: new Date(post.publishedAt || post.createdAt),
    updatedAt: new Date(post.updatedAt),
    status,
    publishAt: post.publishedAt ? new Date(post.publishedAt) : undefined,
    approvedAt: undefined,
    approvedBy: post.approvedBy,
    version: post.currentVersion,
    isActive: status !== 'archived',
    viewCount: post.home.trendingScore || 0,
    tags: post.categories.map((item, index) => ({ id: index + 1, name: item.name, slug: item.slug })),
    importantDates: post.importantDates
      .map((item, index) => {
        const parsed = new Date(item.value);
        if (Number.isNaN(parsed.getTime())) return null;
        return {
          id: `${post.id}:${index + 1}`,
          announcementId: post.id,
          eventName: item.label,
          eventDate: parsed,
          description: item.note,
        };
      })
      .filter(Boolean) as Announcement['importantDates'],
    typeDetails: undefined,
    seo: {
      metaTitle: post.seo.metaTitle,
      metaDescription: post.seo.metaDescription,
      canonical: post.seo.canonicalPath,
      indexPolicy: post.seo.indexable === false ? 'noindex' : 'index',
      ogImage: post.seo.ogImage,
    },
    home: {
      section: post.home.section,
      stickyRank: post.home.stickyRank,
      highlight: post.home.highlight,
      trendingScore: post.home.trendingScore,
    },
    assigneeEmail: undefined,
    assigneeUserId: undefined,
    assignedAt: undefined,
    reviewDueAt: undefined,
  };
}

function listingFromPost(post: PostRecord) {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    type: post.type,
    category: post.categories[0]?.name || 'General',
    organization: post.organization?.name || 'Government of India',
    location: post.location || undefined,
    minQualification: post.qualifications.map((item) => item.name).join(', ') || undefined,
    postedAt: post.publishedAt || post.updatedAt,
    updatedAt: post.updatedAt,
    viewCount: post.home.trendingScore || 0,
    deadline: parseDeadline(post)?.toISOString(),
  };
}

async function queryPublishedPosts(filters?: FindFilters): Promise<PostRecord[]> {
  const offset = Math.max(0, filters?.offset || 0);
  const limit = Math.min(200, Math.max(1, filters?.limit || DEFAULT_LIMIT));
  const queryLimit = Math.min(600, offset + limit + 200);

  const result = await PostModelPostgres.findAdmin({
    limit: queryLimit,
    offset: 0,
    type: filters?.type ? toPostType(filters.type) : undefined,
    status: 'published',
    search: filters?.search,
    category: filters?.category,
    organization: filters?.organization,
    sort: mapSort(filters?.sort),
  });

  return result.data.filter((post) => matchesExtraFilters(post, filters));
}

export class AnnouncementModelPostgres {
  static async findAll(filters?: FindFilters): Promise<Announcement[]> {
    const offset = Math.max(0, filters?.offset || 0);
    const limit = Math.min(200, Math.max(1, filters?.limit || DEFAULT_LIMIT));
    const posts = await queryPublishedPosts(filters);
    return posts.slice(offset, offset + limit).map(announcementFromPost);
  }

  static async findAllAdmin(filters?: AdminFindFilters): Promise<Announcement[]> {
    const offset = Math.max(0, filters?.offset || 0);
    const limit = Math.min(1000, Math.max(1, filters?.limit || DEFAULT_LIMIT));
    const posts = await queryAdminPosts(filters);
    return posts.slice(offset, offset + limit).map(announcementFromPost);
  }

  static async countAdmin(filters?: AdminFindFilters): Promise<number> {
    const posts = await queryAdminPosts({ ...filters, limit: 10000, offset: 0 });
    return posts.length;
  }

  static async getAdminCounts(options?: { includeInactive?: boolean }): Promise<{
    total: number;
    byStatus: Record<AnnouncementStatus, number>;
    byType: Record<ContentType, number>;
  }> {
    const rows = await this.findAllAdmin({
      includeInactive: options?.includeInactive,
      status: 'all',
      limit: 10000,
      offset: 0,
      sort: 'newest',
    });

    const byStatus: Record<AnnouncementStatus, number> = {
      draft: 0,
      pending: 0,
      scheduled: 0,
      published: 0,
      archived: 0,
    };

    const byType: Record<ContentType, number> = {
      job: 0,
      result: 0,
      'admit-card': 0,
      syllabus: 0,
      'answer-key': 0,
      admission: 0,
    };

    for (const row of rows) {
      byStatus[row.status] += 1;
      byType[row.type] += 1;
    }

    return {
      total: rows.length,
      byStatus,
      byType,
    };
  }

  static async getManagePostsWorkspaceSummary(options?: {
    includeInactive?: boolean;
    assigneeUserId?: string;
    assigneeEmail?: string;
  }): Promise<{
    total: number;
    byStatus: Record<AnnouncementStatus, number>;
    assignedToMe: number;
    unassignedPending: number;
    overdueReview: number;
  }> {
    const rows = await this.findAllAdmin({
      includeInactive: options?.includeInactive,
      status: 'all',
      limit: 10000,
      offset: 0,
      sort: 'newest',
    });

    const byStatus: Record<AnnouncementStatus, number> = {
      draft: 0,
      pending: 0,
      scheduled: 0,
      published: 0,
      archived: 0,
    };

    for (const row of rows) {
      byStatus[row.status] += 1;
    }

    const nowMs = Date.now();
    const pendingRows = rows.filter((row) => row.status === 'pending');
    const assignments = await loadLatestAssignments(pendingRows.map((row) => row.id));

    const normalizedAssigneeEmail = options?.assigneeEmail?.trim().toLowerCase();

    const assignedToMe = pendingRows.filter((row) => {
      const assignment = assignments.get(row.id);
      if (!assignment) return false;
      if (options?.assigneeUserId && assignment.assigneeUserId === options.assigneeUserId) return true;
      if (normalizedAssigneeEmail && assignment.assigneeEmail?.trim().toLowerCase() === normalizedAssigneeEmail) return true;
      return false;
    }).length;

    const unassignedPending = pendingRows.filter((row) => {
      const assignment = assignments.get(row.id);
      return !assignment?.assigneeUserId && !assignment?.assigneeEmail;
    }).length;

    const overdueReview = pendingRows.filter((row) => {
      const assignment = assignments.get(row.id);
      if (assignment?.reviewDueAt) {
        return assignment.reviewDueAt.getTime() < nowMs;
      }
      const updatedAtMs = row.updatedAt ? new Date(row.updatedAt).getTime() : 0;
      return updatedAtMs > 0 && nowMs - updatedAtMs > 48 * 60 * 60 * 1000;
    }).length;

    return {
      total: rows.length,
      byStatus,
      assignedToMe,
      unassignedPending,
      overdueReview,
    };
  }

  static async getAdminQaCounts(options?: { includeInactive?: boolean }): Promise<{
    totalQaIssues: number;
    pendingQaIssues: number;
  }> {
    const rows = await this.findAllAdmin({
      includeInactive: options?.includeInactive,
      status: 'all',
      limit: 10000,
      offset: 0,
      sort: 'newest',
    });

    const nowMs = Date.now();

    const hasQaIssue = (row: Announcement): boolean => {
      const invalidExternalLink = row.externalLink ? !/^https?:\/\//i.test(row.externalLink) : false;
      const missingScheduledPublishAt = row.status === 'scheduled' && !row.publishAt;
      const expiredDeadline = row.deadline ? new Date(row.deadline).getTime() < nowMs : false;

      return (
        row.title.trim().length < 10 ||
        !row.category?.trim() ||
        !row.organization?.trim() ||
        missingScheduledPublishAt ||
        expiredDeadline ||
        invalidExternalLink
      );
    };

    const qaRows = rows.filter(hasQaIssue);
    return {
      totalQaIssues: qaRows.length,
      pendingQaIssues: qaRows.filter((row) => row.status === 'pending').length,
    };
  }

  static async getPendingSlaSummary(options?: { includeInactive?: boolean; staleLimit?: number }): Promise<{
    pendingTotal: number;
    averageDays: number;
    buckets: { lt1: number; d1_3: number; d3_7: number; gt7: number };
    stale: Array<{
      id: string;
      title: string;
      organization?: string;
      category?: string;
      type: ContentType;
      version?: number;
      status?: AnnouncementStatus;
      publishAt?: Date;
      deadline?: Date;
      externalLink?: string;
      isActive?: boolean;
      postedAt?: Date;
      updatedAt?: Date;
      ageDays: number;
    }>;
  }> {
    const pending = await this.findAllAdmin({
      includeInactive: options?.includeInactive,
      status: 'pending',
      limit: 10000,
      offset: 0,
      sort: 'updated',
    });

    const buckets = { lt1: 0, d1_3: 0, d3_7: 0, gt7: 0 };
    const stale: Array<{
      id: string;
      title: string;
      organization?: string;
      category?: string;
      type: ContentType;
      version?: number;
      status?: AnnouncementStatus;
      publishAt?: Date;
      deadline?: Date;
      externalLink?: string;
      isActive?: boolean;
      postedAt?: Date;
      updatedAt?: Date;
      ageDays: number;
    }> = [];

    const now = Date.now();
    let totalDays = 0;

    for (const row of pending) {
      const baseDate = row.updatedAt || row.postedAt;
      const baseMs = baseDate ? new Date(baseDate).getTime() : 0;
      const ageDays = baseMs > 0 ? Math.max(0, Math.floor((now - baseMs) / (1000 * 60 * 60 * 24))) : 0;

      totalDays += ageDays;

      if (ageDays < 1) {
        buckets.lt1 += 1;
      } else if (ageDays < 3) {
        buckets.d1_3 += 1;
      } else if (ageDays < 7) {
        buckets.d3_7 += 1;
      } else {
        buckets.gt7 += 1;
        stale.push({
          id: row.id,
          title: row.title,
          organization: row.organization,
          category: row.category,
          type: row.type,
          version: row.version,
          status: row.status,
          publishAt: row.publishAt,
          deadline: row.deadline ? new Date(row.deadline) : undefined,
          externalLink: row.externalLink,
          isActive: row.isActive,
          postedAt: row.postedAt ? new Date(row.postedAt) : undefined,
          updatedAt: row.updatedAt ? new Date(row.updatedAt) : undefined,
          ageDays,
        });
      }
    }

    stale.sort((a, b) => b.ageDays - a.ageDays);

    return {
      pendingTotal: pending.length,
      averageDays: pending.length ? Math.round(totalDays / pending.length) : 0,
      buckets,
      stale: stale.slice(0, options?.staleLimit ?? 10),
    };
  }

  static async findAllWithCursor(filters?: FindFilters & { cursor?: string }): Promise<{ data: Announcement[]; nextCursor: string | null; hasMore: boolean }> {
    const offset = Number.isFinite(Number(filters?.cursor)) ? Math.max(0, Number(filters?.cursor)) : 0;
    const limit = Math.min(200, Math.max(1, filters?.limit || DEFAULT_LIMIT));
    const data = await this.findAll({ ...filters, offset, limit: limit + 1 });
    const hasMore = data.length > limit;
    return {
      data: hasMore ? data.slice(0, limit) : data,
      nextCursor: hasMore ? String(offset + limit) : null,
      hasMore,
    };
  }

  static async findListingCards(filters?: FindFilters & { cursor?: string; includeTotal?: boolean }): Promise<{ data: ReturnType<typeof listingFromPost>[]; nextCursor: string | null; hasMore: boolean; total?: number }> {
    const offset = Number.isFinite(Number(filters?.cursor))
      ? Math.max(0, Number(filters?.cursor))
      : Math.max(0, filters?.offset || 0);
    const limit = Math.min(200, Math.max(1, filters?.limit || DEFAULT_LIMIT));
    const posts = await queryPublishedPosts({ ...filters, offset: 0, limit: Math.max(limit + offset + 1, 200) });

    const sliced = posts.slice(offset, offset + limit + 1);
    const hasMore = sliced.length > limit;
    const data = (hasMore ? sliced.slice(0, limit) : sliced).map(listingFromPost);

    return {
      data,
      nextCursor: hasMore ? String(offset + limit) : null,
      hasMore,
      total: filters?.includeTotal ? posts.length : undefined,
    };
  }

  static async findBySlug(slug: string): Promise<Announcement | null> {
    const detail = await PostModelPostgres.findBySlugOrLegacy(slug);
    if (!detail) return null;
    return announcementFromPost(detail.post);
  }

  static async findByIds(ids: string[]): Promise<Announcement[]> {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    const records = await Promise.all(uniqueIds.map((id) => PostModelPostgres.findById(id)));
    const mapped = records.filter(Boolean).map((record) => announcementFromPost(record as PostRecord));
    const byId = new Map(mapped.map((item) => [item.id, item]));
    return ids.map((id) => byId.get(id)).filter(Boolean) as Announcement[];
  }

  static async findById(id: string): Promise<Announcement | null> {
    const post = await PostModelPostgres.findById(id);
    return post ? announcementFromPost(post) : null;
  }

  static async incrementViewCount(_id: string): Promise<void> {
    // View count in the new content schema is derived analytics, so this remains a no-op.
  }

  static async getCategories(): Promise<string[]> {
    const items = await ContentTaxonomyModelPostgres.list('categories', 500);
    return items.map((item) => item.name);
  }

  static async getOrganizations(): Promise<string[]> {
    const items = await ContentTaxonomyModelPostgres.list('organizations', 500);
    return items.map((item) => item.name);
  }

  static async getTags(): Promise<{ name: string; count: number }[]> {
    const posts = await PostModelPostgres.findAdmin({
      limit: 300,
      status: 'published',
      sort: 'updated',
    });

    const counts = new Map<string, number>();
    for (const post of posts.data) {
      const tag = post.tag;
      if (!tag) continue;
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }

  static async create(data: CreateAnnouncementDto, userId: string): Promise<Announcement> {
    const created = await PostModelPostgres.create({
      title: data.title,
      slug: slugify(data.title),
      legacySlugs: [],
      type: toPostType(data.type),
      status: toWorkflowStatus(data.status),
      summary: data.content?.slice(0, 300) || data.title,
      shortInfo: data.content?.slice(0, 600),
      body: data.content,
      organization: {
        name: data.organization,
        slug: slugify(data.organization),
      },
      categories: [{
        name: data.category,
        slug: slugify(data.category),
      }],
      states: [],
      qualifications: data.minQualification
        ? data.minQualification.split(',').map((item) => item.trim()).filter(Boolean).map((name) => ({
            name,
            slug: slugify(name),
          }))
        : [],
      institution: null,
      exam: null,
      importantDates: data.importantDates?.map((item) => ({
        label: item.eventName,
        value: item.eventDate,
        note: item.description,
      })) || [],
      eligibility: [],
      feeRules: data.applicationFee
        ? [{ category: 'General', amount: data.applicationFee }]
        : [],
      vacancyRows: data.totalPosts
        ? [{ postName: data.title, vacancies: String(data.totalPosts) }]
        : [],
      admissionPrograms: [],
      officialSources: data.externalLink
        ? [{ label: 'Official Link', url: data.externalLink, isPrimary: true }]
        : [],
      trust: {},
      seo: {
        metaTitle: data.seo?.metaTitle,
        metaDescription: data.seo?.metaDescription,
        canonicalPath: data.seo?.canonical,
        indexable: data.seo?.indexPolicy !== 'noindex',
        ogImage: data.seo?.ogImage,
      },
      tag: undefined,
      flags: {
        urgent: false,
        isNew: false,
        lastDate: false,
        featured: false,
      },
      home: {
        section: data.home?.section,
        stickyRank: data.home?.stickyRank,
        highlight: data.home?.highlight,
        trendingScore: data.home?.trendingScore,
      },
      location: data.location,
      salary: data.salaryMin || data.salaryMax
        ? `${data.salaryMin || ''}-${data.salaryMax || ''}`
        : undefined,
      postCount: data.totalPosts ? String(data.totalPosts) : undefined,
      applicationStartDate: undefined,
      lastDate: data.deadline,
      examDate: undefined,
      resultDate: undefined,
    } as any, userId, 'admin', 'Migrated legacy announcement create');

    return announcementFromPost(created);
  }

  static async update(id: string, data: Partial<CreateAnnouncementDto> & { note?: string }, updatedBy?: string): Promise<Announcement | null> {
    const existing = await PostModelPostgres.findById(id);
    if (!existing) return null;

    const patch: Record<string, unknown> = {};

    if (data.title !== undefined) patch.title = data.title;
    if (data.type !== undefined) patch.type = toPostType(data.type);
    if (data.category !== undefined) {
      patch.categories = data.category
        ? [{ name: data.category, slug: slugify(data.category) }]
        : [];
    }
    if (data.organization !== undefined) {
      patch.organization = data.organization
        ? { name: data.organization, slug: slugify(data.organization) }
        : null;
    }
    if (data.content !== undefined) {
      patch.body = data.content;
      patch.summary = data.content?.slice(0, 300) || existing.summary;
      patch.shortInfo = data.content?.slice(0, 600) || undefined;
    }
    if (data.externalLink !== undefined) {
      patch.officialSources = data.externalLink
        ? [{ label: 'Official Link', url: data.externalLink, isPrimary: true }]
        : [];
    }
    if (data.location !== undefined) patch.location = data.location;
    if (data.deadline !== undefined) {
      patch.lastDate = data.deadline || undefined;
      patch.expiresAt = data.deadline || undefined;
    }
    if (data.minQualification !== undefined) {
      patch.qualifications = data.minQualification
        ? data.minQualification
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
            .map((name) => ({ name, slug: slugify(name) }))
        : [];
    }
    if (data.applicationFee !== undefined) {
      patch.feeRules = data.applicationFee
        ? [{ category: 'General', amount: data.applicationFee }]
        : [];
    }
    if ((data as any).salaryMin !== undefined || (data as any).salaryMax !== undefined) {
      const salaryMin = (data as any).salaryMin;
      const salaryMax = (data as any).salaryMax;
      patch.salary = salaryMin || salaryMax
        ? `${salaryMin || ''}-${salaryMax || ''}`
        : undefined;
    }
    if (data.totalPosts !== undefined) {
      patch.postCount = data.totalPosts ? String(data.totalPosts) : undefined;
      patch.vacancyRows = data.totalPosts
        ? [{ postName: data.title || existing.title, vacancies: String(data.totalPosts) }]
        : [];
    }
    if (data.status !== undefined) {
      patch.status = toWorkflowStatus(data.status);
    }
    if (data.publishAt !== undefined) {
      patch.publishedAt = data.publishAt || undefined;
    }
    if (data.importantDates !== undefined) {
      patch.importantDates = data.importantDates.map((item) => ({
        label: item.eventName,
        value: item.eventDate,
        note: item.description,
      }));
    }
    if ((data as any).seo !== undefined) {
      patch.seo = {
        metaTitle: (data as any).seo?.metaTitle,
        metaDescription: (data as any).seo?.metaDescription,
        canonicalPath: (data as any).seo?.canonical,
        indexable: (data as any).seo?.indexPolicy !== 'noindex',
        ogImage: (data as any).seo?.ogImage,
      };
    }
    if ((data as any).home !== undefined) {
      patch.home = {
        section: (data as any).home?.section,
        stickyRank: (data as any).home?.stickyRank,
        highlight: (data as any).home?.highlight,
        trendingScore: (data as any).home?.trendingScore,
      };
    }

    const updated = await PostModelPostgres.update(
      id,
      patch as any,
      updatedBy,
      'admin',
      data.note || 'Admin update',
    );

    return updated ? announcementFromPost(updated) : null;
  }

  static async softDelete(id: string): Promise<boolean> {
    const updated = await PostModelPostgres.update(
      id,
      {
        status: 'archived',
        archivedAt: new Date().toISOString(),
      } as any,
      'system',
      'admin',
      'Archived via admin endpoint',
    );
    return Boolean(updated);
  }

  static async getTrending(options?: { type?: ContentType; limit?: number }): Promise<Announcement[]> {
    const limit = Math.min(100, Math.max(1, options?.limit || 10));
    const rows = await this.findAllAdmin({
      status: 'published',
      type: options?.type,
      includeInactive: false,
      sort: 'views',
      limit,
      offset: 0,
    });
    return rows.slice(0, limit);
  }

  static async batchUpdate(
    updates: Array<{ id: string; data: Partial<CreateAnnouncementDto> & { isActive?: boolean; note?: string } }>,
    updatedBy?: string,
  ): Promise<{ updated: number; errors: string[] }> {
    const errors: string[] = [];
    let updated = 0;

    for (const item of updates) {
      try {
        const result = await this.update(item.id, item.data, updatedBy);
        if (result) {
          updated += 1;
        } else {
          errors.push(`Announcement not found: ${item.id}`);
        }
      } catch (error) {
        errors.push(`Update failed for ${item.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return { updated, errors };
  }
}

export default AnnouncementModelPostgres;
