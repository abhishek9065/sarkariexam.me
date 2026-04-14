import express from 'express';
import { z } from 'zod';

import { publicPostListQuerySchema, taxonomyTypeValues } from '../content/types.js';
import { cacheMiddleware } from '../middleware/cache.js';
import { cacheControl } from '../middleware/cacheControl.js';
import PostModelMongo from '../models/posts.mongo.js';
import mongoRegexSearchAdapter from '../services/searchAdapter.js';

const router = express.Router();

const homepageQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(12),
});

const taxonomyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
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

      const sections = await PostModelMongo.getHomepageSections(parse.data.limit);
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

      const filters = mongoRegexSearchAdapter.normalize(parse.data);
      const result = await PostModelMongo.findPublicCards({
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
      const detail = await PostModelMongo.findBySlugOrLegacy(String(req.params.slug));
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

      const result = await import('../models/contentTaxonomies.mongo.js').then((mod) =>
        mod.ContentTaxonomyModelMongo.list(type, parse.data.limit),
      );
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

      const landing = await PostModelMongo.getTaxonomyLanding(type, String(req.params.slug), parse.data.limit);
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
