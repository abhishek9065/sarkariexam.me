import express from 'express';
import { z } from 'zod';

import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { cacheMiddleware, cacheKeys } from '../middleware/cache.js';
import { cacheControl } from '../middleware/cacheControl.js';
import { bumpCacheVersion } from '../services/cacheVersion.js';
import { AnnouncementModelMongo as AnnouncementModel } from '../models/announcements.mongo.js';
import { ContentType, CreateAnnouncementDto } from '../types.js';
import { sendAnnouncementNotification } from '../services/telegram.js';
import { recordAnnouncementView, recordAnalyticsEvent } from '../services/analytics.js';

const router = express.Router();

const statusSchema = z.enum(['draft', 'pending', 'scheduled', 'published', 'archived']);
const dateField = z
  .string()
  .datetime()
  .optional()
  .or(z.literal(''))
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/));

const querySchema = z.object({
  type: z
    .enum(['job', 'result', 'admit-card', 'syllabus', 'answer-key', 'admission'] as [ContentType, ...ContentType[]])
    .optional(),
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  organization: z.string().trim().optional(),
  location: z.string().trim().optional(),
  qualification: z.string().trim().optional(),
  sort: z.enum(['newest', 'oldest', 'deadline']).default('newest'),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

// Search schema
const searchQuerySchema = z.object({
  q: z.string().trim().min(2),
  type: z
    .enum(['job', 'result', 'admit-card', 'syllabus', 'answer-key', 'admission'] as [ContentType, ...ContentType[]])
    .optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// Cursor-based pagination schema (v2)
const cursorQuerySchema = z.object({
  type: z
    .enum(['job', 'result', 'admit-card', 'syllabus', 'answer-key', 'admission'] as [ContentType, ...ContentType[]])
    .optional(),
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  organization: z.string().trim().optional(),
  location: z.string().trim().optional(),
  qualification: z.string().trim().optional(),
  sort: z.enum(['newest', 'oldest', 'deadline']).default('newest'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z
    .string()
    .regex(/^[a-fA-F0-9]{24}$/)
    .optional(), // Last seen ObjectId
});

const cacheGroupsToInvalidate = [
  'announcements',
  'trending',
  'search',
  'calendar',
  'categories',
  'organizations',
  'tags',
  'announcement',
];

async function invalidateAnnouncementCaches(): Promise<void> {
  await Promise.all(cacheGroupsToInvalidate.map(group => bumpCacheVersion(group)));
}

// Get all announcements - with caching (5 min server, 2 min browser)
router.get('/', cacheMiddleware({ ttl: 300, keyGenerator: cacheKeys.announcements }), cacheControl(120), async (req, res) => {
  try {
    const parseResult = querySchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.flatten() });
    }

    const filters = parseResult.data;
    const announcements = await AnnouncementModel.findAll(filters);

    return res.json({ data: announcements, count: announcements.length });
    } catch (error) {
    console.error('Error fetching announcements:', error);
    return res.status(500).json({ error: 'Failed to fetch announcements' });
    }
});

// V2: Cursor-based pagination (faster for large datasets)
router.get(
  '/v2',
  cacheMiddleware({ ttl: 300, keyGenerator: cacheKeys.announcementsV2 }),
  cacheControl(120),
  async (req, res) => {
    try {
    const parseResult = cursorQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.flatten() });
    }

    const filters = parseResult.data;
    const result = await AnnouncementModel.findAllWithCursor({
      ...filters,
      cursor: filters.cursor?.toString(),
    });

    return res.json({
      data: result.data,
      count: result.data.length,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
    } catch (error) {
    console.error('Error fetching announcements (v2):', error);
    return res.status(500).json({ error: 'Failed to fetch announcements' });
    }
});

// V3: OPTIMIZED listing cards (minimal fields, 60% less RU consumption)
router.get(
  '/v3/cards',
  cacheMiddleware({ ttl: 300, keyGenerator: cacheKeys.announcementsV3Cards }),
  cacheControl(120),
  async (req, res) => {
    try {
    const parseResult = cursorQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.flatten() });
    }

    const filters = parseResult.data;
    const result = await AnnouncementModel.findListingCards({
      type: filters.type,
      category: filters.category,
      limit: filters.limit,
      cursor: filters.cursor?.toString(),
    });

    const filterFlags = {
      type: Boolean(filters.type),
      category: Boolean(filters.category),
      search: Boolean(filters.search),
      organization: Boolean(filters.organization),
      location: Boolean(filters.location),
      qualification: Boolean(filters.qualification),
    };
    const hasFilter = Object.values(filterFlags).some(Boolean);
    const isCategoryOnly = (filterFlags.type || filterFlags.category) &&
      !filterFlags.search &&
      !filterFlags.organization &&
      !filterFlags.location &&
      !filterFlags.qualification;

    recordAnalyticsEvent({
      type: 'listing_view',
      metadata: {
        count: result.data.length,
        type: filters.type ?? null,
        category: filters.category ?? null,
      },
    }).catch(console.error);

    if (hasFilter) {
      recordAnalyticsEvent({
        type: 'filter_apply',
        metadata: {
          ...filterFlags,
          type: filters.type ?? null,
          category: filters.category ?? null,
        },
      }).catch(console.error);
    }

    if (isCategoryOnly) {
      recordAnalyticsEvent({
        type: 'category_click',
        metadata: {
          type: filters.type ?? null,
          category: filters.category ?? null,
        },
      }).catch(console.error);
    }

    return res.json({
      data: result.data,
      count: result.data.length,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
    } catch (error) {
    console.error('Error fetching listing cards (v3):', error);
    return res.status(500).json({ error: 'Failed to fetch listing cards' });
    }
});

// Get categories - long cache (1 hour)
router.get(
  '/meta/categories',
  cacheMiddleware({ ttl: 3600, keyGenerator: cacheKeys.categories }),
  cacheControl(1800),
  async (_req, res) => {
  try {
    const categories = await AnnouncementModel.getCategories();
    return res.json({ data: categories });
    } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Get organizations - long cache (1 hour)
router.get(
  '/meta/organizations',
  cacheMiddleware({ ttl: 3600, keyGenerator: cacheKeys.organizations }),
  cacheControl(1800),
  async (_req, res) => {
  try {
    const organizations = await AnnouncementModel.getOrganizations();
    return res.json({ data: organizations });
    } catch (error) {
    console.error('Error fetching organizations:', error);
    return res.status(500).json({ error: 'Failed to fetch organizations' });
    }
});

// Get tags - medium cache (30 min)
router.get(
  '/meta/tags',
  cacheMiddleware({ ttl: 1800, keyGenerator: cacheKeys.tags }),
  cacheControl(600),
  async (_req, res) => {
  try {
    const tags = await AnnouncementModel.getTags();
    return res.json({ data: tags });
    } catch (error) {
    console.error('Error fetching tags:', error);
    return res.status(500).json({ error: 'Failed to fetch tags' });
    }
});

// Search announcements (cached)
router.get(
  '/search',
  cacheMiddleware({ ttl: 300, keyGenerator: cacheKeys.search }),
  cacheControl(120),
  async (req, res) => {
    try {
      const parseResult = searchQuerySchema.safeParse(req.query);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.flatten() });
      }

      const filters = parseResult.data;
      const announcements = await AnnouncementModel.findAll({
        search: filters.q,
        type: filters.type,
        limit: filters.limit,
        offset: filters.offset,
      });

      recordAnalyticsEvent({
        type: 'search',
        metadata: {
          queryLength: filters.q.length,
          type: filters.type ?? null,
        },
      }).catch(console.error);

      return res.json({ data: announcements, count: announcements.length });
    } catch (error) {
      console.error('Error searching announcements:', error);
      return res.status(500).json({ error: 'Failed to search announcements' });
    }
  }
);

// Get single announcement by slug - with caching (10 min server, 5 min browser)
router.get('/:slug', cacheMiddleware({ ttl: 600, keyGenerator: cacheKeys.announcementBySlug }), cacheControl(300), async (req, res) => {
  try {
    const announcement = await AnnouncementModel.findBySlug(req.params.slug);

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    // Increment view count (fire and forget, don't block response)
    AnnouncementModel.incrementViewCount(String(announcement.id)).catch(console.error);
    recordAnnouncementView(String(announcement.id)).catch(console.error);
    recordAnalyticsEvent({
      type: 'card_click',
      announcementId: String(announcement.id),
      metadata: { type: announcement.type },
    }).catch(console.error);

    return res.json({ data: announcement });
    } catch (error) {
    console.error('Error fetching announcement:', error);
    return res.status(500).json({ error: 'Failed to fetch announcement' });
    }
});

// Create announcement schema
const createAnnouncementBaseSchema = z.object({
  title: z.string().min(10).max(500),
  type: z.enum(['job', 'result', 'admit-card', 'syllabus', 'answer-key', 'admission'] as [ContentType, ...ContentType[]]),
  category: z.string().min(3).max(255),
  organization: z.string().min(2).max(255),
  content: z.string().optional(),
  externalLink: z.string().url().optional().or(z.literal('')),
  location: z.string().optional().or(z.literal('')),
  deadline: dateField,
  minQualification: z.string().optional().or(z.literal('')),
  ageLimit: z.string().optional().or(z.literal('')),
  applicationFee: z.string().optional().or(z.literal('')),
  totalPosts: z.number().int().positive().optional(),
  status: statusSchema.optional(),
  publishAt: dateField,
  approvedAt: dateField,
  approvedBy: z.string().optional(),
  tags: z.array(z.string()).optional(),
  importantDates: z.array(z.object({
    eventName: z.string(),
    eventDate: z.string(),
    description: z.string().optional(),
  })).optional(),
  // Extended job details for comprehensive postings (UP Police style)
  jobDetails: z.object({
    importantDates: z.array(z.object({ name: z.string(), date: z.string() })).optional(),
    applicationFees: z.array(z.object({ category: z.string(), amount: z.number() })).optional(),
    ageLimits: z.object({
      minAge: z.number().optional(),
      maxAge: z.number().optional(),
      asOnDate: z.string().optional(),
      relaxations: z.array(z.object({ category: z.string(), years: z.number(), maxAge: z.number() })).optional(),
    }).optional(),
    vacancies: z.object({
      total: z.number().optional(),
      details: z.array(z.object({ category: z.string(), male: z.number(), female: z.number(), total: z.number() })).optional(),
    }).optional(),
    eligibility: z.object({
      nationality: z.string().optional(),
      domicile: z.string().optional(),
      education: z.string().optional(),
      additional: z.array(z.string()).optional(),
    }).optional(),
    salary: z.object({
      payLevel: z.string().optional(),
      payScale: z.string().optional(),
      inHandSalary: z.string().optional(),
    }).optional(),
    physicalRequirements: z.object({
      male: z.object({
        heightGeneral: z.string().optional(),
        heightSCST: z.string().optional(),
        chestNormal: z.string().optional(),
        chestExpanded: z.string().optional(),
        running: z.string().optional(),
      }).optional(),
      female: z.object({
        heightGeneral: z.string().optional(),
        heightSCST: z.string().optional(),
        running: z.string().optional(),
      }).optional(),
    }).optional(),
    examPattern: z.object({
      totalQuestions: z.number().optional(),
      totalMarks: z.number().optional(),
      duration: z.string().optional(),
      negativeMarking: z.string().optional(),
      subjects: z.array(z.object({ name: z.string(), questions: z.number(), marks: z.number() })).optional(),
    }).optional(),
    selectionProcess: z.array(z.object({ step: z.number(), name: z.string(), description: z.string() })).optional(),
    howToApply: z.array(z.string()).optional(),
    importantLinks: z.array(z.object({ label: z.string(), url: z.string(), type: z.string() })).optional(),
    faqs: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
  }).optional(),
});

const createAnnouncementSchema = createAnnouncementBaseSchema.superRefine((data, ctx) => {
  if (data.status === 'scheduled' && (!data.publishAt || data.publishAt === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'publishAt is required for scheduled announcements',
      path: ['publishAt'],
    });
  }
});

const createAnnouncementPartialSchema = createAnnouncementBaseSchema.partial().superRefine((data, ctx) => {
  if (data.status === 'scheduled' && (!data.publishAt || data.publishAt === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'publishAt is required for scheduled announcements',
      path: ['publishAt'],
    });
  }
});

// Create announcement (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const parseResult = createAnnouncementSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.flatten() });
    }

    const data = parseResult.data;
    const announcement = await AnnouncementModel.create(data as unknown as CreateAnnouncementDto, req.user!.userId);

    // Send Telegram notification (async, don't block response)
    sendAnnouncementNotification(announcement).catch(err => {
      console.error('Failed to send Telegram notification:', err);
    });

    // Note: Push notifications and email subscriptions removed (PostgreSQL dependency)
    // These can be re-implemented with MongoDB if needed

    await invalidateAnnouncementCaches().catch(err => {
      console.error('Failed to invalidate caches after create:', err);
    });

    return res.status(201).json({ data: announcement });
    } catch (error) {
    console.error('Error creating announcement:', error);
    return res.status(500).json({ error: 'Failed to create announcement' });
    }
});

// Update announcement (admin only)
router.patch('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id; // String ID for MongoDB
    if (!id || id.length < 1) {
      return res.status(400).json({ error: 'Invalid announcement ID' });
    }

    const updateSchema = createAnnouncementPartialSchema;
    const parseResult = updateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.flatten() });
    }

    const announcement = await AnnouncementModel.update(id, parseResult.data as unknown as Partial<CreateAnnouncementDto>, req.user?.userId);
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    await invalidateAnnouncementCaches().catch(err => {
      console.error('Failed to invalidate caches after update:', err);
    });

    return res.json({ data: announcement });
    } catch (error) {
    console.error('Error updating announcement:', error);
    return res.status(500).json({ error: 'Failed to update announcement' });
    }
});



// Delete announcement (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id; // String ID for MongoDB
    if (!id || id.length < 1) {
      return res.status(400).json({ error: 'Invalid announcement ID' });
    }

    const deleted = await AnnouncementModel.delete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    await invalidateAnnouncementCaches().catch(err => {
      console.error('Failed to invalidate caches after delete:', err);
    });

    return res.json({ message: 'Announcement deleted successfully' });
    } catch (error) {
    console.error('Error deleting announcement:', error);
    return res.status(500).json({ error: 'Failed to delete announcement' });
    }
});

// Export announcements as CSV (admin only)
router.get('/export/csv', authenticateToken, requireAdmin, async (_req, res) => {
  try {
    const announcements = await AnnouncementModel.findAll({ limit: 1000 });

    // CSV headers
    const headers = ['ID', 'Title', 'Type', 'Category', 'Organization', 'Location', 'Total Posts', 'Deadline', 'External Link'];

    // Convert to CSV rows
    const rows = announcements.map(a => [
      a.id,
      `"${(a.title || '').replace(/"/g, '""')}"`,
      a.type,
      `"${(a.category || '').replace(/"/g, '""')}"`,
      `"${(a.organization || '').replace(/"/g, '""')}"`,
      `"${(a.location || '').replace(/"/g, '""')}"`,
      a.totalPosts || '',
      a.deadline || '',
      a.externalLink || ''
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="announcements-${new Date().toISOString().split('T')[0]}.csv"`);

    return res.send(csv);
    } catch (error) {
    console.error('Error exporting announcements:', error);
    return res.status(500).json({ error: 'Failed to export announcements' });
    }
});

export default router;
