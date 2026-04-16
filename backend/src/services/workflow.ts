import { randomUUID } from 'crypto';

import { z } from 'zod';

import PostModelPostgres from '../models/posts.postgres.js';

import { prismaApp } from './postgres/prisma.js';

const assignmentSchema = z.object({
  announcementId: z.string(),
  assigneeUserId: z.string(),
  assigneeEmail: z.string().email(),
  reviewDueAt: z.string().datetime().optional(),
});

interface WorkflowLog {
  id: string;
  announcementId: string;
  action: string;
  actor: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

interface AssignmentDetails {
  assigneeUserId?: string;
  assigneeEmail?: string;
  assignedAt?: Date;
  reviewDueAt?: Date;
}

function asObject(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function toDateOrUndefined(value: unknown): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

async function getLatestAssignments(announcementIds: string[]): Promise<Map<string, AssignmentDetails>> {
  if (announcementIds.length === 0) {
    return new Map<string, AssignmentDetails>();
  }

  const rows = await prismaApp.workflowLogEntry.findMany({
    where: {
      announcementId: { in: announcementIds },
      action: 'assigned',
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      announcementId: true,
      action: true,
      actor: true,
      metadata: true,
      createdAt: true,
    },
  });

  const assignments = new Map<string, AssignmentDetails>();
  for (const row of rows) {
    if (assignments.has(row.announcementId)) {
      continue;
    }

    const metadata = asObject(row.metadata);
    assignments.set(row.announcementId, {
      assigneeUserId: typeof metadata?.assigneeUserId === 'string' ? metadata.assigneeUserId : undefined,
      assigneeEmail: typeof metadata?.assignee === 'string' ? metadata.assignee : undefined,
      assignedAt: toDateOrUndefined(metadata?.assignedAt),
      reviewDueAt: toDateOrUndefined(metadata?.reviewDueAt),
    });
  }

  return assignments;
}

export async function assignAnnouncement(data: unknown, assignedBy: string) {
  const parse = assignmentSchema.safeParse(data);
  if (!parse.success) return { success: false, error: parse.error.message };

  try {
    const assignedAt = new Date();
    const reviewDueAt = parse.data.reviewDueAt ? new Date(parse.data.reviewDueAt) : undefined;

    const updated = await PostModelPostgres.update(
      parse.data.announcementId,
      { status: 'in_review' },
      assignedBy,
      'admin',
      'Assigned for review',
    );

    if (!updated) {
      return { success: false, error: 'Announcement not found' };
    }

    await addWorkflowLog(parse.data.announcementId, 'assigned', assignedBy, {
      assignee: parse.data.assigneeEmail,
      assigneeUserId: parse.data.assigneeUserId,
      assignedAt: assignedAt.toISOString(),
      reviewDueAt: reviewDueAt?.toISOString(),
    });

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to assign' };
  }
}

export async function approveAnnouncement(announcementId: string, approvedBy: string, note?: string) {
  try {
    const updated = await PostModelPostgres.update(
      announcementId,
      {
        status: 'approved',
        approvedBy,
      },
      approvedBy,
      'admin',
      note || 'Approved',
    );

    if (!updated) {
      return { success: false, error: 'Announcement not found' };
    }

    await addWorkflowLog(announcementId, 'approved', approvedBy, { note });
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to approve' };
  }
}

export async function rejectAnnouncement(announcementId: string, rejectedBy: string, reason: string) {
  try {
    const updated = await PostModelPostgres.update(
      announcementId,
      { status: 'draft' },
      rejectedBy,
      'admin',
      reason || 'Rejected',
    );

    if (!updated) {
      return { success: false, error: 'Announcement not found' };
    }

    await addWorkflowLog(announcementId, 'rejected', rejectedBy, { reason });
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to reject' };
  }
}

async function addWorkflowLog(announcementId: string, action: string, actor: string, metadata?: Record<string, unknown>) {
  await prismaApp.workflowLogEntry.create({
    data: {
      id: randomUUID(),
      announcementId,
      action,
      actor,
      ...(metadata ? { metadata } : {}),
    },
  });
}

export async function getPendingApprovals(assigneeEmail?: string) {
  try {
    const all = await PostModelPostgres.findAdmin({
      status: 'in_review',
      limit: 100,
      sort: 'updated',
    });

    const assignments = await getLatestAssignments(all.data.map((item) => item.id));

    const pending = all.data.map((item) => {
      const assignment = assignments.get(item.id);
      return {
        id: item.id,
        title: item.title,
        slug: item.slug,
        type: item.type,
        category: item.categories[0]?.name || 'General',
        organization: item.organization?.name || 'Government of India',
        status: 'pending' as const,
        postedAt: new Date(item.publishedAt || item.createdAt),
        updatedAt: new Date(item.updatedAt),
        version: item.currentVersion,
        isActive: true,
        viewCount: item.home.trendingScore || 0,
        assigneeUserId: assignment?.assigneeUserId,
        assigneeEmail: assignment?.assigneeEmail,
        assignedAt: assignment?.assignedAt,
        reviewDueAt: assignment?.reviewDueAt,
      };
    });

    if (assigneeEmail) {
      return pending.filter((item) => item.assigneeEmail === assigneeEmail);
    }
    return pending;
  } catch {
    return [];
  }
}

export async function getWorkflowLogs(announcementId: string) {
  try {
    const rows = await prismaApp.workflowLogEntry.findMany({
      where: { announcementId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        announcementId: true,
        action: true,
        actor: true,
        metadata: true,
        createdAt: true,
      },
    });

    return rows.map((row): WorkflowLog => ({
      id: row.id,
      announcementId: row.announcementId,
      action: row.action,
      actor: row.actor,
      metadata: asObject(row.metadata),
      createdAt: row.createdAt,
    }));
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
      .filter((item) => item.reviewDueAt && new Date(item.reviewDueAt).getTime() < now)
      .map((item) => ({
        id: item.id,
        title: item.title,
        assignee: item.assigneeEmail,
        hoursOverdue: Math.floor((now - new Date(item.reviewDueAt as Date).getTime()) / (1000 * 60 * 60)),
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
