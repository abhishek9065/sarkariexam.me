import { PostType as PrismaPostType, type Prisma } from '@prisma/client';
import webpush from 'web-push';
import { z } from 'zod';

import CampaignDispatchLogModelPostgres, {
  type CampaignDispatchLogInput,
  type CampaignDispatchLogRecord,
} from '../models/campaignDispatchLogs.postgres.js';
import NotificationCampaignModelPostgres, {
  type NotificationCampaignRecord,
  type NotificationCampaignSegmentType,
} from '../models/notificationCampaigns.postgres.js';
import PushSubscriptionModelPostgres, { type PushSubscriptionRecord } from '../models/pushSubscriptions.postgres.js';
import { slugify } from '../utils/slugify.js';

import { config } from '../config.js';
import { sendCampaignEmail } from './email.js';
import { prisma } from './postgres/prisma.js';

const notificationCampaignSchema = z.object({
  title: z.string().min(5).max(200),
  body: z.string().min(10).max(1000),
  url: z.string().url().optional(),
  segment: z.object({
    type: z.enum(['all', 'state', 'category', 'organization', 'qualification', 'type']),
    value: z.string().trim(),
  }).superRefine((segment, ctx) => {
    if (segment.type !== 'all' && segment.value.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Segment value is required for targeted campaigns',
        path: ['value'],
      });
    }
  }),
  scheduledAt: z.string().datetime().optional(),
  abTest: z.object({
    enabled: z.boolean(),
    variantA: z.object({ title: z.string(), body: z.string() }).optional(),
    variantB: z.object({ title: z.string(), body: z.string() }).optional(),
  }).optional(),
});

type NotificationCampaign = NotificationCampaignRecord;

interface EmailRecipient {
  id: string;
  email: string;
}

interface CampaignEstimate {
  email: number;
  push: number;
  total: number;
}

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
    const normalizedSegment = {
      type: parse.data.segment.type,
      value: parse.data.segment.type === 'all' ? 'all' : parse.data.segment.value,
    };

    const campaign = await NotificationCampaignModelPostgres.create(
      {
        title: parse.data.title,
        body: parse.data.body,
        url: parse.data.url,
        segment: normalizedSegment,
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
      languages: [],
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

async function resolveEmailRecipients(campaign: NotificationCampaignRecord): Promise<EmailRecipient[]> {
  const where = buildSegmentWhere(
    mapSegmentType(campaign.segment.type),
    campaign.segment.value,
    { verified: true },
  );

  return prisma.subscription.findMany({
    where,
    select: {
      id: true,
      email: true,
    },
    orderBy: { createdAt: 'asc' },
  });
}

async function resolvePushRecipients(): Promise<PushSubscriptionRecord[]> {
  return PushSubscriptionModelPostgres.listAll();
}

function campaignPushPayload(campaign: NotificationCampaignRecord): string {
  const url = campaign.url
    ? (() => {
        const trackedUrl = new URL(campaign.url, config.frontendUrl);
        trackedUrl.searchParams.set('source', 'campaign');
        trackedUrl.searchParams.set('medium', 'push');
        trackedUrl.searchParams.set('campaign', campaign.id);
        return trackedUrl.toString();
      })()
    : config.frontendUrl;

  return JSON.stringify({
    title: campaign.title,
    body: campaign.body,
    url,
    campaignId: campaign.id,
  });
}

function configureWebPush(): boolean {
  if (!config.vapidPublicKey || !config.vapidPrivateKey) {
    return false;
  }

  webpush.setVapidDetails('mailto:admin@sarkariexams.me', config.vapidPublicKey, config.vapidPrivateKey);
  return true;
}

async function dispatchEmail(campaign: NotificationCampaignRecord, recipient: EmailRecipient): Promise<CampaignDispatchLogInput> {
  const result = await sendCampaignEmail({
    to: recipient.email,
    title: campaign.title,
    body: campaign.body,
    url: campaign.url,
    campaignId: campaign.id,
  });

  const deliveredAt = result.success ? new Date() : undefined;
  return {
    campaignId: campaign.id,
    channel: 'email',
    recipient: recipient.email,
    subscriptionId: recipient.id,
    status: result.success ? 'sent' : 'failed',
    messageId: result.messageId,
    error: result.error,
    metadata: { source: 'campaign' },
    deliveredAt,
  };
}

async function dispatchPush(
  campaign: NotificationCampaignRecord,
  subscription: PushSubscriptionRecord,
  options?: { vapidConfigured?: boolean },
): Promise<CampaignDispatchLogInput> {
  if (options?.vapidConfigured === false) {
    return {
      campaignId: campaign.id,
      channel: 'push',
      recipient: subscription.endpoint,
      recipientUserId: subscription.userId,
      pushEndpoint: subscription.endpoint,
      status: 'failed',
      error: 'VAPID keys are not configured',
      metadata: { source: 'campaign' },
    };
  }

  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: subscription.keys },
      campaignPushPayload(campaign),
    );

    return {
      campaignId: campaign.id,
      channel: 'push',
      recipient: subscription.endpoint,
      recipientUserId: subscription.userId,
      pushEndpoint: subscription.endpoint,
      status: 'sent',
      metadata: { source: 'campaign' },
      deliveredAt: new Date(),
    };
  } catch (error) {
    return {
      campaignId: campaign.id,
      channel: 'push',
      recipient: subscription.endpoint,
      recipientUserId: subscription.userId,
      pushEndpoint: subscription.endpoint,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Failed to send push notification',
      metadata: { source: 'campaign' },
    };
  }
}

function summarizeDispatch(logs: CampaignDispatchLogInput[]): { sent: number; failed: number } {
  return logs.reduce(
    (summary, log) => {
      if (log.status === 'sent') {
        summary.sent++;
      }
      if (log.status === 'failed') {
        summary.failed++;
      }
      return summary;
    },
    { sent: 0, failed: 0 },
  );
}

export async function estimateCampaignRecipients(campaignId: string): Promise<{
  success: boolean;
  error?: string;
  data?: CampaignEstimate;
}> {
  try {
    const campaign = await NotificationCampaignModelPostgres.findById(campaignId);
    if (!campaign) {
      return { success: false, error: 'Campaign not found' };
    }
    if (campaign.unsupportedSegment) {
      return { success: false, error: 'Campaign segment is no longer supported' };
    }

    const [emailRecipients, pushRecipients] = await Promise.all([
      resolveEmailRecipients(campaign),
      resolvePushRecipients(),
    ]);

    return {
      success: true,
      data: {
        email: emailRecipients.length,
        push: pushRecipients.length,
        total: emailRecipients.length + pushRecipients.length,
      },
    };
  } catch (error) {
    console.error('[NotificationService] Error estimating campaign recipients:', error);
    return { success: false, error: 'Failed to estimate campaign recipients' };
  }
}

/**
 * Send notification campaign
 */
export async function sendCampaign(campaignId: string): Promise<{
  success: boolean;
  error?: string;
  mode?: 'delivery';
  sentCount?: number;
  failedCount?: number;
  totals?: CampaignEstimate;
}> {
  try {
    const campaign = await NotificationCampaignModelPostgres.findById(campaignId);
    if (!campaign) {
      return { success: false, error: 'Campaign not found' };
    }

    if (campaign.status === 'sending' || campaign.status === 'sent' || campaign.status === 'simulated') {
      return { success: false, error: 'Campaign already processed' };
    }

    if (campaign.unsupportedSegment) {
      await NotificationCampaignModelPostgres.markFailed(campaignId);
      return { success: false, error: 'Campaign segment is no longer supported' };
    }

    const markedSending = await NotificationCampaignModelPostgres.markSending(campaignId);
    if (!markedSending) {
      return { success: false, error: 'Campaign not found' };
    }

    const [emailRecipients, pushRecipients] = await Promise.all([
      resolveEmailRecipients(campaign),
      resolvePushRecipients(),
    ]);

    const vapidConfigured = configureWebPush();
    const dispatchLogs: CampaignDispatchLogInput[] = [];

    for (const recipient of emailRecipients) {
      dispatchLogs.push(await dispatchEmail(campaign, recipient));
    }

    for (const subscription of pushRecipients) {
      dispatchLogs.push(await dispatchPush(campaign, subscription, { vapidConfigured }));
    }

    await CampaignDispatchLogModelPostgres.createMany(dispatchLogs);
    const summary = summarizeDispatch(dispatchLogs);
    const totals = {
      email: emailRecipients.length,
      push: pushRecipients.length,
      total: emailRecipients.length + pushRecipients.length,
    };

    if (summary.sent > 0) {
      await NotificationCampaignModelPostgres.markSent(campaignId, summary.sent, summary.failed);
    } else {
      await NotificationCampaignModelPostgres.markFailed(campaignId, {
        sentCount: 0,
        failedCount: summary.failed,
      });
    }

    console.log('[NotificationService] Campaign delivery completed', {
      campaignId,
      sentCount: summary.sent,
      failedCount: summary.failed,
      totals,
    });
    return {
      success: true,
      mode: 'delivery',
      sentCount: summary.sent,
      failedCount: summary.failed,
      totals,
    };
  } catch (error) {
    console.error('[NotificationService] Error sending campaign:', error);

    await NotificationCampaignModelPostgres.markFailed(campaignId).catch(() => undefined);
    
    return { success: false, error: 'Failed to send campaign' };
  }
}

export async function getCampaignStats(campaignId: string): Promise<{
  success: boolean;
  error?: string;
  data?: Awaited<ReturnType<typeof CampaignDispatchLogModelPostgres.stats>>;
}> {
  try {
    const campaign = await NotificationCampaignModelPostgres.findById(campaignId);
    if (!campaign) {
      return { success: false, error: 'Campaign not found' };
    }
    const stats = await CampaignDispatchLogModelPostgres.stats(campaignId);
    return { success: true, data: stats };
  } catch (error) {
    console.error('[NotificationService] Error fetching campaign stats:', error);
    return { success: false, error: 'Failed to fetch campaign stats' };
  }
}

async function retryEmailLog(campaign: NotificationCampaignRecord, log: CampaignDispatchLogRecord): Promise<CampaignDispatchLogInput> {
  const retryResult = await dispatchEmail(campaign, {
    id: log.subscriptionId ?? log.id,
    email: log.recipient,
  });
  return {
    ...retryResult,
    metadata: { retryOf: log.id },
    attemptCount: log.attemptCount + 1,
  };
}

async function retryPushLog(campaign: NotificationCampaignRecord, log: CampaignDispatchLogRecord): Promise<CampaignDispatchLogInput> {
  const endpoint = log.pushEndpoint ?? log.recipient;
  const subscription = await PushSubscriptionModelPostgres.findByEndpoint(endpoint);
  if (!subscription) {
    return {
      campaignId: campaign.id,
      channel: 'push',
      recipient: endpoint,
      recipientUserId: log.recipientUserId,
      pushEndpoint: endpoint,
      status: 'failed',
      error: 'Push subscription no longer exists',
      metadata: { retryOf: log.id },
      attemptCount: log.attemptCount + 1,
    };
  }
  const retryResult = await dispatchPush(campaign, subscription, { vapidConfigured: configureWebPush() });
  return {
    ...retryResult,
    metadata: { retryOf: log.id },
    attemptCount: log.attemptCount + 1,
  };
}

export async function retryFailedCampaign(campaignId: string): Promise<{
  success: boolean;
  error?: string;
  mode?: 'delivery';
  retried?: number;
  sentCount?: number;
  failedCount?: number;
}> {
  try {
    const campaign = await NotificationCampaignModelPostgres.findById(campaignId);
    if (!campaign) {
      return { success: false, error: 'Campaign not found' };
    }
    if (campaign.unsupportedSegment) {
      await NotificationCampaignModelPostgres.markFailed(campaignId);
      return { success: false, error: 'Campaign segment is no longer supported' };
    }

    const failedLogs = await CampaignDispatchLogModelPostgres.listFailed(campaignId);
    if (failedLogs.length === 0) {
      return { success: true, mode: 'delivery', retried: 0, sentCount: 0, failedCount: 0 };
    }

    await NotificationCampaignModelPostgres.markSending(campaignId);
    const retryLogs: CampaignDispatchLogInput[] = [];
    for (const log of failedLogs) {
      if (log.channel === 'email') {
        retryLogs.push(await retryEmailLog(campaign, log));
      } else {
        retryLogs.push(await retryPushLog(campaign, log));
      }
    }

    await CampaignDispatchLogModelPostgres.createMany(retryLogs);
    const summary = summarizeDispatch(retryLogs);
    const allStats = await CampaignDispatchLogModelPostgres.stats(campaignId);

    if (allStats.sent > 0) {
      await NotificationCampaignModelPostgres.markSent(campaignId, allStats.sent, allStats.failed);
    } else {
      await NotificationCampaignModelPostgres.markFailed(campaignId, {
        sentCount: 0,
        failedCount: allStats.failed,
      });
    }

    return {
      success: true,
      mode: 'delivery',
      retried: failedLogs.length,
      sentCount: summary.sent,
      failedCount: summary.failed,
    };
  } catch (error) {
    console.error('[NotificationService] Error retrying campaign:', error);
    await NotificationCampaignModelPostgres.markFailed(campaignId).catch(() => undefined);
    return { success: false, error: 'Failed to retry campaign' };
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
  estimateCampaignRecipients,
  getCampaignStats,
  getCampaigns,
  getUserSegments,
  getSegmentUserCount,
  retryFailedCampaign,
  sendCampaign,
  scheduleCampaign,
  deleteCampaign,
  processScheduledCampaigns,
};

export default notificationService;
