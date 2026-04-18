import { randomBytes } from 'crypto';

import {
  PostType as PrismaPostType,
  SubscriptionFrequency,
  type Prisma,
} from '@prisma/client';

import type {
  AlertSubscriptionRecord,
  PostRecord,
  PostType,
} from '../content/types.js';
import { prisma } from '../services/postgres/prisma.js';
import { slugify } from '../utils/slugify.js';

interface AlertSubscriptionCreateInput {
  email: string;
  categories?: string[];
  states?: string[];
  organizations?: string[];
  qualifications?: string[];
  postTypes?: PostType[];
  frequency?: 'instant' | 'daily' | 'weekly';
  source?: string;
  verified?: boolean;
}

const includeRelations = {
  categoryPrefs: { include: { category: true } },
  statePrefs: { include: { state: true } },
  organizationPrefs: { include: { organization: true } },
  qualificationPrefs: { include: { qualification: true } },
  postTypePrefs: true,
} satisfies Prisma.SubscriptionInclude;

type SubscriptionRow = Prisma.SubscriptionGetPayload<{ include: typeof includeRelations }>;

const postTypeToPrisma: Record<PostType, PrismaPostType> = {
  job: PrismaPostType.JOB,
  result: PrismaPostType.RESULT,
  'admit-card': PrismaPostType.ADMIT_CARD,
  admission: PrismaPostType.ADMISSION,
  'answer-key': PrismaPostType.ANSWER_KEY,
  syllabus: PrismaPostType.SYLLABUS,
};

const postTypeFromPrisma: Record<PrismaPostType, PostType | null> = {
  [PrismaPostType.JOB]: 'job',
  [PrismaPostType.RESULT]: 'result',
  [PrismaPostType.ADMIT_CARD]: 'admit-card',
  [PrismaPostType.ANSWER_KEY]: 'answer-key',
  [PrismaPostType.ADMISSION]: 'admission',
  [PrismaPostType.SCHOLARSHIP]: null,
  [PrismaPostType.BOARD_RESULT]: null,
  [PrismaPostType.SYLLABUS]: 'syllabus',
};

function normalizeTokens(values: string[] = []) {
  const entries = values
    .map((value) => value.trim())
    .filter(Boolean)
    .map((name) => ({ name, slug: slugify(name) }))
    .filter((entry) => entry.slug);

  const bySlug = new Map<string, { name: string; slug: string }>();
  for (const entry of entries) {
    bySlug.set(entry.slug, entry);
  }
  return Array.from(bySlug.values());
}

function toPrismaFrequency(value: 'instant' | 'daily' | 'weekly'): SubscriptionFrequency {
  if (value === 'instant') return SubscriptionFrequency.INSTANT;
  if (value === 'weekly') return SubscriptionFrequency.WEEKLY;
  return SubscriptionFrequency.DAILY;
}

function fromPrismaFrequency(value: SubscriptionFrequency): 'instant' | 'daily' | 'weekly' {
  if (value === SubscriptionFrequency.INSTANT) return 'instant';
  if (value === SubscriptionFrequency.WEEKLY) return 'weekly';
  return 'daily';
}

function toRecord(row: SubscriptionRow): AlertSubscriptionRecord {
  const mappedPostTypes = row.postTypePrefs
    .map((item) => postTypeFromPrisma[item.postType])
    .filter((value): value is PostType => Boolean(value));

  return {
    id: row.id,
    email: row.email,
    verified: row.verified,
    isActive: row.isActive,
    frequency: fromPrismaFrequency(row.frequency),
    categorySlugs: row.categoryPrefs.map((item) => item.category.slug),
    categoryNames: row.categoryPrefs.map((item) => item.category.name),
    stateSlugs: row.statePrefs.map((item) => item.state.slug),
    stateNames: row.statePrefs.map((item) => item.state.name),
    organizationSlugs: row.organizationPrefs.map((item) => item.organization.slug),
    organizationNames: row.organizationPrefs.map((item) => item.organization.name),
    qualificationSlugs: row.qualificationPrefs.map((item) => item.qualification.slug),
    qualificationNames: row.qualificationPrefs.map((item) => item.qualification.name),
    postTypes: mappedPostTypes,
    verificationToken: row.verificationToken || undefined,
    unsubscribeToken: row.unsubscribeToken,
    source: row.source || undefined,
    alertCount: row.alertCount,
    lastAlertedAt: row.lastAlertedAt?.toISOString(),
    lastDigestDailySentAt: row.lastDigestDailySentAt?.toISOString(),
    lastDigestWeeklySentAt: row.lastDigestWeeklySentAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function syncCategoryPrefs(tx: Prisma.TransactionClient, subscriptionId: string, names: Array<{ name: string; slug: string }>) {
  await tx.subscriptionCategory.deleteMany({ where: { subscriptionId } });
  if (names.length === 0) return;
  const categories = await Promise.all(names.map((item) => tx.category.upsert({
    where: { slug: item.slug },
    update: { name: item.name },
    create: { name: item.name, slug: item.slug },
    select: { id: true },
  })));
  await tx.subscriptionCategory.createMany({
    data: categories.map((category) => ({ subscriptionId, categoryId: category.id })),
    skipDuplicates: true,
  });
}

async function syncStatePrefs(tx: Prisma.TransactionClient, subscriptionId: string, names: Array<{ name: string; slug: string }>) {
  await tx.subscriptionState.deleteMany({ where: { subscriptionId } });
  if (names.length === 0) return;
  const states = await Promise.all(names.map((item) => tx.state.upsert({
    where: { slug: item.slug },
    update: { name: item.name },
    create: { name: item.name, slug: item.slug },
    select: { id: true },
  })));
  await tx.subscriptionState.createMany({
    data: states.map((state) => ({ subscriptionId, stateId: state.id })),
    skipDuplicates: true,
  });
}

async function syncOrganizationPrefs(tx: Prisma.TransactionClient, subscriptionId: string, names: Array<{ name: string; slug: string }>) {
  await tx.subscriptionOrganization.deleteMany({ where: { subscriptionId } });
  if (names.length === 0) return;
  const organizations = await Promise.all(names.map((item) => tx.organization.upsert({
    where: { slug: item.slug },
    update: { name: item.name, shortName: item.name.slice(0, 60) },
    create: { name: item.name, slug: item.slug, shortName: item.name.slice(0, 60) },
    select: { id: true },
  })));
  await tx.subscriptionOrganization.createMany({
    data: organizations.map((organization) => ({ subscriptionId, organizationId: organization.id })),
    skipDuplicates: true,
  });
}

async function syncQualificationPrefs(tx: Prisma.TransactionClient, subscriptionId: string, names: Array<{ name: string; slug: string }>) {
  await tx.subscriptionQualification.deleteMany({ where: { subscriptionId } });
  if (names.length === 0) return;
  const qualifications = await Promise.all(names.map((item) => tx.qualification.upsert({
    where: { slug: item.slug },
    update: { name: item.name },
    create: { name: item.name, slug: item.slug },
    select: { id: true },
  })));
  await tx.subscriptionQualification.createMany({
    data: qualifications.map((qualification) => ({ subscriptionId, qualificationId: qualification.id })),
    skipDuplicates: true,
  });
}

async function syncPostTypePrefs(tx: Prisma.TransactionClient, subscriptionId: string, postTypes: PostType[]) {
  await tx.subscriptionPostType.deleteMany({ where: { subscriptionId } });
  if (postTypes.length === 0) return;
  await tx.subscriptionPostType.createMany({
    data: postTypes.map((postType) => ({
      subscriptionId,
      postType: postTypeToPrisma[postType],
    })),
    skipDuplicates: true,
  });
}

export class AlertSubscriptionModelPostgres {
  static async upsert(input: AlertSubscriptionCreateInput) {
    const email = input.email.trim().toLowerCase();
    const categories = normalizeTokens(input.categories);
    const states = normalizeTokens(input.states);
    const organizations = normalizeTokens(input.organizations);
    const qualifications = normalizeTokens(input.qualifications);

    return prisma.$transaction(async (tx) => {
      const existing = await tx.subscription.findUnique({
        where: { email },
        include: { postTypePrefs: true },
      });
      const verified = input.verified ?? existing?.verified ?? false;
      const verificationToken = verified
        ? null
        : (existing?.verificationToken || randomBytes(24).toString('hex'));
      const unsubscribeToken = existing?.unsubscribeToken || randomBytes(24).toString('hex');
      const source = input.source || existing?.source || null;
      const frequency = toPrismaFrequency(input.frequency ?? fromPrismaFrequency(existing?.frequency ?? SubscriptionFrequency.DAILY));

      const effectivePostTypes = input.postTypes && input.postTypes.length > 0
        ? Array.from(new Set(input.postTypes))
        : (existing?.postTypePrefs || [])
          .map((item) => postTypeFromPrisma[item.postType])
          .filter((value): value is PostType => Boolean(value));

      const subscription = await tx.subscription.upsert({
        where: { email },
        create: {
          email,
          verified,
          isActive: true,
          frequency,
          verificationToken,
          unsubscribeToken,
          source,
        },
        update: {
          verified,
          isActive: true,
          frequency,
          verificationToken,
          source,
        },
      });

      await syncCategoryPrefs(tx, subscription.id, categories);
      await syncStatePrefs(tx, subscription.id, states);
      await syncOrganizationPrefs(tx, subscription.id, organizations);
      await syncQualificationPrefs(tx, subscription.id, qualifications);
      await syncPostTypePrefs(tx, subscription.id, effectivePostTypes);

      const record = await tx.subscription.findUnique({
        where: { id: subscription.id },
        include: includeRelations,
      });
      return record ? toRecord(record) : null;
    });
  }

  static async verifyByToken(token: string) {
    const existing = await prisma.subscription.findFirst({
      where: { verificationToken: token, isActive: true },
      select: { id: true },
    });
    if (!existing) return null;

    const updated = await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        verified: true,
        verificationToken: null,
      },
      include: includeRelations,
    });
    return toRecord(updated);
  }

  static async unsubscribeByToken(token: string) {
    const existing = await prisma.subscription.findFirst({
      where: { unsubscribeToken: token },
      select: { id: true },
    });
    if (!existing) return null;

    const updated = await prisma.subscription.update({
      where: { id: existing.id },
      data: { isActive: false },
      include: includeRelations,
    });
    return toRecord(updated);
  }

  static async listAdmin(filters: {
    search?: string;
    status?: 'all' | 'active' | 'inactive';
    frequency?: 'all' | 'instant' | 'daily' | 'weekly';
    limit?: number;
    offset?: number;
  }) {
    const where: Prisma.SubscriptionWhereInput = {};

    if (filters.search?.trim()) {
      where.email = { contains: filters.search.trim(), mode: 'insensitive' };
    }
    if (filters.status === 'active') where.isActive = true;
    if (filters.status === 'inactive') where.isActive = false;
    if (filters.frequency && filters.frequency !== 'all') {
      where.frequency = toPrismaFrequency(filters.frequency);
    }

    const limit = filters.limit ?? 20;
    const offset = filters.offset ?? 0;

    const [rows, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        include: includeRelations,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.subscription.count({ where }),
    ]);

    const data = rows.map((row) => toRecord(row));
    return { data, total, count: data.length };
  }

  static async getStats() {
    const [total, verified, active, byFrequencyRows] = await Promise.all([
      prisma.subscription.count(),
      prisma.subscription.count({ where: { verified: true } }),
      prisma.subscription.count({ where: { isActive: true } }),
      prisma.subscription.groupBy({
        by: ['frequency'],
        _count: { frequency: true },
      }),
    ]);

    const byFrequency = byFrequencyRows.map((row) => ({
      _id: fromPrismaFrequency(row.frequency),
      count: row._count.frequency,
    }));

    return {
      total,
      verified,
      unverified: total - verified,
      active,
      inactive: total - active,
      byFrequency,
    };
  }

  static async deleteById(id: string) {
    try {
      await prisma.subscription.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  static async listMatchingPost(post: PostRecord, frequency?: 'instant' | 'daily' | 'weekly') {
    const categorySlugs = post.categories.map((item) => item.slug).filter(Boolean);
    const stateSlugs = post.states.map((item) => item.slug).filter(Boolean);
    const organizationSlug = post.organization?.slug;
    const qualificationSlugs = post.qualifications.map((item) => item.slug).filter(Boolean);

    const where: Prisma.SubscriptionWhereInput = {
      isActive: true,
      verified: true,
      ...(frequency ? { frequency: toPrismaFrequency(frequency) } : {}),
      AND: [
        {
          OR: [
            { categoryPrefs: { none: {} } },
            ...(categorySlugs.length > 0
              ? [{ categoryPrefs: { some: { category: { slug: { in: categorySlugs } } } } }]
              : []),
          ],
        },
        {
          OR: [
            { statePrefs: { none: {} } },
            ...(stateSlugs.length > 0
              ? [{ statePrefs: { some: { state: { slug: { in: stateSlugs } } } } }]
              : []),
          ],
        },
        {
          OR: [
            { organizationPrefs: { none: {} } },
            ...(organizationSlug
              ? [{ organizationPrefs: { some: { organization: { slug: organizationSlug } } } }]
              : []),
          ],
        },
        {
          OR: [
            { qualificationPrefs: { none: {} } },
            ...(qualificationSlugs.length > 0
              ? [{ qualificationPrefs: { some: { qualification: { slug: { in: qualificationSlugs } } } } }]
              : []),
          ],
        },
        {
          OR: [
            { postTypePrefs: { none: {} } },
            { postTypePrefs: { some: { postType: postTypeToPrisma[post.type] } } },
          ],
        },
      ],
    };

    const rows = await prisma.subscription.findMany({
      where,
      include: includeRelations,
    });
    return rows.map((row) => toRecord(row));
  }

  static async listByEmails(emails: string[]) {
    if (emails.length === 0) return [];
    const normalized = Array.from(new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean)));
    const rows = await prisma.subscription.findMany({
      where: {
        email: { in: normalized },
        isActive: true,
        verified: true,
      },
      include: includeRelations,
    });
    return rows.map((row) => toRecord(row));
  }

  static async listDueDigestSubscribers(args: {
    frequency: 'daily' | 'weekly';
    threshold: Date;
  }) {
    const frequency = toPrismaFrequency(args.frequency);
    const lastSentField = args.frequency === 'daily'
      ? { lastDigestDailySentAt: { lt: args.threshold } }
      : { lastDigestWeeklySentAt: { lt: args.threshold } };
    const nullField = args.frequency === 'daily'
      ? { lastDigestDailySentAt: null }
      : { lastDigestWeeklySentAt: null };

    const rows = await prisma.subscription.findMany({
      where: {
        isActive: true,
        verified: true,
        frequency,
        OR: [
          nullField,
          lastSentField,
        ],
      },
      include: includeRelations,
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((row) => toRecord(row));
  }

  static async markDigestSentByEmail(email: string, frequency: 'daily' | 'weekly', sentAt: Date) {
    const normalizedEmail = email.trim().toLowerCase();
    await prisma.subscription.updateMany({
      where: { email: normalizedEmail },
      data: frequency === 'daily'
        ? {
            lastDigestDailySentAt: sentAt,
          }
        : {
            lastDigestWeeklySentAt: sentAt,
          },
    });
  }

  static async markAlerted(ids: string[]) {
    if (ids.length === 0) return;
    await prisma.subscription.updateMany({
      where: { id: { in: ids } },
      data: {
        alertCount: { increment: 1 },
        lastAlertedAt: new Date(),
      },
    });
  }
}

export default AlertSubscriptionModelPostgres;
