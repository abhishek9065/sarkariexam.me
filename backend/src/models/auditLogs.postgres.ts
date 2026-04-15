import { Prisma } from '@prisma/client';
import type { AuditLog } from '@prisma/client';

import type { AuditLogRecord } from '../content/types.js';
import { prisma } from '../services/postgres/prisma.js';

function asMetadata(value: Prisma.JsonValue | null): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function toAuditLogRecord(row: AuditLog): AuditLogRecord {
  return {
    id: row.id,
    entityType: row.entityType as AuditLogRecord['entityType'],
    entityId: row.entityId,
    action: row.action,
    actorId: row.actorId || undefined,
    actorRole: row.actorRole || undefined,
    summary: row.summary,
    metadata: asMetadata(row.metadata),
    createdAt: row.createdAt.toISOString(),
  };
}

export class AuditLogModelPostgres {
  static async create(entry: Omit<AuditLogRecord, 'id' | 'createdAt'> & { createdAt?: Date | string; postId?: string }) {
    const createdAt = entry.createdAt ? new Date(entry.createdAt) : new Date();
    const postId = entry.postId || (['post', 'workflow'].includes(entry.entityType) ? entry.entityId : undefined);

    const row = await prisma.auditLog.create({
      data: {
        entityType: entry.entityType,
        entityId: entry.entityId,
        postId: postId || null,
        action: entry.action,
        actorId: entry.actorId || null,
        actorRole: entry.actorRole || null,
        summary: entry.summary,
        metadata: (entry.metadata as Prisma.InputJsonValue | undefined) || Prisma.JsonNull,
        createdAt,
      },
    });

    return toAuditLogRecord(row);
  }

  static async list(filters?: { entityId?: string; limit?: number; offset?: number }) {
    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;

    const rows = await prisma.auditLog.findMany({
      where: filters?.entityId ? { entityId: filters.entityId } : undefined,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    return rows.map((row) => toAuditLogRecord(row));
  }
}

export default AuditLogModelPostgres;
