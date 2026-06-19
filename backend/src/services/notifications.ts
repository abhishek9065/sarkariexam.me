import { randomUUID } from 'crypto';
import { hostname } from 'os';

import { PostType as PrismaPostType, type Prisma } from '@prisma/client';
import webpush from 'web-push';
import { z } from 'zod';

import { config } from '../config.js';
import CampaignDispatchLogModelPostgres, {
  type CampaignDispatchLogInput,
  type CampaignDispatchLogRecord,
} from '../models/campaignDispatchLogs.postgres.js';
import CampaignJobModelPostgres, { type CampaignJobRecord } from '../models/campaignJobs.postgres.js';
import NotificationCampaignModelPostgres, {
  type NotificationCampaignRecord,
  type NotificationCampaignSegmentType,
  type NotificationCampaignStatus,
} from '../models/notificationCampaigns.postgres.js';
import PushSubscriptionModelPostgres, { type PushSubscriptionRecord } from '../models/pushSubscriptions.postgres.js';
import { slugify } from '../utils/slugify.js';

import { sendCampaignEmail } from './email.js';
import { prisma, prismaApp } from './postgres/prisma.js';

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

interface CampaignRecipients {
  emailRecipients: EmailRecipient[];
  pushRecipients: PushSubscriptionRecord[];
}

const DEFAULT_CAMPAIGN_DELIVERY_CONCURRENCY = 10;
const DEFAULT_CAMPAIGN_SCHEDULER_INTERVAL_MS = 60_000;
const DEFAULT_CAMPAIGN_JOB_POLL_INTERVAL_MS = 1_000;
const DEFAULT_CAMPAIGN_JOB_LEASE_MS = 15 * 60_000;
const DEFAULT_CAMPAIGN_JOB_HEARTBEAT_MS = 30_000;

let campaignSchedulerInterval: NodeJS.Timeout | null = null;
let campaignSchedulerRunning = false;
let campaignWorkerInterval: NodeJS.Timeout | null = null;
let campaignWorkerRunning = false;
const campaignWorkerId = `${hostname()}:${process.pid}:${randomUUID()}`;

const parseBoundedInt = (value: string | undefined, fallback: number, min: number, max: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.round(parsed);
  return Math.min(max, Math.max(min, rounded));
};

const campaignRuntimeConfig = {
  deliveryConcurrency: parseBoundedInt(
    process.env.CAMPAIGN_DELIVERY_CONCURRENCY,
    DEFAULT_CAMPAIGN_DELIVERY_CONCURRENCY,
    1,
    50,
  ),
  schedulerIntervalMs: parseBoundedInt(
    process.env.CAMPAIGN_SCHEDULER_INTERVAL_MS,
    DEFAULT_CAMPAIGN_SCHEDULER_INTERVAL_MS,
    10_000,
    86_400_000,
  ),
  jobPollIntervalMs: parseBoundedInt(
    process.env.CAMPAIGN_JOB_POLL_INTERVAL_MS,
    DEFAULT_CAMPAIGN_JOB_POLL_INTERVAL_MS,
    250,
    60_000,
  ),
  jobLeaseMs: parseBoundedInt(
    process.env.CAMPAIGN_JOB_LEASE_MS,
    DEFAULT_CAMPAIGN_JOB_LEASE_MS,
    60_000,
    86_400_000,
  ),
  jobHeartbeatMs: parseBoundedInt(
    process.env.CAMPAIGN_JOB_HEARTBEAT_MS,
    DEFAULT_CAMPAIGN_JOB_HEARTBEAT_MS,
    5_000,
    300_000,
  ),
};

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

async function resolveUserIdsForEmails(emails: string[]): Promise<string[]> {
  const uniqueEmails = Array.from(new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean)));
  if (uniqueEmails.length === 0) {
    return [];
  }

  const users = await prismaApp.userAccountEntry.findMany({
    where: {
      email: { in: uniqueEmails, mode: 'insensitive' },
      isActive: true,
    },
    select: { id: true },
  });

  return users.map((user: { id: string }) => user.id);
}

async function resolveCampaignRecipients(campaign: NotificationCampaignRecord): Promise<CampaignRecipients> {
  const emailRecipients = await resolveEmailRecipients(campaign);
  const userIds = await resolveUserIdsForEmails(emailRecipients.map((recipient) => recipient.email));

  const pushRecipients = campaign.segment.type === 'all'
    ? await PushSubscriptionModelPostgres.listAll()
    : await PushSubscriptionModelPostgres.listForUserIds(userIds);

  return { emailRecipients, pushRecipients };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  handler: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }

  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, concurrency), items.length);

  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await handler(items[currentIndex]);
    }
  }));

  return results;
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
    const statusCode = typeof (error as { statusCode?: unknown }).statusCode === 'number'
      ? (error as { statusCode: number }).statusCode
      : undefined;
    if (statusCode === 404 || statusCode === 410) {
      await PushSubscriptionModelPostgres.deleteByEndpoint(subscription.endpoint).catch(() => undefined);
    }

    return {
      campaignId: campaign.id,
      channel: 'push',
      recipient: subscription.endpoint,
      recipientUserId: subscription.userId,
      pushEndpoint: subscription.endpoint,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Failed to send push notification',
      metadata: { source: 'campaign', statusCode },
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

    const { emailRecipients, pushRecipients } = await resolveCampaignRecipients(campaign);

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
type CampaignDeliveryResult = {
  success: boolean;
  error?: string;
  mode?: 'delivery';
  sentCount?: number;
  failedCount?: number;
  totals?: CampaignEstimate;
};

type CampaignQueueResult = {
  success: boolean;
  error?: string;
  mode?: 'delivery';
  status?: 'sending';
};

async function claimCampaign(
  campaignId: string,
  allowedStatuses: NotificationCampaignStatus[],
): Promise<{ campaign?: NotificationCampaignRecord; error?: string }> {
  const campaign = await NotificationCampaignModelPostgres.findById(campaignId);
  if (!campaign) {
    return { error: 'Campaign not found' };
  }

  if (campaign.unsupportedSegment) {
    await NotificationCampaignModelPostgres.markFailed(campaignId);
    return { error: 'Campaign segment is no longer supported' };
  }

  if (!allowedStatuses.includes(campaign.status)) {
    return { error: 'Campaign already processed' };
  }

  const claimed = await NotificationCampaignModelPostgres.markSending(campaignId, [campaign.status]);
  if (!claimed) {
    return { error: 'Campaign is already being processed' };
  }

  return { campaign };
}

async function validateCampaignForQueue(
  campaignId: string,
  allowedStatuses: NotificationCampaignStatus[],
): Promise<{ campaign?: NotificationCampaignRecord; error?: string }> {
  const campaign = await NotificationCampaignModelPostgres.findById(campaignId);
  if (!campaign) return { error: 'Campaign not found' };

  if (campaign.unsupportedSegment) {
    await NotificationCampaignModelPostgres.markFailed(campaignId);
    return { error: 'Campaign segment is no longer supported' };
  }

  if (!allowedStatuses.includes(campaign.status)) {
    return { error: 'Campaign already processed' };
  }

  return { campaign };
}

async function deliverClaimedCampaign(campaign: NotificationCampaignRecord): Promise<CampaignDeliveryResult> {
  const campaignId = campaign.id;
  try {
    const { emailRecipients, pushRecipients } = await resolveCampaignRecipients(campaign);

    const vapidConfigured = configureWebPush();
    const emailLogs = await mapWithConcurrency(
      emailRecipients,
      campaignRuntimeConfig.deliveryConcurrency,
      (recipient) => dispatchEmail(campaign, recipient),
    );
    const pushLogs = await mapWithConcurrency(
      pushRecipients,
      campaignRuntimeConfig.deliveryConcurrency,
      (subscription) => dispatchPush(campaign, subscription, { vapidConfigured }),
    );
    const dispatchLogs: CampaignDispatchLogInput[] = [...emailLogs, ...pushLogs];

    await CampaignDispatchLogModelPostgres.createMany(dispatchLogs);
    const summary = summarizeDispatch(dispatchLogs);
    const totals = {
      email: emailRecipients.length,
      push: pushRecipients.length,
      total: emailRecipients.length + pushRecipients.length,
    };

    if (summary.sent > 0 && summary.failed > 0) {
      await NotificationCampaignModelPostgres.markPartialFailed(campaignId, summary.sent, summary.failed);
    } else if (summary.sent > 0) {
      await NotificationCampaignModelPostgres.markSent(campaignId, summary.sent, 0);
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

export async function sendCampaign(campaignId: string): Promise<CampaignDeliveryResult> {
  try {
    const claim = await claimCampaign(campaignId, ['draft', 'scheduled', 'failed']);
    if (!claim.campaign) {
      return { success: false, error: claim.error };
    }

    return await deliverClaimedCampaign(claim.campaign);
  } catch (error) {
    console.error('[NotificationService] Error claiming campaign:', error);
    return { success: false, error: 'Failed to send campaign' };
  }
}

export async function queueCampaignDelivery(campaignId: string): Promise<CampaignQueueResult> {
  try {
    const validation = await validateCampaignForQueue(campaignId, ['draft', 'scheduled', 'failed']);
    if (!validation.campaign) return { success: false, error: validation.error };

    const queued = await CampaignJobModelPostgres.enqueue(campaignId, 'send', validation.campaign.status);
    if (!queued) return { success: false, error: 'Campaign is already being processed' };
    return { success: true, mode: 'delivery', status: 'sending' };
  } catch (error) {
    console.error('[NotificationService] Error queueing campaign:', error);
    return { success: false, error: 'Failed to queue campaign' };
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

type CampaignRetryResult = {
  success: boolean;
  error?: string;
  mode?: 'delivery';
  retried?: number;
  sentCount?: number;
  failedCount?: number;
};

async function retryClaimedCampaign(campaign: NotificationCampaignRecord): Promise<CampaignRetryResult> {
  const campaignId = campaign.id;
  try {
    const failedLogs = await CampaignDispatchLogModelPostgres.listFailed(campaignId);
    if (failedLogs.length === 0) {
      const stats = await CampaignDispatchLogModelPostgres.stats(campaignId);
      if (stats.sent > 0) {
        await NotificationCampaignModelPostgres.markSent(campaignId, stats.sent, 0);
      } else {
        await NotificationCampaignModelPostgres.markFailed(campaignId, { sentCount: 0, failedCount: 0 });
      }
      return { success: true, mode: 'delivery', retried: 0, sentCount: 0, failedCount: 0 };
    }

    const retryLogs = await mapWithConcurrency(
      failedLogs,
      campaignRuntimeConfig.deliveryConcurrency,
      (log) => log.channel === 'email' ? retryEmailLog(campaign, log) : retryPushLog(campaign, log),
    );

    await CampaignDispatchLogModelPostgres.createMany(retryLogs);
    const summary = summarizeDispatch(retryLogs);
    const allStats = await CampaignDispatchLogModelPostgres.stats(campaignId);

    if (allStats.sent > 0 && allStats.failed > 0) {
      await NotificationCampaignModelPostgres.markPartialFailed(campaignId, allStats.sent, allStats.failed);
    } else if (allStats.sent > 0) {
      await NotificationCampaignModelPostgres.markSent(campaignId, allStats.sent, 0);
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

export async function retryFailedCampaign(campaignId: string): Promise<CampaignRetryResult> {
  try {
    const claim = await claimCampaign(campaignId, ['failed', 'partial_failed']);
    if (!claim.campaign) return { success: false, error: claim.error };

    return await retryClaimedCampaign(claim.campaign);
  } catch (error) {
    console.error('[NotificationService] Error claiming campaign retry:', error);
    return { success: false, error: 'Failed to retry campaign' };
  }
}

export async function queueFailedCampaignRetry(campaignId: string): Promise<CampaignQueueResult> {
  try {
    const validation = await validateCampaignForQueue(campaignId, ['failed', 'partial_failed']);
    if (!validation.campaign) return { success: false, error: validation.error };

    const queued = await CampaignJobModelPostgres.enqueue(campaignId, 'retry', validation.campaign.status);
    if (!queued) return { success: false, error: 'Campaign is already being processed' };
    return { success: true, mode: 'delivery', status: 'sending' };
  } catch (error) {
    console.error('[NotificationService] Error queueing campaign retry:', error);
    return { success: false, error: 'Failed to queue campaign retry' };
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

    let queued = 0;
    for (const campaign of scheduled) {
      const result = await queueCampaignDelivery(campaign.id);
      if (result.success) queued += 1;
    }

    return queued;
  } catch (error) {
    console.error('[NotificationService] Error processing scheduled campaigns:', error);
    return 0;
  }
}

async function processClaimedCampaignJob(job: CampaignJobRecord): Promise<void> {
  const campaign = await NotificationCampaignModelPostgres.findById(job.campaignId);
  if (!campaign) {
    await CampaignJobModelPostgres.markFailed(job.id, campaignWorkerId, 'Campaign not found');
    return;
  }
  if (campaign.status !== 'sending') {
    if (campaign.status === 'sent' || campaign.status === 'partial_failed') {
      await CampaignJobModelPostgres.markCompleted(job.id, campaignWorkerId);
    } else {
      await CampaignJobModelPostgres.markFailed(
        job.id,
        campaignWorkerId,
        `Campaign has terminal status ${campaign.status}`,
      );
    }
    return;
  }

  const heartbeatMs = Math.min(campaignRuntimeConfig.jobHeartbeatMs, Math.floor(campaignRuntimeConfig.jobLeaseMs / 3));
  const heartbeat = setInterval(() => {
    CampaignJobModelPostgres.heartbeat(job.id, campaignWorkerId).catch((error) => {
      console.error('[NotificationService] Campaign job heartbeat failed', {
        campaignId: job.campaignId,
        jobId: job.id,
        error,
      });
    });
  }, heartbeatMs);

  try {
    const result = job.jobType === 'retry'
      ? await retryClaimedCampaign(campaign)
      : await deliverClaimedCampaign(campaign);

    if (result.success) {
      await CampaignJobModelPostgres.markCompleted(job.id, campaignWorkerId);
      return;
    }

    await CampaignJobModelPostgres.markFailed(
      job.id,
      campaignWorkerId,
      result.error ?? 'Campaign job failed',
    );
  } finally {
    clearInterval(heartbeat);
  }
}

async function runCampaignWorkerCycle(): Promise<void> {
  if (campaignWorkerRunning) return;
  campaignWorkerRunning = true;

  try {
    const staleBefore = new Date(Date.now() - campaignRuntimeConfig.jobLeaseMs);
    const exhaustedCampaignIds = await CampaignJobModelPostgres.failExhausted(staleBefore);
    await Promise.all(exhaustedCampaignIds.map((campaignId) =>
      NotificationCampaignModelPostgres.markFailed(campaignId),
    ));

    let job = await CampaignJobModelPostgres.claimNext(campaignWorkerId, staleBefore);
    while (job) {
      try {
        await processClaimedCampaignJob(job);
      } catch (error) {
        console.error('[NotificationService] Campaign worker job failed', {
          campaignId: job.campaignId,
          jobId: job.id,
          error,
        });
        await CampaignJobModelPostgres.markFailed(
          job.id,
          campaignWorkerId,
          error instanceof Error ? error.message : 'Unexpected campaign worker error',
        ).catch(() => undefined);
        await NotificationCampaignModelPostgres.markFailed(job.campaignId).catch(() => undefined);
      }
      job = await CampaignJobModelPostgres.claimNext(campaignWorkerId, staleBefore);
    }
  } catch (error) {
    console.error('[NotificationService] Campaign worker cycle failed:', error);
  } finally {
    campaignWorkerRunning = false;
  }
}

export function startCampaignJobWorker(): void {
  if (campaignWorkerInterval) return;
  void runCampaignWorkerCycle();
  campaignWorkerInterval = setInterval(() => {
    void runCampaignWorkerCycle();
  }, campaignRuntimeConfig.jobPollIntervalMs);
}

async function runScheduledCampaignCycle(): Promise<void> {
  if (campaignSchedulerRunning) return;
  campaignSchedulerRunning = true;
  try {
    const processed = await processScheduledCampaigns();
    if (processed > 0) {
      console.log(`[NotificationService] Scheduled campaign run complete: processed=${processed}`);
    }
  } catch (error) {
    console.error('[NotificationService] Scheduled campaign cycle failed:', error);
  } finally {
    campaignSchedulerRunning = false;
  }
}

export function scheduleCampaignProcessor(): void {
  if (campaignSchedulerInterval) return;
  startCampaignJobWorker();
  runScheduledCampaignCycle().catch((error) => {
    console.error('[NotificationService] Initial scheduled campaign run failed:', error);
  });
  campaignSchedulerInterval = setInterval(() => {
    runScheduledCampaignCycle().catch((error) => {
      console.error('[NotificationService] Scheduled campaign run failed:', error);
    });
  }, campaignRuntimeConfig.schedulerIntervalMs);
}

export async function stopCampaignProcessor(): Promise<void> {
  if (campaignSchedulerInterval) {
    clearInterval(campaignSchedulerInterval);
    campaignSchedulerInterval = null;
  }
  if (campaignWorkerInterval) {
    clearInterval(campaignWorkerInterval);
    campaignWorkerInterval = null;
  }
  while (campaignSchedulerRunning || campaignWorkerRunning) {
    await new Promise((resolve) => setTimeout(resolve, 100));
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
  queueCampaignDelivery,
  queueFailedCampaignRetry,
  scheduleCampaignProcessor,
  startCampaignJobWorker,
  stopCampaignProcessor,
};

export default notificationService;
