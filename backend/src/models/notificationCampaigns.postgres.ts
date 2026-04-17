import { randomUUID } from 'crypto';

import { prismaApp } from '../services/postgres/prisma.js';

export type NotificationCampaignSegmentType =
  | 'all'
  | 'state'
  | 'category'
  | 'organization'
  | 'qualification'
  | 'type'
  | 'language';

export type NotificationCampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'failed';

export interface NotificationCampaignRecord {
  id: string;
  title: string;
  body: string;
  url?: string;
  segment: {
    type: NotificationCampaignSegmentType;
    value: string;
  };
  status: NotificationCampaignStatus;
  sentCount: number;
  failedCount: number;
  openCount: number;
  clickCount: number;
  scheduledAt?: Date;
  sentAt?: Date;
  createdBy: string;
  createdAt: Date;
  abTest?: {
    enabled: boolean;
    variantA?: { title: string; body: string };
    variantB?: { title: string; body: string };
  };
}

interface NotificationCampaignRow {
  id: string;
  title: string;
  body: string;
  url: string | null;
  segmentType: string;
  segmentValue: string;
  status: string;
  sentCount: number;
  failedCount: number;
  openCount: number;
  clickCount: number;
  scheduledAt: Date | null;
  sentAt: Date | null;
  createdBy: string;
  createdAt: Date;
  abTest: unknown;
}

function asSegmentType(value: string): NotificationCampaignSegmentType {
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

function asStatus(value: string): NotificationCampaignStatus {
  if (
    value === 'draft' ||
    value === 'scheduled' ||
    value === 'sending' ||
    value === 'sent' ||
    value === 'failed'
  ) {
    return value;
  }
  return 'draft';
}

function asVariant(value: unknown): { title: string; body: string } | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const maybeVariant = value as { title?: unknown; body?: unknown };
  if (typeof maybeVariant.title !== 'string' || typeof maybeVariant.body !== 'string') {
    return undefined;
  }

  return {
    title: maybeVariant.title,
    body: maybeVariant.body,
  };
}

function asAbTest(value: unknown): NotificationCampaignRecord['abTest'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const maybeAbTest = value as {
    enabled?: unknown;
    variantA?: unknown;
    variantB?: unknown;
  };

  return {
    enabled: Boolean(maybeAbTest.enabled),
    variantA: asVariant(maybeAbTest.variantA),
    variantB: asVariant(maybeAbTest.variantB),
  };
}

function toRecord(row: NotificationCampaignRow): NotificationCampaignRecord {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    url: row.url || undefined,
    segment: {
      type: asSegmentType(row.segmentType),
      value: row.segmentValue,
    },
    status: asStatus(row.status),
    sentCount: row.sentCount,
    failedCount: row.failedCount,
    openCount: row.openCount,
    clickCount: row.clickCount,
    scheduledAt: row.scheduledAt || undefined,
    sentAt: row.sentAt || undefined,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    abTest: asAbTest(row.abTest),
  };
}

export class NotificationCampaignModelPostgres {
  static async create(
    input: {
      title: string;
      body: string;
      url?: string;
      segment: { type: NotificationCampaignSegmentType; value: string };
      scheduledAt?: Date;
      abTest?: NotificationCampaignRecord['abTest'];
    },
    userId: string,
  ): Promise<NotificationCampaignRecord | null> {
    const id = randomUUID();
    const status: NotificationCampaignStatus = input.scheduledAt ? 'scheduled' : 'draft';
    await prismaApp.notificationCampaignEntry.create({
      data: {
        id,
        title: input.title,
        body: input.body,
        url: input.url || null,
        segmentType: input.segment.type,
        segmentValue: input.segment.value,
        status,
        sentCount: 0,
        failedCount: 0,
        openCount: 0,
        clickCount: 0,
        scheduledAt: input.scheduledAt || null,
        sentAt: null,
        createdBy: userId,
        abTest: input.abTest ?? null,
      },
    });

    return this.findById(id);
  }

  static async list(limit = 50): Promise<NotificationCampaignRecord[]> {
    const rows = await prismaApp.notificationCampaignEntry.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return rows.map((row) => toRecord(row));
  }

  static async findById(id: string): Promise<NotificationCampaignRecord | null> {
    const row = await prismaApp.notificationCampaignEntry.findUnique({
      where: { id },
    });
    return row ? toRecord(row) : null;
  }

  static async markSending(id: string): Promise<boolean> {
    const updated = await prismaApp.notificationCampaignEntry.updateMany({
      where: { id },
      data: { status: 'sending' },
    });
    return updated.count > 0;
  }

  static async markSent(id: string, sentCount: number): Promise<boolean> {
    const updated = await prismaApp.notificationCampaignEntry.updateMany({
      where: { id },
      data: {
        status: 'sent',
        sentAt: new Date(),
        sentCount,
      },
    });
    return updated.count > 0;
  }

  static async markFailed(id: string): Promise<boolean> {
    const updated = await prismaApp.notificationCampaignEntry.updateMany({
      where: { id },
      data: { status: 'failed' },
    });
    return updated.count > 0;
  }

  static async schedule(id: string, scheduledAt: Date): Promise<boolean> {
    const updated = await prismaApp.notificationCampaignEntry.updateMany({
      where: { id },
      data: {
        scheduledAt,
        status: 'scheduled',
      },
    });
    return updated.count > 0;
  }

  static async remove(id: string): Promise<boolean> {
    const deleted = await prismaApp.notificationCampaignEntry.deleteMany({
      where: { id },
    });
    return deleted.count > 0;
  }

  static async listScheduledDue(now: Date): Promise<NotificationCampaignRecord[]> {
    const rows = await prismaApp.notificationCampaignEntry.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: {
          lte: now,
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return rows.map((row) => toRecord(row));
  }
}

export default NotificationCampaignModelPostgres;
