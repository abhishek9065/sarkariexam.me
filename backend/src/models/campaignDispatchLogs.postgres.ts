import { randomUUID } from 'crypto';
import type { Prisma } from '@prisma/client';

import { prismaApp } from '../services/postgres/prisma.js';

export type CampaignDispatchChannel = 'email' | 'push';
export type CampaignDispatchStatus = 'pending' | 'sent' | 'failed';

export interface CampaignDispatchLogRecord {
  id: string;
  campaignId: string;
  channel: CampaignDispatchChannel;
  recipient: string;
  recipientUserId?: string;
  subscriptionId?: string;
  pushEndpoint?: string;
  status: CampaignDispatchStatus;
  messageId?: string;
  error?: string;
  metadata?: unknown;
  attemptCount: number;
  lastAttemptAt: Date;
  deliveredAt?: Date;
  createdAt: Date;
}

export interface CampaignDispatchLogInput {
  campaignId: string;
  channel: CampaignDispatchChannel;
  recipient: string;
  recipientUserId?: string;
  subscriptionId?: string;
  pushEndpoint?: string;
  status: CampaignDispatchStatus;
  messageId?: string;
  error?: string;
  metadata?: Prisma.InputJsonValue;
  attemptCount?: number;
  deliveredAt?: Date;
}

interface CampaignDispatchLogRow {
  id: string;
  campaignId: string;
  channel: string;
  recipient: string;
  recipientUserId: string | null;
  subscriptionId: string | null;
  pushEndpoint: string | null;
  status: string;
  messageId: string | null;
  error: string | null;
  metadata: unknown;
  attemptCount: number;
  lastAttemptAt: Date;
  deliveredAt: Date | null;
  createdAt: Date;
}

function asChannel(value: string): CampaignDispatchChannel {
  return value === 'push' ? 'push' : 'email';
}

function asStatus(value: string): CampaignDispatchStatus {
  if (value === 'sent' || value === 'failed') {
    return value;
  }
  return 'pending';
}

function toRecord(row: CampaignDispatchLogRow): CampaignDispatchLogRecord {
  return {
    id: row.id,
    campaignId: row.campaignId,
    channel: asChannel(row.channel),
    recipient: row.recipient,
    recipientUserId: row.recipientUserId || undefined,
    subscriptionId: row.subscriptionId || undefined,
    pushEndpoint: row.pushEndpoint || undefined,
    status: asStatus(row.status),
    messageId: row.messageId || undefined,
    error: row.error || undefined,
    metadata: row.metadata ?? undefined,
    attemptCount: row.attemptCount,
    lastAttemptAt: row.lastAttemptAt,
    deliveredAt: row.deliveredAt || undefined,
    createdAt: row.createdAt,
  };
}

export class CampaignDispatchLogModelPostgres {
  static async create(input: CampaignDispatchLogInput): Promise<CampaignDispatchLogRecord> {
    const row = await prismaApp.campaignDispatchLogEntry.create({
      data: {
        id: randomUUID(),
        campaignId: input.campaignId,
        channel: input.channel,
        recipient: input.recipient,
        recipientUserId: input.recipientUserId ?? null,
        subscriptionId: input.subscriptionId ?? null,
        pushEndpoint: input.pushEndpoint ?? null,
        status: input.status,
        messageId: input.messageId ?? null,
        error: input.error ?? null,
        metadata: input.metadata ?? null,
        attemptCount: input.attemptCount ?? 1,
        deliveredAt: input.deliveredAt ?? null,
      },
    });

    return toRecord(row);
  }

  static async createMany(inputs: CampaignDispatchLogInput[]): Promise<number> {
    if (inputs.length === 0) {
      return 0;
    }

    const result = await prismaApp.campaignDispatchLogEntry.createMany({
      data: inputs.map((input) => ({
        id: randomUUID(),
        campaignId: input.campaignId,
        channel: input.channel,
        recipient: input.recipient,
        recipientUserId: input.recipientUserId ?? null,
        subscriptionId: input.subscriptionId ?? null,
        pushEndpoint: input.pushEndpoint ?? null,
        status: input.status,
        messageId: input.messageId ?? null,
        error: input.error ?? null,
        metadata: input.metadata ?? null,
        attemptCount: input.attemptCount ?? 1,
        deliveredAt: input.deliveredAt ?? null,
      })),
    });

    return result.count;
  }

  static async listFailed(campaignId: string, limit = 500): Promise<CampaignDispatchLogRecord[]> {
    const rows = await prismaApp.campaignDispatchLogEntry.findMany({
      where: { campaignId, status: 'failed' },
      orderBy: { lastAttemptAt: 'asc' },
      take: limit,
    });

    return rows.map((row) => toRecord(row));
  }

  static async stats(campaignId: string): Promise<{
    total: number;
    sent: number;
    failed: number;
    byChannel: Array<{ channel: CampaignDispatchChannel; sent: number; failed: number; total: number }>;
    recentFailures: CampaignDispatchLogRecord[];
  }> {
    const [groups, recentFailures] = await Promise.all([
      prismaApp.campaignDispatchLogEntry.groupBy({
        by: ['channel', 'status'],
        where: { campaignId },
        _count: { _all: true },
      }),
      prismaApp.campaignDispatchLogEntry.findMany({
        where: { campaignId, status: 'failed' },
        orderBy: { lastAttemptAt: 'desc' },
        take: 25,
      }),
    ]);

    const channelMap = new Map<CampaignDispatchChannel, { channel: CampaignDispatchChannel; sent: number; failed: number; total: number }>();
    let sent = 0;
    let failed = 0;
    let total = 0;

    for (const group of groups) {
      const channel = asChannel(group.channel);
      const status = asStatus(group.status);
      const count = group._count._all;
      const entry = channelMap.get(channel) ?? { channel, sent: 0, failed: 0, total: 0 };
      entry.total += count;
      total += count;
      if (status === 'sent') {
        entry.sent += count;
        sent += count;
      }
      if (status === 'failed') {
        entry.failed += count;
        failed += count;
      }
      channelMap.set(channel, entry);
    }

    return {
      total,
      sent,
      failed,
      byChannel: Array.from(channelMap.values()),
      recentFailures: recentFailures.map((row) => toRecord(row)),
    };
  }
}

export default CampaignDispatchLogModelPostgres;
