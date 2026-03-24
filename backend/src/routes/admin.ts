import express from 'express';
import { z } from 'zod';

import { authenticateToken, requireAdmin } from '../middleware/auth.js';
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
      users,
    ] = await Promise.all([
      AnnouncementModel.getAdminCounts({ includeInactive: true }),
      AnnouncementModel.getManagePostsWorkspaceSummary({ includeInactive: true }),
      AnnouncementModel.getAdminQaCounts({ includeInactive: true }),
      AnnouncementModel.getPendingSlaSummary({ includeInactive: true, staleLimit: 5 }),
      AnnouncementModel.findAllAdmin({ sort: 'newest', limit: 10, includeInactive: true }),
      UserModelMongo.findAll({ limit: 1 }), // Just to get a count signal
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
// SETTINGS (lightweight in-memory for now)
// ═══════════════════════════════════════════

router.get('/settings', async (_req, res) => {
  try {
    // Return current config-based settings (read-only for now)
    const { config } = await import('../config.js');
    return res.json({
      data: {
        siteName: 'SarkariExams.me',
        siteDescription: 'Public government jobs and exam updates platform',
        frontendUrl: config.frontendUrl,
        featureFlags: config.featureFlags,
      },
    });
  } catch (error) {
    console.error('[Admin] Settings error:', error);
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

export default router;
