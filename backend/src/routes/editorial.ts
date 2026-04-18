import express from 'express';
import { rateLimit as expressRateLimit } from 'express-rate-limit';

import {
  alertSubscriptionAdminQuerySchema,
  adminPostListQuerySchema,
  type PostRecord,
  postEditorSchema,
  taxonomyEditorSchema,
  taxonomyTypeValues,
  workflowNoteSchema,
} from '../content/types.js';
import { authenticateToken, requireEditorialAccess, requireRoles } from '../middleware/auth.js';
import AlertSubscriptionModelPostgres from '../models/alertSubscriptions.postgres.js';
import { getEditorialDataProvider } from '../services/editorialDataProvider.js';
import { triggerFrontendRevalidation } from '../services/frontendRevalidation.js';

const router = express.Router();
const { postModel, taxonomyModel, auditLogModel } = getEditorialDataProvider();

router.use(expressRateLimit({
  windowMs: 60 * 1000,
  limit: 240,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
}));

async function buildEditorialResponse(post: PostRecord | null, forceRevalidate = false) {
  if (!post) {
    return { data: post };
  }

  if (!forceRevalidate && !['published', 'archived'].includes(post.status)) {
    return { data: post };
  }

  const revalidation = await triggerFrontendRevalidation(post);
  return { data: post, revalidation };
}

router.use(authenticateToken);
router.use(requireEditorialAccess);

router.get('/dashboard', async (_req, res) => {
  try {
    const [allPosts, livePosts, reviewPosts] = await Promise.all([
      postModel.findAdmin({ limit: 10, offset: 0, sort: 'updated', status: 'all' }),
      postModel.findAdmin({ limit: 100, offset: 0, status: 'published' }),
      postModel.findAdmin({ limit: 100, offset: 0, status: 'in_review' }),
    ]);

    const byType = allPosts.data.reduce<Record<string, number>>((acc, post) => {
      acc[post.type] = (acc[post.type] || 0) + 1;
      return acc;
    }, {});

    const byStatus = ['draft', 'in_review', 'approved', 'published', 'archived'].reduce<Record<string, number>>((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {});
    for (const post of allPosts.data) {
      byStatus[post.status] = (byStatus[post.status] || 0) + 1;
    }

    return res.json({
      data: {
        total: allPosts.total,
        published: livePosts.total,
        inReview: reviewPosts.total,
        byType,
        byStatus,
        recentPosts: allPosts.data.slice(0, 8),
      },
    });
  } catch (error) {
    console.error('[Editorial] Dashboard error:', error);
    return res.status(500).json({ error: 'Failed to load editorial dashboard' });
  }
});

router.get('/posts', async (req, res) => {
  try {
    const parse = adminPostListQuerySchema.safeParse(req.query);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const result = await postModel.findAdmin(parse.data);
    return res.json(result);
  } catch (error) {
    console.error('[Editorial] List posts error:', error);
    return res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

router.get('/posts/:id', async (req, res) => {
  try {
    const post = await postModel.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    return res.json({ data: post });
  } catch (error) {
    console.error('[Editorial] Get post error:', error);
    return res.status(500).json({ error: 'Failed to fetch post' });
  }
});

router.post('/posts', requireRoles('editor', 'reviewer', 'admin', 'superadmin'), async (req, res) => {
  try {
    const parse = postEditorSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const userId = req.user?.userId;
    const role = req.user?.role;
    const payload = {
      ...parse.data,
      officialSources: parse.data.officialSources ?? [],
      categories: parse.data.categories ?? [],
      states: parse.data.states ?? [],
      qualifications: parse.data.qualifications ?? [],
      importantDates: parse.data.importantDates ?? [],
      eligibility: parse.data.eligibility ?? [],
      feeRules: parse.data.feeRules ?? [],
      vacancyRows: parse.data.vacancyRows ?? [],
      admissionPrograms: parse.data.admissionPrograms ?? [],
      trust: {
        verificationNote: parse.data.verificationNote,
        officialSources: parse.data.officialSources ?? [],
      },
    } as any;
    const post = await postModel.create(
      { ...payload, status: 'draft' },
      userId,
      role,
      parse.data.versionNote,
    );

    return res.status(201).json({ data: post });
  } catch (error) {
    console.error('[Editorial] Create post error:', error);
    return res.status(500).json({ error: 'Failed to create post' });
  }
});

router.put('/posts/:id', requireRoles('editor', 'reviewer', 'admin', 'superadmin'), async (req, res) => {
  try {
    const parse = postEditorSchema.partial().safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const userId = req.user?.userId;
    const role = req.user?.role;
    const payload = parse.data;
    const post = await postModel.update(
      String(req.params.id),
      {
        ...payload,
        trust: {
          verificationNote: payload.verificationNote,
          officialSources: payload.officialSources ?? [],
        },
      } as any,
      userId,
      role,
      payload.versionNote,
    );
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    return res.json(await buildEditorialResponse(post));
  } catch (error) {
    console.error('[Editorial] Update post error:', error);
    return res.status(500).json({ error: 'Failed to update post' });
  }
});

router.post('/posts/:id/submit', requireRoles('editor', 'admin', 'superadmin'), async (req, res) => {
  try {
    const parse = workflowNoteSchema.safeParse(req.body ?? {});
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const post = await postModel.transition(String(req.params.id), 'submit', req.user?.userId, req.user?.role, parse.data.note);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    return res.json({ data: post });
  } catch (error) {
    console.error('[Editorial] Submit error:', error);
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to submit for review' });
  }
});

router.post('/posts/:id/approve', requireRoles('reviewer', 'admin', 'superadmin'), async (req, res) => {
  try {
    const parse = workflowNoteSchema.safeParse(req.body ?? {});
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }
    const post = await postModel.transition(String(req.params.id), 'approve', req.user?.userId, req.user?.role, parse.data.note);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    return res.json({ data: post });
  } catch (error) {
    console.error('[Editorial] Approve error:', error);
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to approve post' });
  }
});

router.post('/posts/:id/publish', requireRoles('admin', 'superadmin'), async (req, res) => {
  try {
    const parse = workflowNoteSchema.safeParse(req.body ?? {});
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }
    const post = await postModel.transition(String(req.params.id), 'publish', req.user?.userId, req.user?.role, parse.data.note);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    return res.json(await buildEditorialResponse(post, true));
  } catch (error) {
    console.error('[Editorial] Publish error:', error);
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to publish post' });
  }
});

router.post('/posts/:id/unpublish', requireRoles('admin', 'superadmin'), async (req, res) => {
  try {
    const parse = workflowNoteSchema.safeParse(req.body ?? {});
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }
    const post = await postModel.transition(String(req.params.id), 'unpublish', req.user?.userId, req.user?.role, parse.data.note);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    return res.json(await buildEditorialResponse(post, true));
  } catch (error) {
    console.error('[Editorial] Unpublish error:', error);
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to unpublish post' });
  }
});

router.post('/posts/:id/archive', requireRoles('admin', 'superadmin'), async (req, res) => {
  try {
    const parse = workflowNoteSchema.safeParse(req.body ?? {});
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }
    const post = await postModel.transition(String(req.params.id), 'archive', req.user?.userId, req.user?.role, parse.data.note);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    return res.json(await buildEditorialResponse(post, true));
  } catch (error) {
    console.error('[Editorial] Archive error:', error);
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to archive post' });
  }
});

router.post('/posts/:id/restore', requireRoles('admin', 'superadmin'), async (req, res) => {
  try {
    const parse = workflowNoteSchema.safeParse(req.body ?? {});
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }
    const post = await postModel.transition(String(req.params.id), 'restore', req.user?.userId, req.user?.role, parse.data.note);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    return res.json(await buildEditorialResponse(post, true));
  } catch (error) {
    console.error('[Editorial] Restore error:', error);
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to restore post' });
  }
});

router.get('/posts/:id/history', async (req, res) => {
  try {
    const history = await postModel.getHistory(String(req.params.id));
    return res.json({ data: history });
  } catch (error) {
    console.error('[Editorial] History error:', error);
    return res.status(500).json({ error: 'Failed to fetch post history' });
  }
});

router.get('/posts/:id/alert-preview', async (req, res) => {
  try {
    const preview = await postModel.getAlertMatchPreview(String(req.params.id));
    if (!preview) {
      return res.status(404).json({ error: 'Post not found' });
    }
    return res.json({ data: preview });
  } catch (error) {
    console.error('[Editorial] Alert preview error:', error);
    return res.status(500).json({ error: 'Failed to fetch alert preview' });
  }
});

router.get('/workflow/pending', async (_req, res) => {
  try {
    const result = await postModel.findAdmin({ status: 'in_review', limit: 100, sort: 'updated' });
    return res.json({ data: result.data });
  } catch (error) {
    console.error('[Editorial] Pending workflow error:', error);
    return res.status(500).json({ error: 'Failed to fetch pending approvals' });
  }
});

router.get('/workflow/freshness', async (_req, res) => {
  try {
    const result = await postModel.listFreshnessQueue(24);
    return res.json({ data: result });
  } catch (error) {
    console.error('[Editorial] Freshness queue error:', error);
    return res.status(500).json({ error: 'Failed to fetch freshness queue' });
  }
});

router.get('/workflow/sla', async (_req, res) => {
  try {
    const result = await postModel.findAdmin({ status: 'in_review', limit: 100, sort: 'updated' });
    const violations = result.data
      .filter((item) => Date.now() - new Date(item.updatedAt).getTime() > 48 * 60 * 60 * 1000)
      .map((item) => ({
        id: item.id,
        title: item.title,
        hoursOverdue: Math.floor((Date.now() - new Date(item.updatedAt).getTime()) / (60 * 60 * 1000)),
      }));
    return res.json({ data: violations });
  } catch (error) {
    console.error('[Editorial] SLA error:', error);
    return res.status(500).json({ error: 'Failed to fetch SLA violations' });
  }
});

router.get('/taxonomies/:type', async (req, res) => {
  try {
    const type = req.params.type as (typeof taxonomyTypeValues)[number];
    if (!(taxonomyTypeValues as readonly string[]).includes(type)) {
      return res.status(404).json({ error: 'Unknown taxonomy type' });
    }
    const data = await taxonomyModel.list(type, 200);
    return res.json({ data });
  } catch (error) {
    console.error('[Editorial] Taxonomy list error:', error);
    return res.status(500).json({ error: 'Failed to fetch taxonomies' });
  }
});

router.post('/taxonomies/:type', requireRoles('admin', 'superadmin'), async (req, res) => {
  try {
    const type = req.params.type as (typeof taxonomyTypeValues)[number];
    if (!(taxonomyTypeValues as readonly string[]).includes(type)) {
      return res.status(404).json({ error: 'Unknown taxonomy type' });
    }

    const parse = taxonomyEditorSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const created = await taxonomyModel.create(type, {
      name: parse.data.name,
      slug: parse.data.slug,
      description: parse.data.description,
      officialWebsite: parse.data.officialWebsite,
      shortName: parse.data.shortName,
      priority: parse.data.priority,
    });
    return res.status(201).json({ data: created });
  } catch (error) {
    console.error('[Editorial] Taxonomy create error:', error);
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create taxonomy' });
  }
});

router.put('/taxonomies/:type/:id', requireRoles('admin', 'superadmin'), async (req, res) => {
  try {
    const type = req.params.type as (typeof taxonomyTypeValues)[number];
    if (!(taxonomyTypeValues as readonly string[]).includes(type)) {
      return res.status(404).json({ error: 'Unknown taxonomy type' });
    }

    const parse = taxonomyEditorSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const updated = await taxonomyModel.update(type, String(req.params.id), {
      name: parse.data.name,
      slug: parse.data.slug,
      description: parse.data.description,
      officialWebsite: parse.data.officialWebsite,
      shortName: parse.data.shortName,
      priority: parse.data.priority,
    });
    if (!updated) {
      return res.status(404).json({ error: 'Taxonomy not found' });
    }

    return res.json({ data: updated });
  } catch (error) {
    console.error('[Editorial] Taxonomy update error:', error);
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update taxonomy' });
  }
});

router.delete('/taxonomies/:type/:id', requireRoles('admin', 'superadmin'), async (req, res) => {
  try {
    const type = req.params.type as (typeof taxonomyTypeValues)[number];
    if (!(taxonomyTypeValues as readonly string[]).includes(type)) {
      return res.status(404).json({ error: 'Unknown taxonomy type' });
    }

    const deleted = await taxonomyModel.remove(type, String(req.params.id));
    if (!deleted) {
      return res.status(404).json({ error: 'Taxonomy not found' });
    }

    return res.json({ message: 'Taxonomy deleted' });
  } catch (error) {
    console.error('[Editorial] Taxonomy delete error:', error);
    return res.status(500).json({ error: 'Failed to delete taxonomy' });
  }
});

router.get('/alert-subscriptions', requireRoles('admin', 'superadmin'), async (req, res) => {
  try {
    const parse = alertSubscriptionAdminQuerySchema.safeParse(req.query);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const result = await AlertSubscriptionModelPostgres.listAdmin(parse.data);
    return res.json(result);
  } catch (error) {
    console.error('[Editorial] Alert subscriptions list error:', error);
    return res.status(500).json({ error: 'Failed to fetch alert subscriptions' });
  }
});

router.get('/alert-subscriptions/stats', requireRoles('admin', 'superadmin'), async (_req, res) => {
  try {
    const data = await AlertSubscriptionModelPostgres.getStats();
    return res.json({ data });
  } catch (error) {
    console.error('[Editorial] Alert subscriptions stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch alert subscription stats' });
  }
});

router.delete('/alert-subscriptions/:id', requireRoles('admin', 'superadmin'), async (req, res) => {
  try {
    const deleted = await AlertSubscriptionModelPostgres.deleteById(String(req.params.id));
    if (!deleted) {
      return res.status(404).json({ error: 'Alert subscription not found' });
    }
    return res.json({ message: 'Alert subscription deleted' });
  } catch (error) {
    console.error('[Editorial] Alert subscription delete error:', error);
    return res.status(500).json({ error: 'Failed to delete alert subscription' });
  }
});

router.get('/audit-log', requireRoles('admin', 'superadmin'), async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 50), 200);
    const offset = Math.max(Number(req.query.offset || 0), 0);
    const data = await auditLogModel.list({ limit, offset });
    return res.json({ data, total: data.length, count: data.length });
  } catch (error) {
    console.error('[Editorial] Audit log error:', error);
    return res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

export default router;
