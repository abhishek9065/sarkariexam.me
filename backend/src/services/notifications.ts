import { PostType as PrismaPostType, type Prisma } from '@prisma/client';
import { z } from 'zod';

import NotificationCampaignModelPostgres, {
  type NotificationCampaignRecord,
  type NotificationCampaignSegmentType,
} from '../models/notificationCampaigns.postgres.js';
import PushSubscriptionModelPostgres from '../models/pushSubscriptions.postgres.js';
import { slugify } from '../utils/slugify.js';

import { prisma } from './postgres/prisma.js';

const notificationCampaignSchema = z.object({
  title: z.string().min(5).max(200),
  body: z.string().min(10).max(1000),
  url: z.string().url().optional(),
  segment: z.object({
    type: z.enum(['all', 'state', 'category', 'organization', 'qualification', 'type', 'language']),
    value: z.string(),
  }),
  scheduledAt: z.string().datetime().optional(),
  abTest: z.object({
    enabled: z.boolean(),
    variantA: z.object({ title: z.string(), body: z.string() }).optional(),
    variantB: z.object({ title: z.string(), body: z.string() }).optional(),
  }).optional(),
});

type NotificationCampaign = NotificationCampaignRecord;

function normalizeVariant(value?: { title?: string; body?: string }): { title: string; body: string } | undefined {
  if (!value?.title || !value.body) {
    return undefined;
  }

  return {
    title: value.title,
    body: value.body,
  };
}

function normalizeAbTest(input?: {
  enabled?: boolean;
  variantA?: { title?: string; body?: string };
  variantB?: { title?: string; body?: string };
}): NotificationCampaignRecord['abTest'] {
  if (!input) {
    return undefined;
  }

  return {
    enabled: Boolean(input.enabled),
    variantA: normalizeVariant(input.variantA),
    variantB: normalizeVariant(input.variantB),
  };
}

function mapSegmentType(value: string): NotificationCampaignSegmentType {
  if (
    value === 'all' ||
    value === 'state' ||
    value === 'category' ||
    value === 'organization' ||
    value === 'qualification' ||
    value === 'type' ||
    value === 'language'
  ) {
    return value;
  }
  return 'all';
}

function mapPostType(value: string): PrismaPostType | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'job') return PrismaPostType.JOB;
  if (normalized === 'result') return PrismaPostType.RESULT;
  if (normalized === 'admit-card') return PrismaPostType.ADMIT_CARD;
  if (normalized === 'answer-key') return PrismaPostType.ANSWER_KEY;
  if (normalized === 'admission') return PrismaPostType.ADMISSION;
  if (normalized === 'syllabus') return PrismaPostType.SYLLABUS;
  return null;
}

function buildSegmentWhere(
  segmentType: NotificationCampaignSegmentType,
  segmentValue: string,
  options?: { verified?: boolean },
): Prisma.SubscriptionWhereInput {
  const where: Prisma.SubscriptionWhereInput = { isActive: true };
  if (options?.verified) {
    where.verified = true;
  }

  const rawValue = segmentValue.trim();
  const normalizedValue = slugify(rawValue);

  switch (segmentType) {
    case 'state':
      where.statePrefs = {
        some: {
          state: {
            OR: [
              { slug: normalizedValue },
              { name: { equals: rawValue, mode: 'insensitive' } },
            ],
          },
        },
      };
      return where;
    case 'category':
      where.categoryPrefs = {
        some: {
          category: {
            OR: [
              { slug: normalizedValue },
              { name: { equals: rawValue, mode: 'insensitive' } },
            ],
          },
        },
      };
      return where;
    case 'organization':
      where.organizationPrefs = {
        some: {
          organization: {
            OR: [
              { slug: normalizedValue },
              { name: { equals: rawValue, mode: 'insensitive' } },
            ],
          },
        },
      };
      return where;
    case 'qualification':
      where.qualificationPrefs = {
        some: {
          qualification: {
            OR: [
              { slug: normalizedValue },
              { name: { equals: rawValue, mode: 'insensitive' } },
            ],
          },
        },
      };
      return where;
    case 'type': {
      const postType = mapPostType(rawValue);
      if (!postType) {
        where.id = '__unsupported_post_type__';
        return where;
      }
      where.postTypePrefs = {
        some: {
          postType,
        },
      };
      return where;
    }
    case 'language':
      // Language preferences are not persisted in the PostgreSQL subscription schema.
      where.id = '__unsupported_language_segment__';
      return where;
    case 'all':
    default:
      return where;
  }
}

/**
 * Create a new notification campaign
 */
export async function createCampaign(
  data: unknown,
  userId: string
): Promise<{ success: boolean; campaignId?: string; error?: string }> {
  const parse = notificationCampaignSchema.safeParse(data);
  if (!parse.success) {
    return { success: false, error: parse.error.message };
  }

  try {
    const campaign = await NotificationCampaignModelPostgres.create(
      {
        title: parse.data.title,
        body: parse.data.body,
        url: parse.data.url,
        segment: {
          type: parse.data.segment.type,
          value: parse.data.segment.value,
        },
        scheduledAt: parse.data.scheduledAt ? new Date(parse.data.scheduledAt) : undefined,
        abTest: normalizeAbTest(parse.data.abTest),
      },
      userId,
    );

    if (!campaign) {
      return { success: false, error: 'Failed to create campaign' };
    }

    return { success: true, campaignId: campaign.id };
  } catch (error) {
    console.error('[NotificationService] Error creating campaign:', error);
    return { success: false, error: 'Failed to create campaign' };
  }
}

/**
 * Get notification campaigns
 */
export async function getCampaigns(limit = 50): Promise<NotificationCampaign[]> {
  try {
    return await NotificationCampaignModelPostgres.list(limit);
  } catch (error) {
    console.error('[NotificationService] Error fetching campaigns:', error);
    return [];
  }
}

/**
 * Get user segments for targeting
 */
export async function getUserSegments(): Promise<{
  states: string[];
  categories: string[];
  languages: string[];
  totalUsers: number;
}> {
  try {
    const [stateRows, categoryRows, totalUsers] = await Promise.all([
      prisma.subscriptionState.groupBy({
        by: ['stateId'],
        where: {
          subscription: {
            is: {
              isActive: true,
            },
          },
        },
        _count: {
          stateId: true,
        },
        orderBy: {
          _count: {
            stateId: 'desc',
          },
        },
        take: 20,
      }),
      prisma.subscriptionCategory.groupBy({
        by: ['categoryId'],
        where: {
          subscription: {
            is: {
              isActive: true,
            },
          },
        },
        _count: {
          categoryId: true,
        },
        orderBy: {
          _count: {
            categoryId: 'desc',
          },
        },
        take: 20,
      }),
      prisma.subscription.count({ where: { isActive: true } }),
    ]);

    const stateIds = stateRows.map((item) => item.stateId);
    const categoryIds = categoryRows.map((item) => item.categoryId);

    const [stateRecords, categoryRecords] = await Promise.all([
      stateIds.length > 0
        ? prisma.state.findMany({
            where: { id: { in: stateIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      categoryIds.length > 0
        ? prisma.category.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
    ]);

    const stateNameById = new Map(stateRecords.map((item) => [item.id, item.name]));
    const categoryNameById = new Map(categoryRecords.map((item) => [item.id, item.name]));

    return {
      states: stateRows
        .map((item) => stateNameById.get(item.stateId))
        .filter((value): value is string => Boolean(value)),
      categories: categoryRows
        .map((item) => categoryNameById.get(item.categoryId))
        .filter((value): value is string => Boolean(value)),
      languages: ['Hindi', 'English', 'Tamil', 'Telugu', 'Marathi', 'Bengali'],
      totalUsers,
    };
  } catch (error) {
    console.error('[NotificationService] Error fetching segments:', error);
    return { states: [], categories: [], languages: [], totalUsers: 0 };
  }
}

/**
 * Get targeted user count for a segment
 */
export async function getSegmentUserCount(
  segmentType: string,
  segmentValue: string
): Promise<number> {
  try {
    const where = buildSegmentWhere(mapSegmentType(segmentType), segmentValue);
    return await prisma.subscription.count({ where });
  } catch (error) {
    console.error('[NotificationService] Error counting segment users:', error);
    return 0;
  }
}

/**
 * Send notification campaign
 */
export async function sendCampaign(campaignId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const campaign = await NotificationCampaignModelPostgres.findById(campaignId);
    if (!campaign) {
      return { success: false, error: 'Campaign not found' };
    }

    if (campaign.status === 'sending' || campaign.status === 'sent') {
      return { success: false, error: 'Campaign already sent' };
    }

    // Update status to sending
    const markedSending = await NotificationCampaignModelPostgres.markSending(campaignId);
    if (!markedSending) {
      return { success: false, error: 'Campaign not found' };
    }

    const userWhere = buildSegmentWhere(
      mapSegmentType(campaign.segment.type),
      campaign.segment.value,
      { verified: true },
    );

    const [emailUserCount, pushUsers] = await Promise.all([
      prisma.subscription.count({ where: userWhere }),
      PushSubscriptionModelPostgres.listAll(),
    ]);

    // Simulate sending (in production, this would use actual email/push services)
    const sentCount = emailUserCount + pushUsers.length;

    await NotificationCampaignModelPostgres.markSent(campaignId, sentCount);

    console.log('[NotificationService] Campaign sent', {
      sentCount,
    });
    return { success: true };
  } catch (error) {
    console.error('[NotificationService] Error sending campaign:', error);

    await NotificationCampaignModelPostgres.markFailed(campaignId).catch(() => undefined);
    
    return { success: false, error: 'Failed to send campaign' };
  }
}

/**
 * Schedule a campaign for later
 */
export async function scheduleCampaign(
  campaignId: string,
  scheduledAt: Date
): Promise<boolean> {
  try {
    return await NotificationCampaignModelPostgres.schedule(campaignId, scheduledAt);
  } catch (error) {
    console.error('[NotificationService] Error scheduling campaign:', error);
    return false;
  }
}

/**
 * Delete a campaign
 */
export async function deleteCampaign(campaignId: string): Promise<boolean> {
  try {
    return await NotificationCampaignModelPostgres.remove(campaignId);
  } catch (error) {
    console.error('[NotificationService] Error deleting campaign:', error);
    return false;
  }
}

/**
 * Process scheduled campaigns (run via cron job)
 */
export async function processScheduledCampaigns(): Promise<number> {
  try {
    const now = new Date();

    const scheduled = await NotificationCampaignModelPostgres.listScheduledDue(now);

    for (const campaign of scheduled) {
      await sendCampaign(campaign.id);
    }

    return scheduled.length;
  } catch (error) {
    console.error('[NotificationService] Error processing scheduled campaigns:', error);
    return 0;
  }
}

export const notificationService = {
  createCampaign,
  getCampaigns,
  getUserSegments,
  getSegmentUserCount,
  sendCampaign,
  scheduleCampaign,
  deleteCampaign,
  processScheduledCampaigns,
};

export default notificationService;
