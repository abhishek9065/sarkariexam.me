import { z } from 'zod';

import { AnnouncementModelMongo } from '../models/announcements.mongo.js';

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
        postedBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
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

      const created = await AnnouncementModelMongo.create(payload as any, userId);
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
    const query: Record<string, unknown> = {
      $or: [
        { deadline: { $gte: startDate, $lte: endDate } },
        { publishAt: { $gte: startDate, $lte: endDate } },
        { createdAt: { $gte: startDate, $lte: endDate } },
      ],
    };

    if (filters?.status && filters.status !== 'all') {
      query.status = filters.status;
    }
    if (filters?.type && filters.type !== 'all') {
      query.type = filters.type;
    }

    const announcements = await AnnouncementModelMongo.findAllAdmin({
      includeInactive: true,
      limit: 500,
    });

    return announcements
      .filter(a => {
        const deadline = a.deadline ? new Date(a.deadline) : null;
        const publishAt = a.publishAt ? new Date(a.publishAt) : null;
        const createdAt = (a as any).postedAt ? new Date((a as any).postedAt) : new Date();
        
        return (
          (deadline && deadline >= startDate && deadline <= endDate) ||
          (publishAt && publishAt >= startDate && publishAt <= endDate) ||
          (createdAt >= startDate && createdAt <= endDate)
        );
      })
      .map(a => ({
        id: a.id,
        title: a.title,
        type: a.type,
        status: a.status,
        deadline: a.deadline ? new Date(a.deadline) : undefined,
        publishAt: a.publishAt ? new Date(a.publishAt) : undefined,
        createdAt: (a as any).postedAt ? new Date((a as any).postedAt) : new Date(),
      }));
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
    await AnnouncementModelMongo.update(id, {
      status: 'scheduled',
      publishAt: publishAt.toISOString(),
      updatedBy: userId,
      updatedAt: new Date(),
    } as any);
    return true;
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
    const { getCollection } = await import('../services/cosmosdb.js');
    const col = getCollection('announcements');

    const result = await col.updateMany(
      {
        status: { $in: ['published', 'draft'] },
        deadline: { $lt: thirtyDaysAgo },
      },
      {
        $set: {
          status: 'archived',
          updatedAt: new Date(),
        },
      }
    );

    console.log(`[CalendarService] Auto-archived ${result.modifiedCount} expired announcements`);
    return result.modifiedCount;
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

    const announcements = await AnnouncementModelMongo.findAllAdmin({
      includeInactive: true,
      limit: 100,
    });

    return announcements
      .filter(a => {
        if (!a.deadline) return false;
        const deadline = new Date(a.deadline);
        return deadline >= now && deadline <= thirtyDaysFromNow && a.status !== 'archived';
      })
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
      .slice(0, limit)
      .map(a => {
        const deadline = new Date(a.deadline!);
        const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return {
          id: a.id,
          title: a.title,
          deadline,
          daysLeft,
          type: a.type,
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
