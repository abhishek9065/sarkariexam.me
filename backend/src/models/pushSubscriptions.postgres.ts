import { randomUUID } from 'crypto';

import { prismaApp } from '../services/postgres/prisma.js';

interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PushSubscriptionRecord {
  id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

function toRecord(row: PushSubscriptionRow): PushSubscriptionRecord {
  return {
    id: row.id,
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth,
    },
    userId: row.userId || undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PushSubscriptionModelPostgres {
  static async upsert(input: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    userId?: string;
  }): Promise<PushSubscriptionRecord | null> {
    const row = await prismaApp.pushSubscriptionEntry.upsert({
      where: { endpoint: input.endpoint },
      create: {
        id: randomUUID(),
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userId: input.userId ?? null,
      },
      update: {
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userId: input.userId ?? null,
      },
    });

    return row ? toRecord(row) : null;
  }

  static async list(limit = 20, offset = 0): Promise<{
    data: PushSubscriptionRecord[];
    total: number;
    count: number;
  }> {
    const [rows, total] = await Promise.all([
      prismaApp.pushSubscriptionEntry.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prismaApp.pushSubscriptionEntry.count(),
    ]);

    const data = rows.map((row: PushSubscriptionRow) => toRecord(row));
    return { data, total, count: data.length };
  }

  static async listAll(): Promise<PushSubscriptionRecord[]> {
    const rows = await prismaApp.pushSubscriptionEntry.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row: PushSubscriptionRow) => toRecord(row));
  }
}

export default PushSubscriptionModelPostgres;
