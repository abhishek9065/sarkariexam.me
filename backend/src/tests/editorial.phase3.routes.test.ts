import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  bulkTransitionMock,
  listAlertImpactQueueMock,
  listFreshnessQueueMock,
  listSearchReadinessQueueMock,
  listSeoQueueMock,
  listTrustQueueMock,
  sweepExpiredPublishedPostsMock,
  updatePostMock,
  getPreferenceCoverageMock,
  triggerFrontendRevalidationMock,
} = vi.hoisted(() => ({
  bulkTransitionMock: vi.fn(),
  listAlertImpactQueueMock: vi.fn(),
  listFreshnessQueueMock: vi.fn(),
  listSearchReadinessQueueMock: vi.fn(),
  listSeoQueueMock: vi.fn(),
  listTrustQueueMock: vi.fn(),
  sweepExpiredPublishedPostsMock: vi.fn(),
  updatePostMock: vi.fn(),
  getPreferenceCoverageMock: vi.fn(),
  triggerFrontendRevalidationMock: vi.fn(),
}));

let currentRole = 'admin';

vi.mock('../middleware/auth.js', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { userId: 'user-phase3', role: currentRole };
    next();
  },
  requireEditorialAccess: (_req: any, _res: any, next: any) => next(),
  requireRoles: (...roles: string[]) => (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  },
}));

vi.mock('../services/editorialDataProvider.js', () => ({
  getEditorialDataProvider: () => ({
    postModel: {
      findAdmin: vi.fn().mockResolvedValue({ data: [], total: 0, count: 0 }),
      findById: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: updatePostMock,
      transition: vi.fn(),
      getHistory: vi.fn().mockResolvedValue({ versions: [], audit: [] }),
      getAlertMatchPreview: vi.fn().mockResolvedValue(null),
      listFreshnessQueue: listFreshnessQueueMock,
      listTrustQueue: listTrustQueueMock,
      listSearchReadinessQueue: listSearchReadinessQueueMock,
      listSeoQueue: listSeoQueueMock,
      listAlertImpactQueue: listAlertImpactQueueMock,
      bulkTransition: bulkTransitionMock,
      sweepExpiredPublishedPosts: sweepExpiredPublishedPostsMock,
    },
    taxonomyModel: {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    auditLogModel: {
      list: vi.fn().mockResolvedValue([]),
    },
  }),
}));

vi.mock('../services/frontendRevalidation.js', () => ({
  triggerFrontendRevalidation: triggerFrontendRevalidationMock,
}));

vi.mock('../models/alertSubscriptions.postgres.js', () => ({
  default: {
    listAdmin: vi.fn().mockResolvedValue({ data: [], total: 0, count: 0 }),
    getStats: vi.fn().mockResolvedValue({ total: 0, verified: 0, unverified: 0, active: 0, inactive: 0, byFrequency: [] }),
    getPreferenceCoverage: getPreferenceCoverageMock,
    deleteById: vi.fn().mockResolvedValue(true),
  },
}));

import editorialRouter from '../routes/editorial.js';

describe('editorial Phase 3 endpoints', () => {
  const app = express();
  app.use(express.json());
  app.use('/editorial', editorialRouter);

  beforeEach(() => {
    currentRole = 'admin';
    vi.clearAllMocks();

    listTrustQueueMock.mockResolvedValue([{ id: 'trust-1' }]);
    listSearchReadinessQueueMock.mockResolvedValue([{ id: 'search-1' }]);
    listSeoQueueMock.mockResolvedValue([{ id: 'seo-1' }]);
    listAlertImpactQueueMock.mockResolvedValue([{ post: { id: 'post-1' }, preview: { total: 2, instant: 1, daily: 1, weekly: 0 } }]);
    updatePostMock.mockResolvedValue({ id: 'post-1', status: 'draft' });
    bulkTransitionMock.mockResolvedValue({
      total: 1,
      successCount: 1,
      failureCount: 0,
      updated: [{ id: 'post-1', status: 'published' }],
      failures: [],
    });
    sweepExpiredPublishedPostsMock.mockResolvedValue({
      dryRun: true,
      totalCandidates: 1,
      archivedCount: 0,
      candidates: [{ id: 'post-1' }],
      archived: [],
      failures: [],
    });
    getPreferenceCoverageMock.mockResolvedValue({
      sampleSize: 1,
      frequencies: [{ key: 'daily', count: 1 }],
      postTypes: [{ key: 'job', count: 1 }],
      categories: [{ slug: 'govt-jobs', name: 'Govt Jobs', count: 1 }],
      states: [],
      organizations: [],
      qualifications: [],
    });
    triggerFrontendRevalidationMock.mockResolvedValue({ ok: true });
  });

  it('returns trust queue with provided limit', async () => {
    const response = await request(app).get('/editorial/workflow/trust?limit=12');

    expect(response.status).toBe(200);
    expect(listTrustQueueMock).toHaveBeenCalledWith(12);
    expect(response.body.data).toEqual([{ id: 'trust-1' }]);
  });

  it('returns search readiness queue', async () => {
    const response = await request(app).get('/editorial/workflow/search-readiness?limit=9');

    expect(response.status).toBe(200);
    expect(listSearchReadinessQueueMock).toHaveBeenCalledWith(9);
    expect(response.body.data).toEqual([{ id: 'search-1' }]);
  });

  it('returns 400 for invalid trust queue limit', async () => {
    const response = await request(app).get('/editorial/workflow/trust?limit=0');

    expect(response.status).toBe(400);
    expect(listTrustQueueMock).not.toHaveBeenCalled();
  });

  it('does not force-clear contentJson or officialSources on partial update payload', async () => {
    const response = await request(app)
      .put('/editorial/posts/post-1')
      .send({ title: 'Updated title' });

    expect(response.status).toBe(200);
    expect(updatePostMock).toHaveBeenCalledTimes(1);

    const [, payload] = updatePostMock.mock.calls[0];
    expect(payload).toMatchObject({
      title: 'Updated title',
      trust: {
        verificationNote: undefined,
        sourceNote: undefined,
        correctionNote: undefined,
      },
    });
    expect(payload).not.toHaveProperty('contentJson');
    expect(payload.trust).not.toHaveProperty('officialSources');
  });

  it('clamps alert impact limit to 30', async () => {
    const response = await request(app).get('/editorial/workflow/alerts-impact?limit=100');

    expect(response.status).toBe(200);
    expect(listAlertImpactQueueMock).toHaveBeenCalledWith(30);
  });

  it('returns 500 when SEO queue loading fails', async () => {
    listSeoQueueMock.mockRejectedValueOnce(new Error('queue unavailable'));

    const response = await request(app).get('/editorial/workflow/seo?limit=4');

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({ error: 'Failed to fetch SEO queue' });
  });

  it('blocks role-incompatible bulk publish action', async () => {
    currentRole = 'editor';

    const response = await request(app)
      .post('/editorial/workflow/bulk-transition')
      .send({ ids: ['post-1'], action: 'publish' });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ error: 'Insufficient role for requested workflow action' });
    expect(bulkTransitionMock).not.toHaveBeenCalled();
  });

  it('runs bulk publish and reports revalidation count', async () => {
    const response = await request(app)
      .post('/editorial/workflow/bulk-transition')
      .send({ ids: ['post-1'], action: 'publish', note: 'Bulk publish run' });

    expect(response.status).toBe(200);
    expect(bulkTransitionMock).toHaveBeenCalledWith(['post-1'], 'publish', 'user-phase3', 'admin', 'Bulk publish run');
    expect(triggerFrontendRevalidationMock).toHaveBeenCalledTimes(1);
    expect(response.body.data.revalidatedCount).toBe(1);
  });

  it('returns 400 for invalid bulk transition payload', async () => {
    const response = await request(app)
      .post('/editorial/workflow/bulk-transition')
      .send({ ids: [], action: 'publish' });

    expect(response.status).toBe(400);
    expect(bulkTransitionMock).not.toHaveBeenCalled();
  });

  it('allows reviewer to run approve in bulk transition', async () => {
    currentRole = 'reviewer';

    const response = await request(app)
      .post('/editorial/workflow/bulk-transition')
      .send({ ids: ['post-1'], action: 'approve', note: 'Bulk approve run' });

    expect(response.status).toBe(200);
    expect(bulkTransitionMock).toHaveBeenCalledWith(['post-1'], 'approve', 'user-phase3', 'reviewer', 'Bulk approve run');
  });

  it('returns model error for bulk transition failures', async () => {
    bulkTransitionMock.mockRejectedValueOnce(new Error('bulk transition failed'));

    const response = await request(app)
      .post('/editorial/workflow/bulk-transition')
      .send({ ids: ['post-1'], action: 'publish' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: 'bulk transition failed' });
  });

  it('runs freshness sweep dry-run without revalidation', async () => {
    const response = await request(app)
      .post('/editorial/workflow/freshness/sweep')
      .send({ dryRun: true, limit: 5, note: 'Preview sweep' });

    expect(response.status).toBe(200);
    expect(sweepExpiredPublishedPostsMock).toHaveBeenCalledWith({
      limit: 5,
      dryRun: true,
      actorId: 'user-phase3',
      actorRole: 'admin',
      note: 'Preview sweep',
    });
    expect(triggerFrontendRevalidationMock).not.toHaveBeenCalled();
    expect(response.body.data.revalidatedCount).toBe(0);
  });

  it('requires admin role for freshness sweep', async () => {
    currentRole = 'reviewer';

    const response = await request(app)
      .post('/editorial/workflow/freshness/sweep')
      .send({ dryRun: true, limit: 5 });

    expect(response.status).toBe(403);
    expect(sweepExpiredPublishedPostsMock).not.toHaveBeenCalled();
  });

  it('returns 500 when freshness sweep throws unexpectedly', async () => {
    sweepExpiredPublishedPostsMock.mockRejectedValueOnce(new Error('sweep unavailable'));

    const response = await request(app)
      .post('/editorial/workflow/freshness/sweep')
      .send({ dryRun: false, limit: 5 });

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({ error: 'Failed to run freshness sweep' });
  });

  it('returns subscriber preference coverage', async () => {
    const response = await request(app).get('/editorial/alert-subscriptions/coverage?limit=7');

    expect(response.status).toBe(200);
    expect(getPreferenceCoverageMock).toHaveBeenCalledWith(7);
    expect(response.body.data).toMatchObject({
      sampleSize: 1,
      frequencies: [{ key: 'daily', count: 1 }],
    });
  });

  it('returns 400 for invalid coverage limit', async () => {
    const response = await request(app).get('/editorial/alert-subscriptions/coverage?limit=0');

    expect(response.status).toBe(400);
    expect(getPreferenceCoverageMock).not.toHaveBeenCalled();
  });
});
