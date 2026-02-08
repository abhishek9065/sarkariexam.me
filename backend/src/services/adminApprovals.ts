import crypto from 'crypto';
import { ObjectId } from 'mongodb';

import { config } from '../config.js';
import { getCollection } from './cosmosdb.js';

export type AdminApprovalStatus = 'pending' | 'approved' | 'rejected' | 'executed' | 'expired';
export type AdminApprovalActionType =
  | 'announcement_publish'
  | 'announcement_bulk_publish'
  | 'announcement_delete';

interface AdminApprovalDoc {
  actionType: AdminApprovalActionType;
  requestHash: string;
  endpoint: string;
  method: string;
  targetIds: string[];
  payload?: Record<string, any>;
  status: AdminApprovalStatus;
  requestedByUserId: string;
  requestedByEmail: string;
  requestedByRole?: string;
  requestedAt: Date;
  expiresAt: Date;
  note?: string;
  approvedAt?: Date;
  approvedByUserId?: string;
  approvedByEmail?: string;
  rejectedAt?: Date;
  rejectedByUserId?: string;
  rejectedByEmail?: string;
  rejectionReason?: string;
  executedAt?: Date;
  executedByUserId?: string;
  executedByEmail?: string;
}

export interface AdminApprovalRequest {
  id: string;
  actionType: AdminApprovalActionType;
  requestHash: string;
  endpoint: string;
  method: string;
  targetIds: string[];
  payload?: Record<string, any>;
  status: AdminApprovalStatus;
  requestedByUserId: string;
  requestedByEmail: string;
  requestedByRole?: string;
  requestedAt: string;
  expiresAt: string;
  note?: string;
  approvedAt?: string;
  approvedByUserId?: string;
  approvedByEmail?: string;
  rejectedAt?: string;
  rejectedByUserId?: string;
  rejectedByEmail?: string;
  rejectionReason?: string;
  executedAt?: string;
  executedByUserId?: string;
  executedByEmail?: string;
}

const approvalsCollection = () => getCollection<AdminApprovalDoc>('admin_approval_requests');
let cleanupIntervalRef: NodeJS.Timeout | null = null;

const stableStringify = (value: any): string => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `"${key}":${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

export const createApprovalRequestHash = (input: {
  actionType: AdminApprovalActionType;
  endpoint: string;
  method: string;
  targetIds: string[];
  payload?: Record<string, any>;
}) => {
  const fingerprint = stableStringify({
    actionType: input.actionType,
    endpoint: input.endpoint,
    method: input.method.toUpperCase(),
    targetIds: [...input.targetIds].sort(),
    payload: input.payload ?? {},
  });
  return crypto.createHash('sha256').update(fingerprint).digest('hex');
};

const mapDoc = (doc: AdminApprovalDoc & { _id: ObjectId }): AdminApprovalRequest => ({
  id: doc._id.toString(),
  actionType: doc.actionType,
  requestHash: doc.requestHash,
  endpoint: doc.endpoint,
  method: doc.method,
  targetIds: doc.targetIds ?? [],
  payload: doc.payload,
  status: doc.status,
  requestedByUserId: doc.requestedByUserId,
  requestedByEmail: doc.requestedByEmail,
  requestedByRole: doc.requestedByRole,
  requestedAt: doc.requestedAt.toISOString(),
  expiresAt: doc.expiresAt.toISOString(),
  note: doc.note,
  approvedAt: doc.approvedAt?.toISOString(),
  approvedByUserId: doc.approvedByUserId,
  approvedByEmail: doc.approvedByEmail,
  rejectedAt: doc.rejectedAt?.toISOString(),
  rejectedByUserId: doc.rejectedByUserId,
  rejectedByEmail: doc.rejectedByEmail,
  rejectionReason: doc.rejectionReason,
  executedAt: doc.executedAt?.toISOString(),
  executedByUserId: doc.executedByUserId,
  executedByEmail: doc.executedByEmail,
});

const markExpiredIfNeeded = async (doc: AdminApprovalRequest): Promise<AdminApprovalRequest> => {
  if (doc.status !== 'pending') return doc;
  if (new Date(doc.expiresAt).getTime() > Date.now()) return doc;
  await approvalsCollection().updateOne(
    { _id: new ObjectId(doc.id), status: 'pending' },
    { $set: { status: 'expired' as AdminApprovalStatus } }
  );
  return { ...doc, status: 'expired' };
};

export const createAdminApprovalRequest = async (input: {
  actionType: AdminApprovalActionType;
  endpoint: string;
  method: string;
  targetIds: string[];
  payload?: Record<string, any>;
  note?: string;
  requestedBy: {
    userId: string;
    email: string;
    role?: string;
  };
}): Promise<AdminApprovalRequest> => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.adminApprovalExpiryMinutes * 60 * 1000);
  const requestHash = createApprovalRequestHash({
    actionType: input.actionType,
    endpoint: input.endpoint,
    method: input.method,
    targetIds: input.targetIds,
    payload: input.payload,
  });

  const result = await approvalsCollection().insertOne({
    actionType: input.actionType,
    requestHash,
    endpoint: input.endpoint,
    method: input.method.toUpperCase(),
    targetIds: input.targetIds,
    payload: input.payload ?? {},
    status: 'pending',
    requestedByUserId: input.requestedBy.userId,
    requestedByEmail: input.requestedBy.email,
    requestedByRole: input.requestedBy.role,
    requestedAt: now,
    expiresAt,
    note: input.note?.trim() || undefined,
  } as AdminApprovalDoc);

  const saved = await approvalsCollection().findOne({ _id: result.insertedId });
  if (!saved) {
    throw new Error('Failed to create approval request');
  }
  return mapDoc(saved as any);
};

export const getAdminApprovalRequest = async (id: string): Promise<AdminApprovalRequest | null> => {
  if (!ObjectId.isValid(id)) return null;
  const doc = await approvalsCollection().findOne({ _id: new ObjectId(id) });
  if (!doc) return null;
  return markExpiredIfNeeded(mapDoc(doc as any));
};

export const listAdminApprovalRequests = async (options?: {
  status?: AdminApprovalStatus | 'all';
  limit?: number;
  offset?: number;
  requestedByUserId?: string;
}): Promise<{ data: AdminApprovalRequest[]; total: number }> => {
  const limit = Math.min(200, options?.limit ?? 50);
  const offset = Math.max(0, options?.offset ?? 0);
  const query: Record<string, any> = {};
  if (options?.status && options.status !== 'all') {
    query.status = options.status;
  }
  if (options?.requestedByUserId) {
    query.requestedByUserId = options.requestedByUserId;
  }

  const [docs, total] = await Promise.all([
    approvalsCollection()
      .find(query)
      .sort({ requestedAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray(),
    approvalsCollection().countDocuments(query),
  ]);

  const mapped = await Promise.all(docs.map((doc) => markExpiredIfNeeded(mapDoc(doc as any))));
  return { data: mapped, total };
};

export const approveAdminApprovalRequest = async (input: {
  id: string;
  approvedBy: { userId: string; email: string };
  note?: string;
}): Promise<{ ok: boolean; reason?: string; approval?: AdminApprovalRequest }> => {
  const approval = await getAdminApprovalRequest(input.id);
  if (!approval) return { ok: false, reason: 'not_found' };
  if (approval.status !== 'pending') return { ok: false, reason: `invalid_status:${approval.status}` };
  if (approval.requestedByUserId === input.approvedBy.userId) return { ok: false, reason: 'self_approval_forbidden' };

  await approvalsCollection().updateOne(
    { _id: new ObjectId(input.id), status: 'pending' },
    {
      $set: {
        status: 'approved',
        approvedAt: new Date(),
        approvedByUserId: input.approvedBy.userId,
        approvedByEmail: input.approvedBy.email,
        note: input.note?.trim() || approval.note,
      },
    }
  );
  const updated = await getAdminApprovalRequest(input.id);
  return { ok: true, approval: updated ?? undefined };
};

export const rejectAdminApprovalRequest = async (input: {
  id: string;
  rejectedBy: { userId: string; email: string };
  reason?: string;
}): Promise<{ ok: boolean; reason?: string; approval?: AdminApprovalRequest }> => {
  const approval = await getAdminApprovalRequest(input.id);
  if (!approval) return { ok: false, reason: 'not_found' };
  if (approval.status !== 'pending' && approval.status !== 'approved') {
    return { ok: false, reason: `invalid_status:${approval.status}` };
  }

  await approvalsCollection().updateOne(
    { _id: new ObjectId(input.id), status: { $in: ['pending', 'approved'] } },
    {
      $set: {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedByUserId: input.rejectedBy.userId,
        rejectedByEmail: input.rejectedBy.email,
        rejectionReason: input.reason?.trim() || 'Rejected',
      },
    }
  );
  const updated = await getAdminApprovalRequest(input.id);
  return { ok: true, approval: updated ?? undefined };
};

export const validateApprovalForExecution = async (input: {
  id: string;
  actionType: AdminApprovalActionType;
  endpoint: string;
  method: string;
  targetIds: string[];
  payload?: Record<string, any>;
}): Promise<{ ok: boolean; reason?: string; approval?: AdminApprovalRequest }> => {
  const approval = await getAdminApprovalRequest(input.id);
  if (!approval) return { ok: false, reason: 'not_found' };
  if (approval.status !== 'approved') return { ok: false, reason: `invalid_status:${approval.status}` };

  const expectedHash = createApprovalRequestHash({
    actionType: input.actionType,
    endpoint: input.endpoint,
    method: input.method,
    targetIds: input.targetIds,
    payload: input.payload,
  });
  if (approval.requestHash !== expectedHash) {
    return { ok: false, reason: 'request_mismatch' };
  }
  return { ok: true, approval };
};

export const markAdminApprovalExecuted = async (input: {
  id: string;
  executedBy: { userId: string; email: string };
}): Promise<void> => {
  if (!ObjectId.isValid(input.id)) return;
  await approvalsCollection().updateOne(
    { _id: new ObjectId(input.id), status: 'approved' },
    {
      $set: {
        status: 'executed',
        executedAt: new Date(),
        executedByUserId: input.executedBy.userId,
        executedByEmail: input.executedBy.email,
      },
    }
  );
};

export const expireOverdueAdminApprovals = async (): Promise<number> => {
  const result = await approvalsCollection().updateMany(
    {
      status: { $in: ['pending', 'approved'] },
      expiresAt: { $lte: new Date() },
    },
    {
      $set: {
        status: 'expired',
      },
    }
  );
  return result.modifiedCount ?? 0;
};

export const cleanupOldAdminApprovals = async (options?: {
  retentionDays?: number;
}): Promise<{ expiredCount: number; deletedCount: number; cutoff: string }> => {
  const retentionDays = Math.max(1, options?.retentionDays ?? config.adminApprovalRetentionDays);
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const expiredCount = await expireOverdueAdminApprovals();
  const deleteResult = await approvalsCollection().deleteMany({
    status: { $in: ['rejected', 'executed', 'expired'] },
    requestedAt: { $lt: cutoff },
  });

  return {
    expiredCount,
    deletedCount: deleteResult.deletedCount ?? 0,
    cutoff: cutoff.toISOString(),
  };
};

export const scheduleAdminApprovalsCleanup = (): void => {
  if (cleanupIntervalRef) return;

  const intervalMinutes = Math.max(5, config.adminApprovalCleanupIntervalMinutes);
  const runCleanup = async () => {
    try {
      const result = await cleanupOldAdminApprovals();
      if (result.expiredCount > 0 || result.deletedCount > 0) {
        console.log(
          `[AdminApprovals] Cleanup complete: expired=${result.expiredCount}, deleted=${result.deletedCount}`
        );
      }
    } catch (error) {
      console.error('[AdminApprovals] Cleanup failed:', error);
    }
  };

  void runCleanup();
  cleanupIntervalRef = setInterval(() => {
    void runCleanup();
  }, intervalMinutes * 60 * 1000);
  cleanupIntervalRef.unref?.();
};

export const stopAdminApprovalsCleanup = (): void => {
  if (!cleanupIntervalRef) return;
  clearInterval(cleanupIntervalRef);
  cleanupIntervalRef = null;
};
