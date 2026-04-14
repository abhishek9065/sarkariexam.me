import type { Document, WithId } from 'mongodb';

import type { AuditLogRecord } from '../content/types.js';
import { getCollection } from '../services/cosmosdb.js';

interface AuditLogDoc extends Document {
  entityType: AuditLogRecord['entityType'];
  entityId: string;
  action: string;
  actorId?: string;
  actorRole?: string;
  summary: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export class AuditLogModelMongo {
  private static get collection() {
    return getCollection<AuditLogDoc>('audit_logs');
  }

  static async create(entry: Omit<AuditLogRecord, 'id' | 'createdAt'> & { createdAt?: Date | string }) {
    const doc: Omit<AuditLogDoc, '_id'> = {
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      actorId: entry.actorId,
      actorRole: entry.actorRole,
      summary: entry.summary,
      metadata: entry.metadata,
      createdAt: entry.createdAt ? new Date(entry.createdAt) : new Date(),
    };

    const result = await this.collection.insertOne(doc as AuditLogDoc);
    const inserted = await this.collection.findOne({ _id: result.insertedId });
    return inserted ? this.docToAuditLog(inserted) : null;
  }

  static async list(filters?: { entityId?: string; limit?: number; offset?: number }) {
    const query: Partial<AuditLogDoc> = {};
    if (filters?.entityId) {
      query.entityId = filters.entityId;
    }

    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;
    const docs = await this.collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    return docs.map((doc) => this.docToAuditLog(doc));
  }

  private static docToAuditLog(doc: WithId<AuditLogDoc>): AuditLogRecord {
    return {
      id: doc._id.toString(),
      entityType: doc.entityType,
      entityId: doc.entityId,
      action: doc.action,
      actorId: doc.actorId,
      actorRole: doc.actorRole,
      summary: doc.summary,
      metadata: doc.metadata,
      createdAt: doc.createdAt.toISOString(),
    };
  }
}

export default AuditLogModelMongo;
