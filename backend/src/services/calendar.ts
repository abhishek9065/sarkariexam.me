import { WorkflowStatus } from '@prisma/client';
import { z } from 'zod';

import AnnouncementModelPostgres from '../models/announcements.postgres.js';
import PostModelPostgres from '../models/posts.postgres.js';

import { prisma } from './postgres/prisma.js';

const bulkImportSchema = z.array(z.object({
  title: z.string().min(5).max(200),
  type: z.enum(['job', 'result', 'admit-card', 'syllabus', 'answer-key', 'admission']),
  category: z.string().min(2).max(50),
  organization: z.string().min(2).max(100),
  content: z.string().min(10),
  deadline: z.string().optional(),
  externalLink: z.string().url().optional(),
  location: z.string().optional(),
  totalPosts: z.coerce.number().optional(),
  salaryMin: z.coerce.number().optional(),
  salaryMax: z.coerce.number().optional(),
  publishAt: z.string().optional(),
  tags: z.string().optional(), // comma-separated
}));

interface BulkImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
  createdIds: string[];
}

function parseDateCandidate(...values: Array<string | Date | null | undefined>): Date | undefined {
  for (const value of values) {
    if (!value) continue;
    const parsed = value instanceof Date ? value : new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return undefined;
}

function toAnnouncementStatus(status: string): string {
  if (status === 'approved') return 'scheduled';
  if (status === 'in_review') return 'pending';
  return status;
}

function toPostStatusFilter(status?: string): 'draft' | 'in_review' | 'approved' | 'published' | 'archived' | undefined {
  if (!status || status === 'all') return undefined;
  if (status === 'pending') return 'in_review';
  if (status === 'scheduled') return 'approved';
  if (status === 'draft') return 'draft';
  if (status === 'published') return 'published';
  if (status === 'archived') return 'archived';
  return undefined;
}

/**
 * Bulk import announcements from CSV/JSON data
 */
export async function bulkImportAnnouncements(
  data: unknown,
  userId: string
): Promise<BulkImportResult> {
  const parse = bulkImportSchema.safeParse(data);
  if (!parse.success) {
    return {
      success: 0,
      failed: 0,
      errors: [{ row: 0, error: 'Invalid data format: ' + parse.error.message }],
      createdIds: [],
    };
  }

  const result: BulkImportResult = {
    success: 0,
    failed: 0,
    errors: [],
    createdIds: [],
  };

  for (let i = 0; i < parse.data.length; i++) {
    const row = parse.data[i];
    try {
      const payload: Record<string, unknown> = {
        title: row.title,
        type: row.type,
        category: row.category,
        organization: row.organization,
        content: row.content,
        status: row.publishAt ? 'scheduled' : 'draft',
        publishAt: row.publishAt,
      };

      if (row.deadline) payload.deadline = row.deadline;
      if (row.externalLink) payload.externalLink = row.externalLink;
      if (row.location) payload.location = row.location;
      if (row.totalPosts) payload.totalPosts = row.totalPosts;
      if (row.salaryMin) payload.salaryMin = row.salaryMin;
      if (row.salaryMax) payload.salaryMax = row.salaryMax;
      if (row.publishAt) payload.publishAt = row.publishAt;
      if (row.tags) {
        payload.tags = row.tags.split(',').map(t => t.trim()).filter(Boolean);
      }

      const created = await AnnouncementModelPostgres.create(payload as any, userId);

      if (row.publishAt) {
        await PostModelPostgres.update(
          created.id,
          {
            status: 'approved',
            publishedAt: row.publishAt,
          },
          userId,
          'admin',
          'Scheduled via bulk import',
        );
      }

      result.success++;
      result.createdIds.push(created.id);
    } catch (error) {
      result.failed++;
      result.errors.push({
        row: i + 1,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return result;
}

/**
 * Get announcements for calendar view
 */
export async function getCalendarAnnouncements(
  startDate: Date,
  endDate: Date,
  filters?: { status?: string; type?: string }
): Promise<Array<{
  id: string;
  title: string;
  type: string;
  status: string;
  deadline?: Date;
  publishAt?: Date;
  createdAt: Date;
}>> {
  try {
    const status = toPostStatusFilter(filters?.status) || 'all';
    const type = filters?.type && filters.type !== 'all'
      ? (filters.type as 'job' | 'result' | 'admit-card' | 'admission' | 'answer-key' | 'syllabus')
      : undefined;

    const posts = await PostModelPostgres.findAdmin({
      status,
      type,
      limit: 600,
      sort: 'updated',
    });

    return posts.data
      .map((post) => {
        const deadline = parseDateCandidate(post.lastDate, post.expiresAt);
        const publishAt = parseDateCandidate(post.publishedAt);
        const createdAt = parseDateCandidate(post.publishedAt, post.createdAt) || new Date();
        return {
          id: post.id,
          title: post.title,
          type: post.type,
          status: toAnnouncementStatus(post.status),
          deadline,
          publishAt,
          createdAt,
        };
      })
      .filter((item) => {
        return (
          (item.deadline && item.deadline >= startDate && item.deadline <= endDate) ||
          (item.publishAt && item.publishAt >= startDate && item.publishAt <= endDate) ||
          (item.createdAt >= startDate && item.createdAt <= endDate)
        );
      });
  } catch (error) {
    console.error('[CalendarService] Error fetching calendar data:', error);
    return [];
  }
}

/**
 * Schedule an announcement for publishing
 */
export async function scheduleAnnouncement(
  id: string,
  publishAt: Date,
  userId: string
): Promise<boolean> {
  try {
    const updated = await PostModelPostgres.update(
      id,
      {
        status: 'approved',
        publishedAt: publishAt.toISOString(),
      },
      userId,
      'admin',
      'Scheduled via calendar',
    );
    return Boolean(updated);
  } catch (error) {
    console.error('[CalendarService] Error scheduling announcement:', error);
    return false;
  }
}

/**
 * Auto-archive expired announcements (run via cron)
 */
export async function autoArchiveExpired(): Promise<number> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const archivedAt = new Date();

    const primary = await prisma.post.updateMany({
      where: {
        status: {
          in: [WorkflowStatus.PUBLISHED, WorkflowStatus.DRAFT],
        },
        expiresAt: { lt: thirtyDaysAgo },
      },
      data: {
        status: WorkflowStatus.ARCHIVED,
        archivedAt,
        updatedAt: archivedAt,
      },
    });

    // Fallback for legacy rows where expiresAt is null but lastDate is still parseable.
    const candidates = await PostModelPostgres.findAdmin({
      status: 'all',
      limit: 600,
      sort: 'updated',
    });

    let fallbackArchived = 0;
    for (const post of candidates.data) {
      if (post.status !== 'published' && post.status !== 'draft') continue;
      if (post.expiresAt) continue;

      const parsedDeadline = parseDateCandidate(post.lastDate);
      if (!parsedDeadline || parsedDeadline >= thirtyDaysAgo) continue;

      const updated = await PostModelPostgres.update(
        post.id,
        {
          status: 'archived',
          archivedAt: archivedAt.toISOString(),
        },
        'system',
        'system',
        'Auto-archived by calendar',
      );

      if (updated) fallbackArchived += 1;
    }

    const totalArchived = primary.count + fallbackArchived;
    console.log(`[CalendarService] Auto-archived ${totalArchived} expired announcements`);
    return totalArchived;
  } catch (error) {
    console.error('[CalendarService] Error auto-archiving:', error);
    return 0;
  }
}

/**
 * Get upcoming deadlines for dashboard
 */
export async function getUpcomingDeadlines(limit = 10): Promise<Array<{
  id: string;
  title: string;
  deadline: Date;
  daysLeft: number;
  type: string;
}>> {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const posts = await PostModelPostgres.findAdmin({
      status: 'all',
      limit: 300,
      sort: 'updated',
    });

    return posts.data
      .map((post) => ({
        id: post.id,
        title: post.title,
        type: post.type,
        status: toAnnouncementStatus(post.status),
        deadline: parseDateCandidate(post.lastDate, post.expiresAt),
      }))
      .filter((post) => {
        if (!post.deadline) return false;
        return post.deadline >= now && post.deadline <= thirtyDaysFromNow && post.status !== 'archived';
      })
      .sort((a, b) => a.deadline!.getTime() - b.deadline!.getTime())
      .slice(0, limit)
      .map((post) => {
        const deadline = post.deadline!;
        const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return {
          id: post.id,
          title: post.title,
          deadline,
          daysLeft,
          type: post.type,
        };
      });
  } catch (error) {
    console.error('[CalendarService] Error getting upcoming deadlines:', error);
    return [];
  }
}

export const calendarService = {
  bulkImportAnnouncements,
  getCalendarAnnouncements,
  scheduleAnnouncement,
  autoArchiveExpired,
  getUpcomingDeadlines,
};

export default calendarService;
