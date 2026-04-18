import express from 'express';
import { z } from 'zod';

import { contentPageTypeValues, publicPostListQuerySchema, taxonomyTypeValues } from '../content/types.js';
import { cacheMiddleware } from '../middleware/cache.js';
import { cacheControl } from '../middleware/cacheControl.js';
import { getContentPageReadModel, getContentPostReadModel, getContentTaxonomyReadModel } from '../services/contentReadProvider.js';
import { postgresTokenSearchAdapter } from '../services/searchAdapter.js';

const router = express.Router();
const PostModel = getContentPostReadModel();
const TaxonomyModel = getContentTaxonomyReadModel();
const PageModel = getContentPageReadModel();

const homepageQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(12),
});

const taxonomyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const contentPageListQuerySchema = z.object({
  type: z.enum(contentPageTypeValues).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

router.get(
  '/homepage',
  cacheMiddleware({ ttl: 300 }),
  cacheControl(120),
  async (req, res) => {
    try {
      const parse = homepageQuerySchema.safeParse(req.query);
      if (!parse.success) {
        return res.status(400).json({ error: parse.error.flatten() });
      }

      const sections = await PostModel.getHomepageSections(parse.data.limit);
      return res.json({ data: sections });
    } catch (error) {
      console.error('[Content] Homepage error:', error);
      return res.status(500).json({ error: 'Failed to fetch homepage content' });
    }
  },
);

router.get(
  '/posts',
  cacheMiddleware({ ttl: 180 }),
  cacheControl(120),
  async (req, res) => {
    try {
      const parse = publicPostListQuerySchema.safeParse(req.query);
      if (!parse.success) {
        return res.status(400).json({ error: parse.error.flatten() });
      }

      const filters = postgresTokenSearchAdapter.normalize(parse.data);
      const result = await PostModel.findPublicCards({
        ...filters,
        status: parse.data.status,
        sort: parse.data.sort,
        limit: parse.data.limit,
        offset: parse.data.offset,
      });

      return res.json(result);
    } catch (error) {
      console.error('[Content] List posts error:', error);
      return res.status(500).json({ error: 'Failed to fetch posts' });
    }
  },
);

router.get(
  '/posts/:slug',
  cacheMiddleware({ ttl: 180 }),
  cacheControl(120),
  async (req, res) => {
    try {
      const detail = await PostModel.findBySlugOrLegacy(String(req.params.slug));
      if (!detail) {
        return res.status(404).json({ error: 'Post not found' });
      }
      return res.json({ data: detail });
    } catch (error) {
      console.error('[Content] Post detail error:', error);
      return res.status(500).json({ error: 'Failed to fetch post detail' });
    }
  },
);

router.get(
  '/pages',
  cacheMiddleware({ ttl: 300 }),
  cacheControl(180),
  async (req, res) => {
    try {
      const parse = contentPageListQuerySchema.safeParse(req.query);
      if (!parse.success) {
        return res.status(400).json({ error: parse.error.flatten() });
      }

      if (!parse.data.type) {
        return res.status(400).json({ error: 'type query param is required' });
      }

      const pages = await PageModel.listPublicByType(parse.data.type, parse.data.limit);
      return res.json({ data: pages });
    } catch (error) {
      console.error('[Content] Page list error:', error);
      return res.status(500).json({ error: 'Failed to fetch content pages' });
    }
  },
);

router.get(
  '/pages/:slug',
  cacheMiddleware({ ttl: 300 }),
  cacheControl(180),
  async (req, res) => {
    try {
      const page = await PageModel.findPublicBySlug(String(req.params.slug));
      if (!page) {
        return res.status(404).json({ error: 'Content page not found' });
      }
      return res.json({ data: page });
    } catch (error) {
      console.error('[Content] Page detail error:', error);
      return res.status(500).json({ error: 'Failed to fetch content page' });
    }
  },
);

router.get(
  '/taxonomies/:type',
  cacheMiddleware({ ttl: 600 }),
  cacheControl(300),
  async (req, res) => {
    try {
      const type = req.params.type as (typeof taxonomyTypeValues)[number];
      if (!(taxonomyTypeValues as readonly string[]).includes(type)) {
        return res.status(404).json({ error: 'Unknown taxonomy type' });
      }

      const parse = taxonomyQuerySchema.safeParse(req.query);
      if (!parse.success) {
        return res.status(400).json({ error: parse.error.flatten() });
      }

      const result = await TaxonomyModel.list(type, parse.data.limit);
      return res.json({ data: result });
    } catch (error) {
      console.error('[Content] Taxonomy list error:', error);
      return res.status(500).json({ error: 'Failed to fetch taxonomies' });
    }
  },
);

router.get(
  '/taxonomies/:type/:slug',
  cacheMiddleware({ ttl: 180 }),
  cacheControl(120),
  async (req, res) => {
    try {
      const type = req.params.type as (typeof taxonomyTypeValues)[number];
      if (!(taxonomyTypeValues as readonly string[]).includes(type)) {
        return res.status(404).json({ error: 'Unknown taxonomy type' });
      }

      const parse = taxonomyQuerySchema.safeParse(req.query);
      if (!parse.success) {
        return res.status(400).json({ error: parse.error.flatten() });
      }

      const landing = await PostModel.getTaxonomyLanding(type, String(req.params.slug), parse.data.limit);
      if (!landing) {
        return res.status(404).json({ error: 'Taxonomy not found' });
      }

      return res.json({ data: landing });
    } catch (error) {
      console.error('[Content] Taxonomy detail error:', error);
      return res.status(500).json({ error: 'Failed to fetch taxonomy landing page' });
    }
  },
);

export default router;
