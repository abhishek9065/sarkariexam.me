import express from 'express';
import { z } from 'zod';

import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { cacheMiddleware, cacheKeys } from '../middleware/cache.js';
import { cacheControl } from '../middleware/cacheControl.js';
import { AnnouncementModelMongo as AnnouncementModel } from '../models/announcements.mongo.js';
import { getTopSearches, recordAnnouncementView, recordAnalyticsEvent } from '../services/analytics.js';
import { normalizeAttribution } from '../services/attribution.js';
import { invalidateAnnouncementCaches } from '../services/cacheInvalidation.js';
import { dispatchAnnouncementToSubscribers } from '../services/subscriberDispatch.js';
import { sendAnnouncementNotification } from '../services/telegram.js';
import { Announcement, ContentType, CreateAnnouncementDto } from '../types.js';

const router = express.Router();

// Add rate limiting info to responses
router.use((req, res, next) => {
    // Add API version header
    res.set('X-API-Version', '2.0.0');
    // Add request timestamp
    res.set('X-Request-Time', new Date().toISOString());
    next();
});

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
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().max(50).optional(),
  organization: z.string().trim().max(100).optional(),
  location: z.string().trim().max(50).optional(),
  qualification: z.string().trim().max(50).optional(),
  salaryMin: z.coerce.number().min(0).optional(),
  salaryMax: z.coerce.number().min(0).optional(),
  sort: z.enum(['newest', 'oldest', 'deadline', 'views']).default('newest'),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

// Search schema
const searchQuerySchema = z.object({
  q: z.string().trim().min(2).max(100),
  type: z
    .enum(['job', 'result', 'admit-card', 'syllabus', 'answer-key', 'admission'] as [ContentType, ...ContentType[]])
    .optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
const suggestQuerySchema = z.object({
  q: z.string().trim().max(80).optional().default(''),
  type: z
    .enum(['job', 'result', 'admit-card', 'syllabus', 'answer-key', 'admission'] as [ContentType, ...ContentType[]])
    .optional(),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});
const trendingSearchQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
  limit: z.coerce.number().int().min(1).max(20).default(8),
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
  salaryMin: z.coerce.number().min(0).optional(),
  salaryMax: z.coerce.number().min(0).optional(),
  sort: z.enum(['newest', 'oldest', 'deadline', 'views']).default('newest'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z
    .string()
    .regex(/^[a-fA-F0-9]{24}$/)
    .optional(), // Last seen ObjectId
});

const normalizeSearchTerm = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!trimmed) return null;
  return trimmed.slice(0, 80).toLowerCase();
};

const pickQueryValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
};

const isPrefetchRequest = (req: express.Request): boolean => {
  const prefetchParam = pickQueryValue(req.query.prefetch);
  if (prefetchParam === '1' || prefetchParam === 'true') return true;
  const purpose = req.headers['purpose'] ?? req.headers['sec-purpose'];
  if (typeof purpose === 'string' && purpose.toLowerCase().includes('prefetch')) return true;
  return false;
};

const recordListingAnalytics = (req: express.Request, options: {
  count: number;
  type?: string | null;
  category?: string | null;
  search?: string | null;
  organization?: string | null;
  location?: string | null;
  qualification?: string | null;
  source?: string | null;
}) => {
  if (isPrefetchRequest(req)) return;
  const normalizedSearch = normalizeSearchTerm(options.search);
  const attribution = normalizeAttribution({
    source: options.source ?? pickQueryValue(req.query.source),
    utmSource: pickQueryValue(req.query.utm_source),
    medium: pickQueryValue(req.query.medium),
    utmMedium: pickQueryValue(req.query.utm_medium),
    campaign: pickQueryValue(req.query.campaign),
    utmCampaign: pickQueryValue(req.query.utm_campaign),
  });
  recordAnalyticsEvent({
    type: 'listing_view',
    metadata: {
      count: options.count,
      type: options.type ?? null,
      category: options.category ?? null,
      source: attribution.source,
      sourceClass: attribution.sourceClass,
    },
  }).catch(console.error);

  const filterFlags = {
    type: Boolean(options.type),
    category: Boolean(options.category),
    search: Boolean(options.search),
    organization: Boolean(options.organization),
    location: Boolean(options.location),
    qualification: Boolean(options.qualification),
  };
  const hasFilter = Object.values(filterFlags).some(Boolean);
  const isCategoryOnly = (filterFlags.type || filterFlags.category) &&
    !filterFlags.search &&
    !filterFlags.organization &&
    !filterFlags.location &&
    !filterFlags.qualification;

  if (hasFilter) {
    recordAnalyticsEvent({
      type: 'filter_apply',
      metadata: {
        ...filterFlags,
        type: options.type ?? null,
        category: options.category ?? null,
      },
    }).catch(console.error);
  }

  if (isCategoryOnly) {
    recordAnalyticsEvent({
      type: 'category_click',
      metadata: {
        type: options.type ?? null,
        category: options.category ?? null,
      },
    }).catch(console.error);
  }

  if (options.search) {
    recordAnalyticsEvent({
      type: 'search',
      metadata: {
        query: normalizedSearch,
        resultsCount: options.count,
        queryLength: options.search.length,
        typeFilter: options.type ?? null,
        source: attribution.source ?? 'category_query',
      },
    }).catch(console.error);
  }
};

const recordAnnouncementAnalytics = (req: express.Request, announcement: Announcement) => {
  const announcementId = String(announcement.id);
  AnnouncementModel.incrementViewCount(announcementId).catch(console.error);
  recordAnnouncementView(announcementId).catch(console.error);
  const attribution = normalizeAttribution({
    source: pickQueryValue(req.query.source),
    utmSource: pickQueryValue(req.query.utm_source),
    medium: pickQueryValue(req.query.medium),
    utmMedium: pickQueryValue(req.query.utm_medium),
    campaign: pickQueryValue(req.query.campaign),
    utmCampaign: pickQueryValue(req.query.utm_campaign),
    content: pickQueryValue(req.query.content),
    utmContent: pickQueryValue(req.query.utm_content),
    term: pickQueryValue(req.query.term),
    utmTerm: pickQueryValue(req.query.utm_term),
    variant: pickQueryValue(req.query.variant),
    ab: pickQueryValue(req.query.ab),
    digest: pickQueryValue(req.query.digest),
    frequency: pickQueryValue(req.query.frequency),
    ref: pickQueryValue(req.query.ref),
  });

  recordAnalyticsEvent({
    type: 'card_click',
    announcementId,
    metadata: {
      type: announcement.type,
      category: announcement.category ?? null,
      sourceClass: attribution.sourceClass,
      ...attribution,
    },
  }).catch(console.error);

  const hasAttribution = Object.values(attribution).some((value) => value);
  if (hasAttribution) {
    recordAnalyticsEvent({
      type: 'deep_link_click',
      announcementId,
      metadata: {
        type: announcement.type,
        category: announcement.category ?? null,
        sourceClass: attribution.sourceClass,
        ...attribution,
      },
    }).catch(console.error);
  }

  if (attribution.isDigest) {
    recordAnalyticsEvent({
      type: 'digest_click',
      announcementId,
      metadata: {
        type: announcement.type,
        category: announcement.category ?? null,
        sourceClass: attribution.sourceClass,
        ...attribution,
      },
    }).catch(console.error);
  }
};

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
  cacheMiddleware({
    ttl: 300,
    keyGenerator: cacheKeys.announcementsV3Cards,
    onHit: (req, cachedData) => {
      const type = pickQueryValue(req.query.type);
      const category = pickQueryValue(req.query.category);
      const search = pickQueryValue(req.query.search);
      const organization = pickQueryValue(req.query.organization);
      const location = pickQueryValue(req.query.location);
      const qualification = pickQueryValue(req.query.qualification);
      const source = pickQueryValue(req.query.source);
      const count = Array.isArray(cachedData?.data) ? cachedData.data.length : 0;

      recordListingAnalytics(req, {
        count,
        type,
        category,
        search,
        organization,
        location,
        qualification,
        source,
      });
    },
  }),
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
      search: filters.search,
      organization: filters.organization,
      location: filters.location,
      qualification: filters.qualification,
      salaryMin: filters.salaryMin,
      salaryMax: filters.salaryMax,
      sort: filters.sort,
      limit: filters.limit,
      cursor: filters.cursor?.toString(),
    });

    recordListingAnalytics(req, {
      count: result.data.length,
      type: filters.type ?? null,
      category: filters.category ?? null,
      search: filters.search ?? null,
      organization: filters.organization ?? null,
      location: filters.location ?? null,
      qualification: filters.qualification ?? null,
      source: pickQueryValue(req.query.source) ?? null,
    });

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

// Search suggestions for global overlay
router.get(
  '/search/suggest',
  cacheMiddleware({
    ttl: 180,
    keyGenerator: (req) => `search-suggest:q:${req.query.q || ''}:type:${req.query.type || 'all'}:limit:${req.query.limit || 8}`,
  }),
  cacheControl(60),
  async (req, res) => {
    try {
      const parseResult = suggestQuerySchema.safeParse(req.query);
      if (!parseResult.success) {
        return res.status(400).json({
          error: 'Invalid suggest parameters',
          details: parseResult.error.flatten().fieldErrors,
        });
      }

      const { q, type, limit } = parseResult.data;
      const query = q.replace(/[<>"'&$]/g, '').trim();
      const effectiveLimit = Math.min(20, Math.max(1, limit));

      // For very short queries prioritize query-frequency trends, then fall back to views.
      if (query.length < 2) {
        const topQueries = await getTopSearches(30, effectiveLimit);
        if (topQueries.length > 0) {
          const cards = await Promise.all(
            topQueries.map((row) =>
              AnnouncementModel.findListingCards({
                type,
                search: row.query,
                sort: 'views',
                limit: 1,
              })
            )
          );

          const dedupedBySlug = new Map<string, { title: string; slug: string; type: ContentType; organization?: string }>();
          for (const result of cards) {
            const first = result.data[0];
            if (!first?.slug || dedupedBySlug.has(first.slug)) continue;
            dedupedBySlug.set(first.slug, {
              title: first.title,
              slug: first.slug,
              type: first.type as ContentType,
              organization: first.organization || undefined,
            });
            if (dedupedBySlug.size >= effectiveLimit) break;
          }

          if (dedupedBySlug.size > 0) {
            return res.json({ data: Array.from(dedupedBySlug.values()) });
          }
        }

        const trending = await AnnouncementModel.findListingCards({
          type,
          sort: 'views',
          limit: effectiveLimit,
        });
        const data = trending.data.map((item) => ({
          title: item.title,
          slug: item.slug,
          type: item.type as ContentType,
          organization: item.organization || undefined,
        }));
        return res.json({ data });
      }

      const matches = await AnnouncementModel.findListingCards({
        type,
        search: query,
        sort: 'views',
        limit: Math.min(50, effectiveLimit * 3),
      });

      const deduped = new Map<string, { title: string; slug: string; type: ContentType; organization?: string }>();
      for (const item of matches.data) {
        if (!item.slug || deduped.has(item.slug)) continue;
        deduped.set(item.slug, {
          title: item.title,
          slug: item.slug,
          type: item.type as ContentType,
          organization: item.organization || undefined,
        });
        if (deduped.size >= effectiveLimit) break;
      }

      recordAnalyticsEvent({
        type: 'search',
        metadata: {
          query: normalizeSearchTerm(query),
          resultsCount: deduped.size,
          queryLength: query.length,
          typeFilter: type ?? null,
          source: 'suggest',
        },
      }).catch(console.error);

      return res.json({ data: Array.from(deduped.values()) });
    } catch (error) {
      console.error('Error fetching search suggestions:', error);
      return res.status(500).json({ error: 'Failed to fetch search suggestions' });
    }
  }
);

// Top search terms (query-frequency driven trending chips)
router.get(
  '/search/trending',
  cacheMiddleware({
    ttl: 180,
    keyGenerator: (req) => `search-trending:days:${req.query.days || 30}:limit:${req.query.limit || 8}`,
  }),
  cacheControl(60),
  async (req, res) => {
    try {
      const parseResult = trendingSearchQuerySchema.safeParse(req.query);
      if (!parseResult.success) {
        return res.status(400).json({
          error: 'Invalid trending parameters',
          details: parseResult.error.flatten().fieldErrors,
        });
      }

      const { days, limit } = parseResult.data;
      const data = await getTopSearches(days, limit);
      return res.json({ data });
    } catch (error) {
      console.error('Error fetching trending searches:', error);
      return res.status(500).json({ error: 'Failed to fetch trending searches' });
    }
  }
);

// Search announcements (cached)
router.get(
  '/search',
  cacheMiddleware({ ttl: 300, keyGenerator: cacheKeys.search }),
  cacheControl(120),
  async (req, res) => {
    try {
      const parseResult = searchQuerySchema.safeParse(req.query);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: 'Invalid search parameters',
          details: parseResult.error.flatten().fieldErrors
        });
      }

      const filters = parseResult.data;
      
      // Sanitize search query to prevent injection attacks
      const sanitizedQuery = filters.q.replace(/[<>"'&$]/g, '').trim();
      if (sanitizedQuery.length < 2) {
        return res.status(400).json({ 
          error: 'Search query too short',
          message: 'Search query must be at least 2 characters after sanitization'
        });
      }
      const normalizedQuery = normalizeSearchTerm(sanitizedQuery);
      
      const announcements = await AnnouncementModel.findAll({
        search: sanitizedQuery,
        type: filters.type,
        limit: filters.limit,
        offset: filters.offset,
      });

      recordAnalyticsEvent({
        type: 'search',
        metadata: {
          query: normalizedQuery,
          resultsCount: announcements.length,
          queryLength: filters.q.length,
          typeFilter: filters.type ?? null,
          source: pickQueryValue(req.query.source) ?? 'overlay_submit',
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
router.get(
  '/:slug',
  cacheMiddleware({
    ttl: 600,
    keyGenerator: cacheKeys.announcementBySlug,
    onHit: (req, cachedData) => {
      const announcement = cachedData?.data as Announcement | undefined;
      if (!announcement) return;
      if (isPrefetchRequest(req)) return;
      recordAnnouncementAnalytics(req, announcement);
    },
  }),
  cacheControl(300),
  async (req, res) => {
  try {
    const announcement = await AnnouncementModel.findBySlug(req.params.slug);

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    if (!isPrefetchRequest(req)) {
      recordAnnouncementAnalytics(req, announcement);
    }

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
  salaryMin: z.coerce.number().min(0).optional(),
  salaryMax: z.coerce.number().min(0).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  cutoffMarks: z.string().trim().optional().or(z.literal('')),
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
router.post('/', authenticateToken, requirePermission('announcements:write'), async (req, res) => {
  try {
    const parseResult = createAnnouncementSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.flatten() });
    }

    const data = parseResult.data;
    const announcement = await AnnouncementModel.create(data as CreateAnnouncementDto, req.user!.userId);

    // Send Telegram notification (async, don't block response)
    sendAnnouncementNotification(announcement).catch(err => {
      console.error('Failed to send Telegram notification:', err);
    });

    if (announcement.status === 'published' && announcement.isActive) {
      dispatchAnnouncementToSubscribers(announcement, { frequency: 'instant' }).catch((err) => {
        console.error('Failed to dispatch publish notifications:', err);
      });
    }

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
router.patch('/:id', authenticateToken, requirePermission('announcements:write'), async (req, res) => {
  try {
    const id = req.params.id; // String ID for MongoDB
    if (!id || id.length < 1) {
      return res.status(400).json({ error: 'Invalid announcement ID' });
    }

    const existing = await AnnouncementModel.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    const updateSchema = createAnnouncementPartialSchema;
    const parseResult = updateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.flatten() });
    }

    const announcement = await AnnouncementModel.update(id, parseResult.data as Partial<CreateAnnouncementDto>, req.user?.userId);
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    if (existing.status !== 'published' && announcement.status === 'published' && announcement.isActive) {
      dispatchAnnouncementToSubscribers(announcement, { frequency: 'instant' }).catch((err) => {
        console.error('Failed to dispatch publish notifications:', err);
      });
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
router.delete('/:id', authenticateToken, requirePermission('announcements:delete'), async (req, res) => {
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
router.get('/export/csv', authenticateToken, requirePermission('announcements:read'), async (_req, res) => {
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
