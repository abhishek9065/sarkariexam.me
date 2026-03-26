import { z } from 'zod';

import { AnnouncementModelMongo } from '../models/announcements.mongo.js';

const assignmentSchema = z.object({
  announcementId: z.string(),
  assigneeUserId: z.string(),
  assigneeEmail: z.string().email(),
  reviewDueAt: z.string().datetime().optional(),
});

export async function assignAnnouncement(data: unknown, assignedBy: string) {
  const parse = assignmentSchema.safeParse(data);
  if (!parse.success) return { success: false, error: parse.error.message };

  try {
    await AnnouncementModelMongo.update(parse.data.announcementId, {
      assigneeUserId: parse.data.assigneeUserId,
      assigneeEmail: parse.data.assigneeEmail,
      assignedAt: new Date(),
      reviewDueAt: parse.data.reviewDueAt ? new Date(parse.data.reviewDueAt) : undefined,
      status: 'pending',
    } as any);

    await addWorkflowLog(parse.data.announcementId, 'assigned', assignedBy, {
      assignee: parse.data.assigneeEmail,
    });

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to assign' };
  }
}

export async function approveAnnouncement(announcementId: string, approvedBy: string, note?: string) {
  try {
    await AnnouncementModelMongo.update(announcementId, {
      status: 'published',
      approvedAt: new Date(),
      approvedBy,
    } as any);

    await addWorkflowLog(announcementId, 'approved', approvedBy, { note });
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to approve' };
  }
}

export async function rejectAnnouncement(announcementId: string, rejectedBy: string, reason: string) {
  try {
    await AnnouncementModelMongo.update(announcementId, {
      status: 'draft',
    } as any);

    await addWorkflowLog(announcementId, 'rejected', rejectedBy, { reason });
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to reject' };
  }
}

async function addWorkflowLog(announcementId: string, action: string, actor: string, metadata?: Record<string, unknown>) {
  const { getCollection } = await import('./cosmosdb.js');
  const col = getCollection('workflow_logs');
  await col.insertOne({
    announcementId,
    action,
    actor,
    metadata,
    createdAt: new Date(),
  } as any);
}

export async function getPendingApprovals(assigneeEmail?: string) {
  try {
    const all = await AnnouncementModelMongo.findAllAdmin({
      status: 'pending',
      includeInactive: true,
      limit: 100,
    });

    if (assigneeEmail) {
      return all.filter(a => (a as any).assigneeEmail === assigneeEmail);
    }
    return all;
  } catch {
    return [];
  }
}

export async function getWorkflowLogs(announcementId: string) {
  try {
    const { getCollection } = await import('./cosmosdb.js');
    const col = getCollection('workflow_logs');
    return await col
      .find({ announcementId })
      .sort({ createdAt: -1 })
      .toArray();
  } catch {
    return [];
  }
}

export async function checkSLAViolations(): Promise<Array<{
  id: string;
  title: string;
  assignee?: string;
  hoursOverdue: number;
}>> {
  try {
    const pending = await getPendingApprovals();
    const now = Date.now();

    return pending
      .filter(a => (a as any).reviewDueAt && new Date((a as any).reviewDueAt).getTime() < now)
      .map(a => ({
        id: a.id,
        title: a.title,
        assignee: (a as any).assigneeEmail,
        hoursOverdue: Math.floor((now - new Date((a as any).reviewDueAt).getTime()) / (1000 * 60 * 60)),
      }));
  } catch {
    return [];
  }
}

export const workflowService = {
  assignAnnouncement,
  approveAnnouncement,
  rejectAnnouncement,
  getPendingApprovals,
  getWorkflowLogs,
  checkSLAViolations,
};

export default workflowService;
