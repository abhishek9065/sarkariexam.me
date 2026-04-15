import express from 'express';
import { z } from 'zod';

import { cacheMiddleware, cacheKeys } from '../middleware/cache.js';
import { cacheControl } from '../middleware/cacheControl.js';
import { rateLimit } from '../middleware/rateLimit.js';
import AnnouncementModelPostgres from '../models/announcements.postgres.js';
import { getTopSearches, recordAnnouncementView, recordAnalyticsEvent } from '../services/analytics.js';
import { normalizeAttribution } from '../services/attribution.js';
import { Announcement, ContentType } from '../types.js';
import { getPathParam } from '../utils/routeParams.js';

const router = express.Router();
const HOMEPAGE_SECTION_TYPES: ContentType[] = ['job', 'result', 'admit-card', 'answer-key', 'syllabus', 'admission'];

type ListingCard = Awaited<ReturnType<typeof AnnouncementModelPostgres.findListingCards>>['data'][number];
type HomepageSections = Record<ContentType, ListingCard[]>;

// Add rate limiting info to responses
router.use((req, res, next) => {
  // Add API version header
  res.set('X-API-Version', '2.0.0');
  // Add request timestamp
  res.set('X-Request-Time', new Date().toISOString());
  next();
});

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
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// Search schema
const searchQuerySchema = z.object({
  q: z.string().trim().min(2).max(100),
  type: z
    .enum(['job', 'result', 'admit-card', 'syllabus', 'answer-key', 'admission'] as [ContentType, ...ContentType[]])
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
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
    .trim()
    .min(1)
    .max(64)
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
  AnnouncementModelPostgres.incrementViewCount(announcementId).catch(console.error);
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

  recordAnnouncementView(announcementId, {
    type: announcement.type,
    category: announcement.category ?? null,
    sourceClass: attribution.sourceClass,
    ...attribution,
  }).catch(console.error);

  if (attribution.sourceClass === 'in_app') {
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
  }

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

const createEmptyHomepageSections = (): HomepageSections => ({
  job: [],
  result: [],
  'admit-card': [],
  'answer-key': [],
  syllabus: [],
  admission: [],
});

const buildHomepageLatest = (sections: HomepageSections): ListingCard[] => {
  const seen = new Set<string>();

  return HOMEPAGE_SECTION_TYPES
    .flatMap((type) => sections[type])
    .sort((a, b) => {
      const left = a.postedAt ? new Date(a.postedAt).getTime() : 0;
      const right = b.postedAt ? new Date(b.postedAt).getTime() : 0;
      return right - left;
    })
    .filter((card) => {
      if (!card.id || seen.has(card.id)) return false;
      seen.add(card.id);
      return true;
    });
};

// Get all announcements - with caching (5 min server, 2 min browser)
router.get('/', cacheMiddleware({ ttl: 300, keyGenerator: cacheKeys.announcements }), cacheControl(120), async (req, res) => {
  try {
    const parseResult = querySchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.flatten() });
    }

    const filters = parseResult.data;
    const announcements = await AnnouncementModelPostgres.findAll(filters);

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
      const result = await AnnouncementModelPostgres.findAllWithCursor({
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

router.get(
  '/homepage',
  cacheMiddleware({
    ttl: 300,
    keyGenerator: cacheKeys.announcementsHomepage,
    onHit: (req, cachedData) => {
      const count = Array.isArray(cachedData?.data?.latest) ? cachedData.data.latest.length : 0;
      recordListingAnalytics(req, {
        count,
        source: 'home_feed',
      });
    },
  }),
  cacheControl(120),
  async (req, res) => {
    try {
      const settledResults = await Promise.allSettled(
        HOMEPAGE_SECTION_TYPES.map((type) =>
          AnnouncementModelPostgres.findListingCards({
            type,
            sort: 'newest',
            limit: 12,
            includeTotal: false,
          })
        )
      );

      const sections = createEmptyHomepageSections();
      let failedSections = 0;

      for (const [index, type] of HOMEPAGE_SECTION_TYPES.entries()) {
        const result = settledResults[index];
        if (result?.status === 'fulfilled') {
          sections[type] = result.value?.data ?? [];
          continue;
        }

        failedSections += 1;
        sections[type] = [];
        console.error(`Error fetching homepage section "${type}":`, result?.reason);
      }

      if (failedSections === HOMEPAGE_SECTION_TYPES.length) {
        return res.status(500).json({ error: 'Failed to fetch homepage announcement feed' });
      }

      const latest = buildHomepageLatest(sections);

      recordListingAnalytics(req, {
        count: latest.length,
        source: 'home_feed',
      });

      return res.json({
        data: {
          latest,
          sections,
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error fetching homepage announcement feed:', error);
      return res.status(500).json({ error: 'Failed to fetch homepage announcement feed' });
    }
  }
);

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
      const result = await AnnouncementModelPostgres.findListingCards({
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
        includeTotal: !filters.cursor, // Only fetch total on first page
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
        total: result.total,
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
      const categories = await AnnouncementModelPostgres.getCategories();
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
      const organizations = await AnnouncementModelPostgres.getOrganizations();
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
      const tags = await AnnouncementModelPostgres.getTags();
      return res.json({ data: tags });
    } catch (error) {
      console.error('Error fetching tags:', error);
      return res.status(500).json({ error: 'Failed to fetch tags' });
    }
  });

// Search suggestions for global overlay
router.get(
  '/search/suggest',
  rateLimit({ windowMs: 60 * 1000, maxRequests: 120, keyPrefix: 'announcements-suggest' }),
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
              AnnouncementModelPostgres.findListingCards({
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

        const trending = await AnnouncementModelPostgres.findListingCards({
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

      const matches = await AnnouncementModelPostgres.findListingCards({
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
  rateLimit({ windowMs: 60 * 1000, maxRequests: 60, keyPrefix: 'announcements-trending' }),
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
  rateLimit({ windowMs: 60 * 1000, maxRequests: 60, keyPrefix: 'announcements-search' }),
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

      const announcements = await AnnouncementModelPostgres.findAll({
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
      const announcement = await AnnouncementModelPostgres.findBySlug(getPathParam(req.params.slug));

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

export default router;
