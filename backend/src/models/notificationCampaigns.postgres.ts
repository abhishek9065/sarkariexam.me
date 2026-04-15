import { randomUUID } from 'crypto';

import { Prisma } from '@prisma/client';

import { ensureNotificationCampaignsTable } from '../services/postgres/legacyTables.js';
import { prisma } from '../services/postgres/prisma.js';

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
  segment_type: string;
  segment_value: string;
  status: string;
  sent_count: number;
  failed_count: number;
  open_count: number;
  click_count: number;
  scheduled_at: Date | null;
  sent_at: Date | null;
  created_by: string;
  created_at: Date;
  ab_test: unknown;
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
      type: asSegmentType(row.segment_type),
      value: row.segment_value,
    },
    status: asStatus(row.status),
    sentCount: row.sent_count,
    failedCount: row.failed_count,
    openCount: row.open_count,
    clickCount: row.click_count,
    scheduledAt: row.scheduled_at || undefined,
    sentAt: row.sent_at || undefined,
    createdBy: row.created_by,
    createdAt: row.created_at,
    abTest: asAbTest(row.ab_test),
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
    await ensureNotificationCampaignsTable();

    const id = randomUUID();
    const status: NotificationCampaignStatus = input.scheduledAt ? 'scheduled' : 'draft';

    if (input.abTest) {
      await prisma.$executeRaw`
        INSERT INTO app_notification_campaigns (
          id,
          title,
          body,
          url,
          segment_type,
          segment_value,
          status,
          sent_count,
          failed_count,
          open_count,
          click_count,
          scheduled_at,
          sent_at,
          created_by,
          created_at,
          ab_test
        ) VALUES (
          ${id},
          ${input.title},
          ${input.body},
          ${input.url || null},
          ${input.segment.type},
          ${input.segment.value},
          ${status},
          ${0},
          ${0},
          ${0},
          ${0},
          ${input.scheduledAt || null},
          ${null},
          ${userId},
          NOW(),
          ${JSON.stringify(input.abTest)}::jsonb
        )
      `;
    } else {
      await prisma.$executeRaw`
        INSERT INTO app_notification_campaigns (
          id,
          title,
          body,
          url,
          segment_type,
          segment_value,
          status,
          sent_count,
          failed_count,
          open_count,
          click_count,
          scheduled_at,
          sent_at,
          created_by,
          created_at,
          ab_test
        ) VALUES (
          ${id},
          ${input.title},
          ${input.body},
          ${input.url || null},
          ${input.segment.type},
          ${input.segment.value},
          ${status},
          ${0},
          ${0},
          ${0},
          ${0},
          ${input.scheduledAt || null},
          ${null},
          ${userId},
          NOW(),
          ${null}
        )
      `;
    }

    return this.findById(id);
  }

  static async list(limit = 50): Promise<NotificationCampaignRecord[]> {
    await ensureNotificationCampaignsTable();

    const rows = await prisma.$queryRaw<NotificationCampaignRow[]>(Prisma.sql`
      SELECT
        id,
        title,
        body,
        url,
        segment_type,
        segment_value,
        status,
        sent_count,
        failed_count,
        open_count,
        click_count,
        scheduled_at,
        sent_at,
        created_by,
        created_at,
        ab_test
      FROM app_notification_campaigns
      ORDER BY created_at DESC
      LIMIT ${limit}
    `);

    return rows.map((row) => toRecord(row));
  }

  static async findById(id: string): Promise<NotificationCampaignRecord | null> {
    await ensureNotificationCampaignsTable();

    const rows = await prisma.$queryRaw<NotificationCampaignRow[]>`
      SELECT
        id,
        title,
        body,
        url,
        segment_type,
        segment_value,
        status,
        sent_count,
        failed_count,
        open_count,
        click_count,
        scheduled_at,
        sent_at,
        created_by,
        created_at,
        ab_test
      FROM app_notification_campaigns
      WHERE id = ${id}
      LIMIT 1
    `;

    return rows[0] ? toRecord(rows[0]) : null;
  }

  static async markSending(id: string): Promise<boolean> {
    await ensureNotificationCampaignsTable();

    const updated = await prisma.$executeRaw`
      UPDATE app_notification_campaigns
      SET status = ${'sending'}
      WHERE id = ${id}
    `;

    return Number(updated) > 0;
  }

  static async markSent(id: string, sentCount: number): Promise<boolean> {
    await ensureNotificationCampaignsTable();

    const updated = await prisma.$executeRaw`
      UPDATE app_notification_campaigns
      SET
        status = ${'sent'},
        sent_at = NOW(),
        sent_count = ${sentCount}
      WHERE id = ${id}
    `;

    return Number(updated) > 0;
  }

  static async markFailed(id: string): Promise<boolean> {
    await ensureNotificationCampaignsTable();

    const updated = await prisma.$executeRaw`
      UPDATE app_notification_campaigns
      SET status = ${'failed'}
      WHERE id = ${id}
    `;

    return Number(updated) > 0;
  }

  static async schedule(id: string, scheduledAt: Date): Promise<boolean> {
    await ensureNotificationCampaignsTable();

    const updated = await prisma.$executeRaw`
      UPDATE app_notification_campaigns
      SET
        scheduled_at = ${scheduledAt},
        status = ${'scheduled'}
      WHERE id = ${id}
    `;

    return Number(updated) > 0;
  }

  static async remove(id: string): Promise<boolean> {
    await ensureNotificationCampaignsTable();

    const deleted = await prisma.$executeRaw`
      DELETE FROM app_notification_campaigns
      WHERE id = ${id}
    `;

    return Number(deleted) > 0;
  }

  static async listScheduledDue(now: Date): Promise<NotificationCampaignRecord[]> {
    await ensureNotificationCampaignsTable();

    const rows = await prisma.$queryRaw<NotificationCampaignRow[]>`
      SELECT
        id,
        title,
        body,
        url,
        segment_type,
        segment_value,
        status,
        sent_count,
        failed_count,
        open_count,
        click_count,
        scheduled_at,
        sent_at,
        created_by,
        created_at,
        ab_test
      FROM app_notification_campaigns
      WHERE status = ${'scheduled'}
        AND scheduled_at <= ${now}
      ORDER BY scheduled_at ASC
    `;

    return rows.map((row) => toRecord(row));
  }
}

export default NotificationCampaignModelPostgres;
