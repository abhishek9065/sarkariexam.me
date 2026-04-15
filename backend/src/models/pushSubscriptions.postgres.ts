import { randomUUID } from 'crypto';

import { Prisma } from '@prisma/client';

import { ensurePushTables } from '../services/postgres/legacyTables.js';
import { prisma } from '../services/postgres/prisma.js';

interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id: string | null;
  created_at: Date;
  updated_at: Date;
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
    userId: row.user_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PushSubscriptionModelPostgres {
  static async upsert(input: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    userId?: string;
  }): Promise<PushSubscriptionRecord | null> {
    await ensurePushTables();

    const rows = await prisma.$queryRaw<PushSubscriptionRow[]>`
      INSERT INTO app_push_subscriptions (
        id,
        endpoint,
        p256dh,
        auth,
        user_id,
        created_at,
        updated_at
      ) VALUES (
        ${randomUUID()},
        ${input.endpoint},
        ${input.keys.p256dh},
        ${input.keys.auth},
        ${input.userId ?? null},
        NOW(),
        NOW()
      )
      ON CONFLICT (endpoint)
      DO UPDATE SET
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        user_id = EXCLUDED.user_id,
        updated_at = NOW()
      RETURNING id, endpoint, p256dh, auth, user_id, created_at, updated_at
    `;

    return rows[0] ? toRecord(rows[0]) : null;
  }

  static async list(limit = 20, offset = 0): Promise<{
    data: PushSubscriptionRecord[];
    total: number;
    count: number;
  }> {
    await ensurePushTables();

    const [rows, totalRows] = await Promise.all([
      prisma.$queryRaw<PushSubscriptionRow[]>(Prisma.sql`
        SELECT id, endpoint, p256dh, auth, user_id, created_at, updated_at
        FROM app_push_subscriptions
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `),
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count
        FROM app_push_subscriptions
      `,
    ]);

    const total = Number(totalRows[0]?.count || 0);
    const data = rows.map((row) => toRecord(row));
    return { data, total, count: data.length };
  }

  static async listAll(): Promise<PushSubscriptionRecord[]> {
    await ensurePushTables();

    const rows = await prisma.$queryRaw<PushSubscriptionRow[]>`
      SELECT id, endpoint, p256dh, auth, user_id, created_at, updated_at
      FROM app_push_subscriptions
      ORDER BY created_at DESC
    `;
    return rows.map((row) => toRecord(row));
  }
}

export default PushSubscriptionModelPostgres;