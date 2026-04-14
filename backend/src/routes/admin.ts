import express from 'express';
import { z } from 'zod';

import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { AnnouncementModelMongo as AnnouncementModel } from '../models/announcements.mongo.js';
import { UserModelMongo } from '../models/users.mongo.js';
import { getAnalyticsOverview } from '../services/analyticsOverview.js';
import type { ContentType, AnnouncementStatus, CreateAnnouncementDto } from '../types.js';

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticateToken);
router.use(requireAdmin);

// ─── Validation Schemas ───

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const adminAnnouncementListSchema = paginationSchema.extend({
  type: z.enum(['job', 'result', 'admit-card', 'syllabus', 'answer-key', 'admission'] as [ContentType, ...ContentType[]]).optional(),
  status: z.enum(['draft', 'pending', 'scheduled', 'published', 'archived', 'all'] as [AnnouncementStatus | 'all', ...(AnnouncementStatus | 'all')[]]).optional(),
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
  organization: z.string().trim().max(100).optional(),
  sort: z.enum(['newest', 'oldest', 'deadline', 'updated', 'views']).default('newest'),
  includeInactive: z.coerce.boolean().default(true),
});

const createAnnouncementSchema = z.object({
  title: z.string().trim().min(3).max(300),
  type: z.enum(['job', 'result', 'admit-card', 'syllabus', 'answer-key', 'admission'] as [ContentType, ...ContentType[]]),
  category: z.string().trim().min(1).max(100),
  organization: z.string().trim().min(1).max(200),
  content: z.string().optional(),
  externalLink: z.string().url().optional().or(z.literal('')),
  location: z.string().max(100).optional(),
  deadline: z.string().optional(),
  minQualification: z.string().max(200).optional(),
  ageLimit: z.string().max(100).optional(),
  applicationFee: z.string().max(200).optional(),
  salaryMin: z.coerce.number().min(0).optional(),
  salaryMax: z.coerce.number().min(0).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  cutoffMarks: z.string().max(200).optional(),
  totalPosts: z.coerce.number().int().min(0).optional(),
  status: z.enum(['draft', 'pending', 'scheduled', 'published', 'archived'] as [AnnouncementStatus, ...AnnouncementStatus[]]).default('draft'),
  publishAt: z.string().optional(),
  tags: z.array(z.string()).optional(),
  importantDates: z.array(z.object({
    eventName: z.string().min(1),
    eventDate: z.string(),
    description: z.string().optional(),
  })).optional(),
  jobDetails: z.any().optional(),
  typeDetails: z.record(z.unknown()).optional(),
  seo: z.object({
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    canonical: z.string().optional(),
    indexPolicy: z.enum(['index', 'noindex']).optional(),
    ogImage: z.string().optional(),
  }).optional(),
  home: z.object({
    section: z.string().optional(),
    stickyRank: z.coerce.number().optional(),
    highlight: z.boolean().optional(),
    trendingScore: z.coerce.number().optional(),
  }).optional(),
});

const updateAnnouncementSchema = createAnnouncementSchema.partial();

const statusChangeSchema = z.object({
  status: z.enum(['draft', 'pending', 'scheduled', 'published', 'archived'] as [AnnouncementStatus, ...AnnouncementStatus[]]),
  note: z.string().max(500).optional(),
});

const bulkStatusSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  status: z.enum(['draft', 'pending', 'scheduled', 'published', 'archived'] as [AnnouncementStatus, ...AnnouncementStatus[]]),
  note: z.string().max(500).optional(),
});

const userListSchema = paginationSchema.extend({
  role: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().trim().max(100).optional(),
});

const updateUserSchema = z.object({
  role: z.string().optional(),
  isActive: z.boolean().optional(),
  username: z.string().trim().min(1).max(100).optional(),
});

const analyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
});

// ═══════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════

router.get('/dashboard', async (_req, res) => {
  try {
    const [
      announcementCounts,
      workspaceSummary,
      qaCounts,
      slaSummary,
      recentAnnouncements,
    ] = await Promise.all([
      AnnouncementModel.getAdminCounts({ includeInactive: true }),
      AnnouncementModel.getManagePostsWorkspaceSummary({ includeInactive: true }),
      AnnouncementModel.getAdminQaCounts({ includeInactive: true }),
      AnnouncementModel.getPendingSlaSummary({ includeInactive: true, staleLimit: 5 }),
      AnnouncementModel.findAllAdmin({ sort: 'newest', limit: 10, includeInactive: true }),
    ]);

    // Get total user count
    const allUsers = await UserModelMongo.findAll({ limit: 10000 });
    const totalUsers = allUsers.length;
    const activeUsers = allUsers.filter(u => u.isActive).length;
    const adminUsers = allUsers.filter(u => u.role === 'admin').length;

    return res.json({
      data: {
        announcements: {
          total: announcementCounts.total,
          byStatus: announcementCounts.byStatus,
          byType: announcementCounts.byType,
        },
        workspace: workspaceSummary,
        qa: qaCounts,
        sla: slaSummary,
        recentAnnouncements: recentAnnouncements.map(a => ({
          id: a.id,
          title: a.title,
          type: a.type,
          status: a.status,
          organization: a.organization,
          viewCount: a.viewCount,
          updatedAt: a.updatedAt,
          postedAt: a.postedAt,
        })),
        users: {
          total: totalUsers,
          active: activeUsers,
          admins: adminUsers,
        },
      },
    });
  } catch (error) {
    console.error('[Admin] Dashboard error:', error);
    return res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

// ═══════════════════════════════════════════
// ANNOUNCEMENTS
// ═══════════════════════════════════════════

// List all announcements (admin view — includes drafts, archived, etc.)
router.get('/announcements', async (req, res) => {
  try {
    const parseResult = adminAnnouncementListSchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.flatten() });
    }

    const filters = parseResult.data;
    const [announcements, total] = await Promise.all([
      AnnouncementModel.findAllAdmin({
        type: filters.type,
        status: filters.status,
        search: filters.search,
        category: filters.category,
        organization: filters.organization,
        sort: filters.sort,
        limit: filters.limit,
        offset: filters.offset,
        includeInactive: filters.includeInactive,
      }),
      AnnouncementModel.countAdmin({
        type: filters.type,
        status: filters.status,
        search: filters.search,
        category: filters.category,
        organization: filters.organization,
        includeInactive: filters.includeInactive,
      }),
    ]);

    return res.json({ data: announcements, total, count: announcements.length });
  } catch (error) {
    console.error('[Admin] List announcements error:', error);
    return res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// Get single announcement by ID (full detail with versions)
router.get('/announcements/:id', async (req, res) => {
  try {
    const id = req.params.id as string;
    const announcement = await AnnouncementModel.findById(id);
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    return res.json({ data: announcement });
  } catch (error) {
    console.error('[Admin] Get announcement error:', error);
    return res.status(500).json({ error: 'Failed to fetch announcement' });
  }
});

// Create announcement
router.post('/announcements', async (req, res) => {
  try {
    const parseResult = createAnnouncementSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.flatten() });
    }

    const userId = req.user!.userId;
    const announcement = await AnnouncementModel.create(parseResult.data as unknown as CreateAnnouncementDto, userId);
    return res.status(201).json({ data: announcement });
  } catch (error) {
    console.error('[Admin] Create announcement error:', error);
    return res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// Update announcement
router.put('/announcements/:id', async (req, res) => {
  try {
    const id = req.params.id as string;
    const parseResult = updateAnnouncementSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.flatten() });
    }

    const updatedBy = req.user!.userId;
    const announcement = await AnnouncementModel.update(id, parseResult.data as unknown as Partial<CreateAnnouncementDto>, updatedBy);
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    return res.json({ data: announcement });
  } catch (error) {
    console.error('[Admin] Update announcement error:', error);
    return res.status(500).json({ error: 'Failed to update announcement' });
  }
});

// Change announcement status
router.patch('/announcements/:id/status', async (req, res) => {
  try {
    const id = req.params.id as string;
    const parseResult = statusChangeSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.flatten() });
    }

    const { status, note } = parseResult.data;
    const updatedBy = req.user!.userId;
    const announcement = await AnnouncementModel.update(id, { status, ...(note ? { note } as any : {}) }, updatedBy);
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    return res.json({ data: announcement });
  } catch (error) {
    console.error('[Admin] Change status error:', error);
    return res.status(500).json({ error: 'Failed to change announcement status' });
  }
});

// Soft delete announcement
router.delete('/announcements/:id', async (req, res) => {
  try {
    const id = req.params.id as string;
    const deleted = await AnnouncementModel.softDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    return res.json({ message: 'Announcement archived successfully' });
  } catch (error) {
    console.error('[Admin] Delete announcement error:', error);
    return res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

// Bulk status change
router.post('/announcements/bulk-status', async (req, res) => {
  try {
    const parseResult = bulkStatusSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.flatten() });
    }

    const { ids, status, note } = parseResult.data;
    const updatedBy = req.user!.userId;

    const result = await AnnouncementModel.batchUpdate(
      ids.map(id => ({
        id,
        data: { status, ...(note ? { note } as any : {}) },
      })),
      updatedBy
    );

    return res.json({
      data: {
        updated: result.updated,
        errors: result.errors,
        total: ids.length,
      },
    });
  } catch (error) {
    console.error('[Admin] Bulk status change error:', error);
    return res.status(500).json({ error: 'Failed to perform bulk status change' });
  }
});

// ═══════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════

// List users
router.get('/users', async (req, res) => {
  try {
    const parseResult = userListSchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.flatten() });
    }

    const { role, isActive, limit, offset } = parseResult.data;
    const users = await UserModelMongo.findAll({
      role,
      isActive,
      skip: offset,
      limit,
    });

    // Get total count (rough — the model doesn't have a count method)
    const allForCount = await UserModelMongo.findAll({ role, isActive, limit: 100000 });

    return res.json({
      data: users,
      total: allForCount.length,
      count: users.length,
    });
  } catch (error) {
    console.error('[Admin] List users error:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get single user
router.get('/users/:id', async (req, res) => {
  try {
    const id = req.params.id as string;
    const user = await UserModelMongo.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ data: user });
  } catch (error) {
    console.error('[Admin] Get user error:', error);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user (role, active status)
router.patch('/users/:id', async (req, res) => {
  try {
    const id = req.params.id as string;
    const parseResult = updateUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.flatten() });
    }

    // Prevent admin from deactivating themselves
    if (id === req.user!.userId && parseResult.data.isActive === false) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    const user = await UserModelMongo.update(id, parseResult.data);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ data: user });
  } catch (error) {
    console.error('[Admin] Update user error:', error);
    return res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const id = req.params.id as string;

    // Prevent admin from deleting themselves
    if (id === req.user!.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const deleted = await UserModelMongo.delete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('[Admin] Delete user error:', error);
    return res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ═══════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════

// Analytics overview
router.get('/analytics/overview', async (req, res) => {
  try {
    const parseResult = analyticsQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.flatten() });
    }

    const { days } = parseResult.data;
    const result = await getAnalyticsOverview(days);
    return res.json({ data: result.data, cached: result.cached });
  } catch (error) {
    console.error('[Admin] Analytics overview error:', error);
    return res.status(500).json({ error: 'Failed to fetch analytics overview' });
  }
});

// Content performance — top announcements by views
router.get('/analytics/content', async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const type = req.query.type as ContentType | undefined;

    const announcements = await AnnouncementModel.getTrending({ type, limit });

    return res.json({
      data: announcements.map(a => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        type: a.type,
        category: a.category,
        organization: a.organization,
        viewCount: a.viewCount,
        status: a.status,
        postedAt: a.postedAt,
      })),
    });
  } catch (error) {
    console.error('[Admin] Content analytics error:', error);
    return res.status(500).json({ error: 'Failed to fetch content analytics' });
  }
});

// ═══════════════════════════════════════════
// SUBSCRIBERS (Email)
// ═══════════════════════════════════════════

router.get('/subscribers', async (req, res) => {
  try {
    const { getCollection } = await import('../services/cosmosdb.js');
    const col = getCollection('alert_subscriptions');
    const parse = paginationSchema.safeParse(req.query);
    const { limit, offset } = parse.success ? parse.data : { limit: 20, offset: 0 };
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : 'all';
    const frequency = typeof req.query.frequency === 'string' ? req.query.frequency.trim() : 'all';

    const filter: Record<string, unknown> = {};
    if (search) filter.email = { $regex: search, $options: 'i' };
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;
    if (['instant', 'daily', 'weekly'].includes(frequency)) filter.frequency = frequency;

    const [items, total] = await Promise.all([
      col.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).toArray(),
      col.countDocuments(filter),
    ]);

    return res.json({ data: items.map((d: any) => ({ id: d._id?.toString(), ...d, _id: undefined })), total, count: items.length });
  } catch (error) {
    console.error('[Admin] Subscribers error:', error);
    return res.status(500).json({ error: 'Failed to fetch subscribers' });
  }
});

router.get('/subscribers/stats', async (_req, res) => {
  try {
    const { getCollection } = await import('../services/cosmosdb.js');
    const col = getCollection('alert_subscriptions');
    const [total, verified, active, byFrequency] = await Promise.all([
      col.countDocuments(),
      col.countDocuments({ verified: true }),
      col.countDocuments({ isActive: true }),
      col.aggregate([
        { $group: { _id: '$frequency', count: { $sum: 1 } } },
      ]).toArray(),
    ]);
    return res.json({ data: { total, verified, unverified: total - verified, active, inactive: total - active, byFrequency } });
  } catch (error) {
    console.error('[Admin] Subscriber stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch subscriber stats' });
  }
});

router.delete('/subscribers/:id', async (req, res) => {
  try {
    const rawId = String(req.params.id);
    const { getCollection } = await import('../services/cosmosdb.js');
    const { ObjectId } = await import('mongodb');
    const col = getCollection('alert_subscriptions');
    
    // Validate ObjectId format
    if (!ObjectId.isValid(rawId)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    const result = await col.deleteOne({ _id: new ObjectId(rawId) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }
    return res.json({ message: 'Subscriber removed' });
  } catch (error) {
    console.error('[Admin] Delete subscriber error:', error);
    return res.status(500).json({ error: 'Failed to delete subscriber' });
  }
});

// ═══════════════════════════════════════════
// PUSH SUBSCRIBERS
// ═══════════════════════════════════════════

router.get('/push-subscribers', async (req, res) => {
  try {
    const { getCollection } = await import('../services/cosmosdb.js');
    const col = getCollection('push_subscriptions');
    const parse = paginationSchema.safeParse(req.query);
    const { limit, offset } = parse.success ? parse.data : { limit: 20, offset: 0 };

    const [items, total] = await Promise.all([
      col.find({}).sort({ createdAt: -1 }).skip(offset).limit(limit).toArray(),
      col.countDocuments(),
    ]);

    return res.json({ data: items.map((d: any) => ({ id: d._id?.toString(), endpoint: d.endpoint, userId: d.userId, createdAt: d.createdAt })), total, count: items.length });
  } catch (error) {
    console.error('[Admin] Push subscribers error:', error);
    return res.status(500).json({ error: 'Failed to fetch push subscribers' });
  }
});

router.post('/push/send', async (req, res) => {
  try {
    const schema = z.object({
      title: z.string().trim().min(1).max(200),
      body: z.string().trim().min(1).max(1000),
      url: z.string().trim().url().optional(),
    });
    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });

    const { getCollection } = await import('../services/cosmosdb.js');
    const col = getCollection('push_subscriptions');
    const subs = await col.find({}).toArray();

    let sent = 0;
    let failed = 0;

    try {
      const webpush = await import('web-push');
      const { config } = await import('../config.js');
      if (config.vapidPublicKey && config.vapidPrivateKey) {
        webpush.default.setVapidDetails('mailto:admin@sarkariexams.me', config.vapidPublicKey, config.vapidPrivateKey);
        const payload = JSON.stringify({ title: parse.data.title, body: parse.data.body, url: parse.data.url });
        for (const sub of subs) {
          try {
            await webpush.default.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);
            sent++;
          } catch { failed++; }
        }
      } else {
        return res.json({ data: { sent: 0, failed: 0, total: subs.length, message: 'VAPID keys not configured' } });
      }
    } catch {
      return res.json({ data: { sent: 0, failed: 0, total: subs.length, message: 'web-push not available' } });
    }

    return res.json({ data: { sent, failed, total: subs.length } });
  } catch (error) {
    console.error('[Admin] Push send error:', error);
    return res.status(500).json({ error: 'Failed to send push notifications' });
  }
});

// ═══════════════════════════════════════════
// COMMUNITY MODERATION
// ═══════════════════════════════════════════

const communityList = async (collectionName: string, req: express.Request, res: express.Response) => {
  try {
    const { getCollection } = await import('../services/cosmosdb.js');
    const col = getCollection(collectionName);
    const parse = paginationSchema.safeParse(req.query);
    const { limit, offset } = parse.success ? parse.data : { limit: 20, offset: 0 };

    const [items, total] = await Promise.all([
      col.find({}).sort({ createdAt: -1 }).skip(offset).limit(limit).toArray(),
      col.countDocuments(),
    ]);

    return res.json({ data: items.map((d: any) => ({ id: d._id?.toString(), ...d, _id: undefined })), total, count: items.length });
  } catch (error) {
    console.error(`[Admin] ${collectionName} list error:`, error);
    return res.status(500).json({ error: `Failed to fetch ${collectionName}` });
  }
};

const communityDelete = async (collectionName: string, req: express.Request, res: express.Response) => {
  try {
    const rawId = String(req.params.id);
    const { getCollection } = await import('../services/cosmosdb.js');
    const { ObjectId } = await import('mongodb');
    
    // Validate ObjectId format
    if (!ObjectId.isValid(rawId)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    const col = getCollection(collectionName);
    const result = await col.deleteOne({ _id: new ObjectId(rawId) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    return res.json({ message: 'Deleted' });
  } catch (error) {
    console.error(`[Admin] ${collectionName} delete error:`, error);
    return res.status(500).json({ error: `Failed to delete from ${collectionName}` });
  }
};

router.get('/community/forums', (req, res) => communityList('community_forums', req, res));
router.delete('/community/forums/:id', (req, res) => communityDelete('community_forums', req, res));

router.get('/community/qa', (req, res) => communityList('community_qa', req, res));
router.delete('/community/qa/:id', (req, res) => communityDelete('community_qa', req, res));

router.patch('/community/qa/:id', async (req, res) => {
  try {
    const rawId = String(req.params.id);
    const { getCollection } = await import('../services/cosmosdb.js');
    const { ObjectId } = await import('mongodb');
    
    // Validate ObjectId format
    if (!ObjectId.isValid(rawId)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    const col = getCollection('community_qa');
    const schema = z.object({ answer: z.string().trim().min(1).max(2000) });
    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });

    const result = await col.updateOne(
      { _id: new ObjectId(rawId) },
      { $set: { answer: parse.data.answer, answeredBy: (req as any).user?.email || 'admin', updatedAt: new Date() } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Not found' });
    return res.json({ message: 'Answer updated' });
  } catch (error) {
    console.error('[Admin] QA answer error:', error);
    return res.status(500).json({ error: 'Failed to answer question' });
  }
});

router.get('/community/groups', (req, res) => communityList('community_groups', req, res));
router.delete('/community/groups/:id', (req, res) => communityDelete('community_groups', req, res));

router.get('/community/flags', async (req, res) => {
  try {
    const { getCollection } = await import('../services/cosmosdb.js');
    const col = getCollection('community_flags');
    const parse = paginationSchema.safeParse(req.query);
    const { limit, offset } = parse.success ? parse.data : { limit: 20, offset: 0 };
    const statusParam = typeof req.query.status === 'string' ? req.query.status : undefined;

    const filter: Record<string, unknown> = {};
    if (statusParam && ['open', 'reviewed', 'resolved'].includes(statusParam)) filter.status = statusParam;

    const [items, total] = await Promise.all([
      col.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).toArray(),
      col.countDocuments(filter),
    ]);

    return res.json({ data: items.map((d: any) => ({ id: d._id?.toString(), ...d, _id: undefined })), total, count: items.length });
  } catch (error) {
    console.error('[Admin] Flags list error:', error);
    return res.status(500).json({ error: 'Failed to fetch flags' });
  }
});

router.patch('/community/flags/:id', async (req, res) => {
  try {
    const rawId = String(req.params.id);
    const { getCollection } = await import('../services/cosmosdb.js');
    const { ObjectId } = await import('mongodb');
    
    // Validate ObjectId format
    if (!ObjectId.isValid(rawId)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    const col = getCollection('community_flags');
    const schema = z.object({ status: z.enum(['reviewed', 'resolved']) });
    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });

    const result = await col.updateOne(
      { _id: new ObjectId(rawId) },
      { $set: { status: parse.data.status, updatedAt: new Date() } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Not found' });
    return res.json({ message: 'Flag updated' });
  } catch (error) {
    console.error('[Admin] Flag update error:', error);
    return res.status(500).json({ error: 'Failed to update flag' });
  }
});

// ═══════════════════════════════════════════
// ERROR REPORTS
// ═══════════════════════════════════════════

router.get('/error-reports', async (req, res) => {
  try {
    const { getCollection } = await import('../services/cosmosdb.js');
    const col = getCollection('error_reports');
    const parse = paginationSchema.safeParse(req.query);
    const { limit, offset } = parse.success ? parse.data : { limit: 20, offset: 0 };
    const statusParam = typeof req.query.status === 'string' ? req.query.status : undefined;

    const filter: Record<string, unknown> = {};
    if (statusParam && ['new', 'triaged', 'resolved'].includes(statusParam)) filter.status = statusParam;

    const [items, total] = await Promise.all([
      col.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).toArray(),
      col.countDocuments(filter),
    ]);

    return res.json({ data: items.map((d: any) => ({ id: d._id?.toString(), ...d, _id: undefined })), total, count: items.length });
  } catch (error) {
    console.error('[Admin] Error reports error:', error);
    return res.status(500).json({ error: 'Failed to fetch error reports' });
  }
});

router.patch('/error-reports/:id', async (req, res) => {
  try {
    const rawId = String(req.params.id);
    const { getCollection } = await import('../services/cosmosdb.js');
    const { ObjectId } = await import('mongodb');
    
    // Validate ObjectId format
    if (!ObjectId.isValid(rawId)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    const col = getCollection('error_reports');
    const schema = z.object({
      status: z.enum(['triaged', 'resolved']),
      reviewNote: z.string().trim().max(1000).optional(),
    });
    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });

    const update: Record<string, unknown> = { status: parse.data.status, updatedAt: new Date() };
    if (parse.data.reviewNote) update.reviewNote = parse.data.reviewNote;
    if (parse.data.status === 'resolved') {
      update.resolvedAt = new Date();
      update.resolvedBy = (req as any).user?.email || 'admin';
    }

    const result = await col.updateOne({ _id: new ObjectId(rawId) }, { $set: update });
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Not found' });
    return res.json({ message: 'Error report updated' });
  } catch (error) {
    console.error('[Admin] Error report update error:', error);
    return res.status(500).json({ error: 'Failed to update error report' });
  }
});

// ═══════════════════════════════════════════
// AUDIT LOG
// ═══════════════════════════════════════════

router.get('/audit-log', async (req, res) => {
  try {
    const parse = paginationSchema.safeParse(req.query);
    const { limit, offset } = parse.success ? parse.data : { limit: 50, offset: 0 };

    const [recentUpdates, total] = await Promise.all([
      AnnouncementModel.findAllAdmin({
        sort: 'updated',
        limit,
        offset,
        includeInactive: true,
      }),
      AnnouncementModel.countAdmin({ includeInactive: true }),
    ]);

    const entries = recentUpdates.map(a => ({
      id: a.id,
      title: a.title,
      type: a.type,
      status: a.status,
      version: (a as any).version || 1,
      updatedAt: a.updatedAt,
      updatedBy: (a as any).updatedBy || (a as any).postedBy || 'system',
    }));

    return res.json({ data: entries, total, count: entries.length });
  } catch (error) {
    console.error('[Admin] Audit log error:', error);
    return res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// ═══════════════════════════════════════════
// SETTINGS (with persistence)
// ═══════════════════════════════════════════

router.get('/settings', async (_req, res) => {
  try {
    const { getCollection } = await import('../services/cosmosdb.js');
    const { config } = await import('../config.js');
    const col = getCollection('site_settings');
    const saved = await col.findOne({ _id: 'main' as any });

    const defaults = {
      siteName: 'SarkariExams.me',
      siteDescription: 'Public government jobs and exam updates platform',
      frontendUrl: config.frontendUrl,
      contactEmail: '',
      defaultMetaTitle: '',
      defaultMetaDescription: '',
      googleAnalyticsId: '',
      twitterUrl: '',
      telegramUrl: '',
      youtubeUrl: '',
      maintenanceMode: false,
      registrationEnabled: true,
      featureFlags: config.featureFlags || {},
    };

    return res.json({ data: { ...defaults, ...(saved || {}), _id: undefined } });
  } catch (error) {
    console.error('[Admin] Settings error:', error);
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const { getCollection } = await import('../services/cosmosdb.js');
    const col = getCollection('site_settings');

    const schema = z.object({
      siteName: z.string().trim().max(100).optional(),
      siteDescription: z.string().trim().max(500).optional(),
      contactEmail: z.string().email().optional().or(z.literal('')),
      defaultMetaTitle: z.string().trim().max(70).optional(),
      defaultMetaDescription: z.string().trim().max(160).optional(),
      googleAnalyticsId: z.string().trim().max(50).optional(),
      twitterUrl: z.string().trim().max(200).optional(),
      telegramUrl: z.string().trim().max(200).optional(),
      youtubeUrl: z.string().trim().max(200).optional(),
      maintenanceMode: z.boolean().optional(),
      registrationEnabled: z.boolean().optional(),
      featureFlags: z.record(z.boolean()).optional(),
    });

    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });

    await col.updateOne(
      { _id: 'main' as any },
      { $set: { ...parse.data, updatedAt: new Date() } },
      { upsert: true }
    );

    return res.json({ data: parse.data, message: 'Settings saved' });
  } catch (error) {
    console.error('[Admin] Settings save error:', error);
    return res.status(500).json({ error: 'Failed to save settings' });
  }
});

// ═══════════════════════════════════════════
// AI CONTENT ASSISTANT
// ═══════════════════════════════════════════

router.post('/ai/generate-meta', rateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 50, keyPrefix: 'admin-ai' }), async (req, res) => {
  try {
    const schema = z.object({
      title: z.string().min(5).max(200),
      content: z.string().min(10),
      organization: z.string().optional(),
    });

    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });

    const { generateMetaDescription, generateMetaTitle } = await import('../services/ai.js');
    const [description, title] = await Promise.all([
      generateMetaDescription(parse.data.title, parse.data.content, parse.data.organization),
      generateMetaTitle(parse.data.title),
    ]);

    return res.json({
      data: {
        metaTitle: title.content,
        metaDescription: description.content,
      },
    });
  } catch (error) {
    console.error('[Admin] AI meta generation error:', error);
    return res.status(500).json({ error: 'AI service unavailable' });
  }
});

router.post('/ai/suggest-tags', rateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 50, keyPrefix: 'admin-ai' }), async (req, res) => {
  try {
    const schema = z.object({
      title: z.string().min(5),
      content: z.string().min(10),
      organization: z.string().optional(),
      existingTags: z.array(z.string()).optional(),
    });

    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });

    const { suggestTags } = await import('../services/ai.js');
    const suggestions = await suggestTags(
      parse.data.title,
      parse.data.content,
      parse.data.organization,
      parse.data.existingTags
    );

    return res.json({ data: suggestions });
  } catch (error) {
    console.error('[Admin] AI tag suggestion error:', error);
    return res.status(500).json({ error: 'AI service unavailable' });
  }
});

router.post('/ai/social-summary', rateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 50, keyPrefix: 'admin-ai' }), async (req, res) => {
  try {
    const schema = z.object({
      title: z.string().min(5),
      content: z.string().min(10),
      deadline: z.string().optional(),
    });

    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });

    const { generateSocialSummary } = await import('../services/ai.js');
    const summary = await generateSocialSummary(parse.data.title, parse.data.content, parse.data.deadline);

    return res.json({ data: { summary: summary.content } });
  } catch (error) {
    console.error('[Admin] AI social summary error:', error);
    return res.status(500).json({ error: 'AI service unavailable' });
  }
});

// ═══════════════════════════════════════════
// LIVE ANALYTICS
// ═══════════════════════════════════════════

router.get('/analytics/live', async (req, res) => {
  try {
    const { getLiveMetrics } = await import('../services/live-analytics.js');
    const metrics = await getLiveMetrics();
    return res.json({ data: metrics });
  } catch (error) {
    console.error('[Admin] Live analytics error:', error);
    return res.status(500).json({ error: 'Failed to fetch live metrics' });
  }
});

// ═══════════════════════════════════════════
// CONTENT CALENDAR
// ═══════════════════════════════════════════

router.get('/calendar', async (req, res) => {
  try {
    const { start, end, status, type } = req.query;
    if (!start || !end) {
      return res.status(400).json({ error: 'start and end dates required' });
    }

    const { getCalendarAnnouncements } = await import('../services/calendar.js');
    const announcements = await getCalendarAnnouncements(
      new Date(start as string),
      new Date(end as string),
      { status: status as string, type: type as string }
    );

    return res.json({ data: announcements });
  } catch (error) {
    console.error('[Admin] Calendar error:', error);
    return res.status(500).json({ error: 'Failed to fetch calendar data' });
  }
});

router.post('/bulk-import', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { bulkImportAnnouncements } = await import('../services/calendar.js');
    const result = await bulkImportAnnouncements(req.body, userId);

    return res.json({ data: result });
  } catch (error) {
    console.error('[Admin] Bulk import error:', error);
    return res.status(500).json({ error: 'Failed to import announcements' });
  }
});

router.get('/upcoming-deadlines', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const { getUpcomingDeadlines } = await import('../services/calendar.js');
    const deadlines = await getUpcomingDeadlines(limit);
    return res.json({ data: deadlines });
  } catch (error) {
    console.error('[Admin] Upcoming deadlines error:', error);
    return res.status(500).json({ error: 'Failed to fetch deadlines' });
  }
});

// ═══════════════════════════════════════════
// NOTIFICATION CAMPAIGNS
// ═══════════════════════════════════════════

router.get('/campaigns', async (req, res) => {
  try {
    const { getCampaigns } = await import('../services/notifications.js');
    const campaigns = await getCampaigns();
    return res.json({ data: campaigns });
  } catch (error) {
    console.error('[Admin] Campaigns error:', error);
    return res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

router.post('/campaigns', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { createCampaign } = await import('../services/notifications.js');
    const result = await createCampaign(req.body, userId);
    
    if (!result.success) return res.status(400).json({ error: result.error });
    return res.json({ data: { id: result.campaignId }, message: 'Campaign created' });
  } catch (error) {
    console.error('[Admin] Create campaign error:', error);
    return res.status(500).json({ error: 'Failed to create campaign' });
  }
});

router.post('/campaigns/:id/send', async (req, res) => {
  try {
    const { sendCampaign } = await import('../services/notifications.js');
    const result = await sendCampaign(req.params.id);
    
    if (!result.success) return res.status(400).json({ error: result.error });
    return res.json({ message: 'Campaign sent' });
  } catch (error) {
    console.error('[Admin] Send campaign error:', error);
    return res.status(500).json({ error: 'Failed to send campaign' });
  }
});

router.get('/segments', async (req, res) => {
  try {
    const { getUserSegments, getSegmentUserCount } = await import('../services/notifications.js');
    const segments = await getUserSegments();
    const segmentCounts = await Promise.all([
      { type: 'all', value: 'all', count: segments.totalUsers },
      ...segments.states.map(s => getSegmentUserCount('state', s).then(count => ({ type: 'state', value: s, count }))),
      ...segments.categories.map(c => getSegmentUserCount('category', c).then(count => ({ type: 'category', value: c, count }))),
    ]);
    return res.json({ data: { segments, counts: segmentCounts } });
  } catch (error) {
    console.error('[Admin] Segments error:', error);
    return res.status(500).json({ error: 'Failed to fetch segments' });
  }
});

// ═══════════════════════════════════════════
// EDITORIAL WORKFLOW
// ═══════════════════════════════════════════

router.post('/assign', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { assignAnnouncement } = await import('../services/workflow.js');
    const result = await assignAnnouncement(req.body, userId);
    if (!result.success) return res.status(400).json({ error: result.error });
    return res.json({ message: 'Assigned' });
  } catch (error) {
    console.error('[Admin] Assign error:', error);
    return res.status(500).json({ error: 'Failed to assign' });
  }
});

router.post('/approve/:id', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { approveAnnouncement } = await import('../services/workflow.js');
    const result = await approveAnnouncement(req.params.id, userId, req.body.note);
    if (!result.success) return res.status(400).json({ error: result.error });
    return res.json({ message: 'Approved' });
  } catch (error) {
    console.error('[Admin] Approve error:', error);
    return res.status(500).json({ error: 'Failed to approve' });
  }
});

router.post('/reject/:id', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { rejectAnnouncement } = await import('../services/workflow.js');
    const result = await rejectAnnouncement(req.params.id, userId, req.body.reason);
    if (!result.success) return res.status(400).json({ error: result.error });
    return res.json({ message: 'Rejected' });
  } catch (error) {
    console.error('[Admin] Reject error:', error);
    return res.status(500).json({ error: 'Failed to reject' });
  }
});

router.get('/pending-approvals', async (req, res) => {
  try {
    const { getPendingApprovals } = await import('../services/workflow.js');
    const pending = await getPendingApprovals(req.query.assignee as string);
    return res.json({ data: pending });
  } catch (error) {
    console.error('[Admin] Pending approvals error:', error);
    return res.status(500).json({ error: 'Failed to fetch' });
  }
});

router.get('/workflow-logs/:id', async (req, res) => {
  try {
    const { getWorkflowLogs } = await import('../services/workflow.js');
    const logs = await getWorkflowLogs(req.params.id);
    return res.json({ data: logs });
  } catch (error) {
    console.error('[Admin] Workflow logs error:', error);
    return res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

router.get('/sla-violations', async (req, res) => {
  try {
    const { checkSLAViolations } = await import('../services/workflow.js');
    const violations = await checkSLAViolations();
    return res.json({ data: violations });
  } catch (error) {
    console.error('[Admin] SLA violations error:', error);
    return res.status(500).json({ error: 'Failed to fetch' });
  }
});

// ═══════════════════════════════════════════
// USER ENGAGEMENT
// ═══════════════════════════════════════════

router.get('/feedback', async (req, res) => {
  try {
    const { getUserFeedback } = await import('../services/engagement.js');
    const feedback = await getUserFeedback(parseInt(req.query.limit as string) || 50);
    return res.json({ data: feedback });
  } catch (error) {
    console.error('[Admin] Feedback error:', error);
    return res.status(500).json({ error: 'Failed to fetch' });
  }
});

router.get('/comments-pending', async (req, res) => {
  try {
    const { getCommentsPendingReview } = await import('../services/engagement.js');
    const comments = await getCommentsPendingReview(parseInt(req.query.limit as string) || 50);
    return res.json({ data: comments });
  } catch (error) {
    console.error('[Admin] Comments error:', error);
    return res.status(500).json({ error: 'Failed to fetch' });
  }
});

router.post('/moderate-comment/:id', async (req, res) => {
  try {
    const { moderateComment } = await import('../services/engagement.js');
    const { action } = req.body;
    const result = await moderateComment(req.params.id, action);
    if (!result) return res.status(400).json({ error: 'Failed to moderate' });
    return res.json({ message: 'Moderated' });
  } catch (error) {
    console.error('[Admin] Moderate error:', error);
    return res.status(500).json({ error: 'Failed' });
  }
});

router.get('/engagement-metrics', async (req, res) => {
  try {
    const { getEngagementMetrics } = await import('../services/engagement.js');
    const metrics = await getEngagementMetrics(parseInt(req.query.days as string) || 30);
    return res.json({ data: metrics });
  } catch (error) {
    console.error('[Admin] Engagement metrics error:', error);
    return res.status(500).json({ error: 'Failed' });
  }
});

// ═══════════════════════════════════════════
// SEO MONITORING
// ═══════════════════════════════════════════

router.get('/seo-metrics', async (req, res) => {
  try {
    const { getSEOMetrics, getTopSearchQueries, getIndexCoverage } = await import('../services/seo.js');
    const [metrics, queries, coverage] = await Promise.all([
      getSEOMetrics(),
      getTopSearchQueries(),
      getIndexCoverage(),
    ]);
    return res.json({ data: { metrics, queries, coverage } });
  } catch (error) {
    console.error('[Admin] SEO metrics error:', error);
    return res.status(500).json({ error: 'Failed' });
  }
});

// ═══════════════════════════════════════════
// LOW PRIORITY: BACKUP & SYSTEM
// ═══════════════════════════════════════════

// Backups
router.get('/backups', async (req, res) => {
  try {
    const { getBackups } = await import('../services/backup.js');
    const backups = await getBackups(parseInt(req.query.limit as string) || 20);
    return res.json({ data: backups });
  } catch (error) {
    console.error('[Admin] Backups error:', error);
    return res.status(500).json({ error: 'Failed to fetch backups' });
  }
});

router.post('/export/announcements', async (req, res) => {
  try {
    const { exportAnnouncementsToCSV } = await import('../services/backup.js');
    const csv = await exportAnnouncementsToCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=announcements.csv');
    return res.send(csv);
  } catch (error) {
    console.error('[Admin] Export error:', error);
    return res.status(500).json({ error: 'Export failed' });
  }
});

// Security Audit
router.get('/security/events', async (req, res) => {
  try {
    const { getSecurityEvents } = await import('../services/security-audit.js');
    const events = await getSecurityEvents({
      type: req.query.type as string,
      severity: req.query.severity as string,
    }, parseInt(req.query.limit as string) || 100);
    return res.json({ data: events });
  } catch (error) {
    console.error('[Admin] Security events error:', error);
    return res.status(500).json({ error: 'Failed' });
  }
});

router.get('/security/stats', async (req, res) => {
  try {
    const { getSecurityStats, getFailedLoginAttempts } = await import('../services/security-audit.js');
    const [stats, failedLogins] = await Promise.all([
      getSecurityStats(),
      getFailedLoginAttempts(60),
    ]);
    return res.json({ data: { ...stats, failedLogins } });
  } catch (error) {
    console.error('[Admin] Security stats error:', error);
    return res.status(500).json({ error: 'Failed' });
  }
});

// Performance
router.get('/performance/summary', async (req, res) => {
  try {
    const { getPerformanceSummary, getSlowEndpoints, getErrorSummary } = await import('../services/performance.js');
    const [summary, slowEndpoints, errors] = await Promise.all([
      getPerformanceSummary(60),
      getSlowEndpoints(10),
      getErrorSummary(24),
    ]);
    return res.json({ data: { summary, slowEndpoints, errors } });
  } catch (error) {
    console.error('[Admin] Performance error:', error);
    return res.status(500).json({ error: 'Failed' });
  }
});

// Rate Limiting
router.get('/rate-limit/stats', async (req, res) => {
  try {
    const { getRateLimitStats, getRateLimitByEndpoint } = await import('../services/rate-limit.js');
    const [stats, byEndpoint] = await Promise.all([
      getRateLimitStats(),
      getRateLimitByEndpoint(),
    ]);
    return res.json({ data: { ...stats, byEndpoint } });
  } catch (error) {
    console.error('[Admin] Rate limit stats error:', error);
    return res.status(500).json({ error: 'Failed' });
  }
});

// System Health
router.get('/health', async (req, res) => {
  try {
    const { getSystemHealth, getServiceStatus, getRecentErrors } = await import('../services/health.js');
    const [health, services, errors] = await Promise.all([
      getSystemHealth(),
      getServiceStatus(),
      getRecentErrors(5),
    ]);
    return res.json({ data: { health, services, errors } });
  } catch (error) {
    console.error('[Admin] Health error:', error);
    return res.status(500).json({ error: 'Failed' });
  }
});

export default router;
