import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findAllUsers: vi.fn(),
  countUsers: vi.fn(),
  findUserById: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  createAuditLog: vi.fn(),
  listPushSubscriptions: vi.fn(),
  listAllPushSubscriptions: vi.fn(),
  getAdminCounts: vi.fn(),
  getWorkspaceSummary: vi.fn(),
  getQaCounts: vi.fn(),
  getSlaSummary: vi.fn(),
  findAllAdmin: vi.fn(),
  getTrending: vi.fn(),
  getCalendarAnnouncements: vi.fn(),
  getUpcomingDeadlines: vi.fn(),
  bulkImportAnnouncements: vi.fn(),
  createCampaign: vi.fn(),
  estimateCampaignRecipients: vi.fn(),
  getCampaignStats: vi.fn(),
  queueFailedCampaignRetry: vi.fn(),
  queueCampaignDelivery: vi.fn(),
  assignAnnouncement: vi.fn(),
  approveAnnouncement: vi.fn(),
  rejectAnnouncement: vi.fn(),
  moderateComment: vi.fn(),
}));

vi.mock('../middleware/auth.js', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { userId: 'admin-user', role: 'admin', email: 'admin@example.com' };
    next();
  },
  requireAdmin: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../middleware/rateLimit.js', () => ({
  rateLimit: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../models/users.postgres.js', () => ({
  UserModelPostgres: {
    findAll: mocks.findAllUsers,
    count: mocks.countUsers,
    findById: mocks.findUserById,
    update: mocks.updateUser,
    delete: mocks.deleteUser,
  },
}));

vi.mock('../models/auditLogs.postgres.js', () => ({
  default: { create: mocks.createAuditLog },
}));

vi.mock('../models/announcements.postgres.js', () => ({
  default: {
    getAdminCounts: mocks.getAdminCounts,
    getManagePostsWorkspaceSummary: mocks.getWorkspaceSummary,
    getAdminQaCounts: mocks.getQaCounts,
    getPendingSlaSummary: mocks.getSlaSummary,
    findAllAdmin: mocks.findAllAdmin,
    getTrending: mocks.getTrending,
  },
}));

vi.mock('../models/pushSubscriptions.postgres.js', () => ({
  default: {
    list: mocks.listPushSubscriptions,
    listAll: mocks.listAllPushSubscriptions,
  },
}));

vi.mock('../models/alertSubscriptions.postgres.js', () => ({ default: {} }));
vi.mock('../models/community.postgres.js', () => ({ default: {} }));
vi.mock('../models/errorReports.postgres.js', () => ({ default: {} }));
vi.mock('../models/siteSettings.postgres.js', () => ({ default: {} }));
vi.mock('../services/analyticsOverview.js', () => ({ getAnalyticsOverview: vi.fn() }));
vi.mock('../services/calendar.js', () => ({
  bulkImportAnnouncements: mocks.bulkImportAnnouncements,
  getCalendarAnnouncements: mocks.getCalendarAnnouncements,
  getUpcomingDeadlines: mocks.getUpcomingDeadlines,
}));
vi.mock('../services/notifications.js', () => ({
  createCampaign: mocks.createCampaign,
  estimateCampaignRecipients: mocks.estimateCampaignRecipients,
  getCampaigns: vi.fn(),
  getCampaignStats: mocks.getCampaignStats,
  getSegmentUserCount: vi.fn(),
  getUserSegments: vi.fn(() => ({ totalUsers: 0, states: [], categories: [] })),
  queueFailedCampaignRetry: mocks.queueFailedCampaignRetry,
  queueCampaignDelivery: mocks.queueCampaignDelivery,
}));
vi.mock('../services/workflow.js', () => ({
  assignAnnouncement: mocks.assignAnnouncement,
  approveAnnouncement: mocks.approveAnnouncement,
  getPendingApprovals: vi.fn(),
  getWorkflowLogs: vi.fn(),
  rejectAnnouncement: mocks.rejectAnnouncement,
}));
vi.mock('../services/engagement.js', () => ({
  getCommentsPendingReview: vi.fn(),
  getEngagementMetrics: vi.fn(),
  getUserFeedback: vi.fn(),
  moderateComment: mocks.moderateComment,
}));

vi.mock('../config.js', async () => {
  const actual = await vi.importActual<typeof import('../config.js')>('../config.js');
  return {
    ...actual,
    config: {
      ...actual.config,
      vapidPublicKey: '',
      vapidPrivateKey: '',
    },
  };
});

const createApp = async () => {
  const { default: adminRouter } = await import('../routes/admin.js');
  const app = express();
  app.use(express.json());
  app.use('/admin', adminRouter);
  return app;
};

describe('admin routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findAllUsers.mockResolvedValue([]);
    mocks.countUsers.mockResolvedValue(0);
    mocks.findUserById.mockResolvedValue(null);
    mocks.updateUser.mockResolvedValue(null);
    mocks.deleteUser.mockResolvedValue(false);
    mocks.createAuditLog.mockResolvedValue({ id: 'audit-1' });
    mocks.listPushSubscriptions.mockResolvedValue({ data: [], total: 0, count: 0 });
    mocks.listAllPushSubscriptions.mockResolvedValue([]);
    mocks.getAdminCounts.mockResolvedValue({ total: 0, byStatus: {}, byType: {} });
    mocks.getWorkspaceSummary.mockResolvedValue({});
    mocks.getQaCounts.mockResolvedValue({});
    mocks.getSlaSummary.mockResolvedValue({});
    mocks.findAllAdmin.mockResolvedValue([]);
    mocks.getTrending.mockResolvedValue([]);
    mocks.getCalendarAnnouncements.mockResolvedValue([]);
    mocks.getUpcomingDeadlines.mockResolvedValue([]);
    mocks.bulkImportAnnouncements.mockResolvedValue({ imported: 1 });
    mocks.createCampaign.mockResolvedValue({ success: true, campaignId: 'campaign-1' });
    mocks.estimateCampaignRecipients.mockResolvedValue({ success: true, data: { email: 2, push: 1, total: 3 } });
    mocks.getCampaignStats.mockResolvedValue({
      success: true,
      data: {
        total: 3,
        sent: 2,
        failed: 1,
        byChannel: [{ channel: 'email', sent: 2, failed: 0, total: 2 }],
        recentFailures: [],
      },
    });
    mocks.queueFailedCampaignRetry.mockResolvedValue({ success: true, mode: 'delivery', status: 'sending' });
    mocks.queueCampaignDelivery.mockResolvedValue({
      success: true,
      mode: 'delivery',
      status: 'sending',
    });
    mocks.assignAnnouncement.mockResolvedValue({ success: true });
    mocks.approveAnnouncement.mockResolvedValue({ success: true });
    mocks.rejectAnnouncement.mockResolvedValue({ success: true });
    mocks.moderateComment.mockResolvedValue(true);
  });

  it('uses database counts for dashboard users', async () => {
    mocks.countUsers
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(9)
      .mockResolvedValueOnce(2);

    const app = await createApp();
    const response = await request(app).get('/admin/dashboard');

    expect(response.status).toBe(200);
    expect(mocks.findAllUsers).not.toHaveBeenCalled();
    expect(mocks.countUsers).toHaveBeenNthCalledWith(1);
    expect(mocks.countUsers).toHaveBeenNthCalledWith(2, { isActive: true });
    expect(mocks.countUsers).toHaveBeenNthCalledWith(3, { role: ['admin', 'superadmin'], isActive: true });
    expect(response.body.data.users).toEqual({ total: 12, active: 9, admins: 2 });
  });

  it('passes user search filters to list and count queries', async () => {
    const app = await createApp();
    const response = await request(app).get('/admin/users?search=alice&role=admin&isActive=true&limit=25&offset=5');

    expect(response.status).toBe(200);
    expect(mocks.findAllUsers).toHaveBeenCalledWith({
      role: 'admin',
      isActive: true,
      search: 'alice',
      skip: 5,
      limit: 25,
    });
    expect(mocks.countUsers).toHaveBeenCalledWith({ role: 'admin', isActive: true, search: 'alice' });
  });

  it('rejects invalid role updates', async () => {
    const app = await createApp();
    const response = await request(app).patch('/admin/users/user-1').send({ role: 'admn' });

    expect(response.status).toBe(400);
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it('blocks demoting the last active privileged user', async () => {
    mocks.findUserById.mockResolvedValue({ id: 'user-1', role: 'admin', isActive: true });
    mocks.countUsers.mockResolvedValue(1);

    const app = await createApp();
    const response = await request(app).patch('/admin/users/user-1').send({ role: 'editor' });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('At least one active admin');
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it('blocks an admin from demoting their own account', async () => {
    const app = await createApp();
    const response = await request(app).patch('/admin/users/admin-user').send({ role: 'editor' });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Cannot demote your own admin account');
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it('records the supplied audit reason for a role change', async () => {
    mocks.findUserById.mockResolvedValue({ id: 'editor-1', role: 'editor', isActive: true });
    mocks.updateUser.mockResolvedValue({ id: 'editor-1', email: 'editor@example.com', role: 'admin', isActive: true });

    const app = await createApp();
    const response = await request(app).patch('/admin/users/editor-1').send({
      role: 'admin',
      auditReason: 'Approved access escalation',
    });

    expect(response.status).toBe(200);
    expect(mocks.updateUser).toHaveBeenCalledWith('editor-1', { role: 'admin' });
    expect(mocks.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'admin_user_role_changed',
      actorId: 'admin-user',
      metadata: { auditReason: 'Approved access escalation' },
    }));
  });

  it('blocks demoting the last active superadmin even when another admin exists', async () => {
    mocks.findUserById.mockResolvedValue({ id: 'super-1', role: 'superadmin', isActive: true });
    mocks.countUsers.mockResolvedValueOnce(1);

    const app = await createApp();
    const response = await request(app).patch('/admin/users/super-1').send({ role: 'user' });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('At least one superadmin');
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it('blocks deleting the last active privileged user', async () => {
    mocks.findUserById.mockResolvedValue({ id: 'user-1', role: 'admin', isActive: true });
    mocks.countUsers.mockResolvedValue(1);

    const app = await createApp();
    const response = await request(app).delete('/admin/users/user-1');

    expect(response.status).toBe(400);
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it('blocks an admin from deleting their own account', async () => {
    const app = await createApp();
    const response = await request(app).delete('/admin/users/admin-user');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Cannot delete your own account');
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it('passes authenticated userId into actor-backed admin services', async () => {
    const app = await createApp();

    await request(app).post('/admin/bulk-import').send([]);
    await request(app).post('/admin/campaigns').send({ title: 'Campaign' });
    await request(app).post('/admin/assign').send({
      announcementId: 'post-1',
      assigneeUserId: 'reviewer-1',
      assigneeEmail: 'reviewer@example.com',
    });
    await request(app).post('/admin/approve/post-1').send({ note: 'ok' });
    await request(app).post('/admin/reject/post-1').send({ reason: 'no' });

    expect(mocks.bulkImportAnnouncements).toHaveBeenCalledWith([], 'admin-user');
    expect(mocks.createCampaign).toHaveBeenCalledWith({ title: 'Campaign' }, 'admin-user');
    expect(mocks.assignAnnouncement).toHaveBeenCalledWith({
      announcementId: 'post-1',
      assigneeUserId: 'reviewer-1',
      assigneeEmail: 'reviewer@example.com',
    }, 'admin-user');
    expect(mocks.approveAnnouncement).toHaveBeenCalledWith('post-1', 'admin-user', 'ok');
    expect(mocks.rejectAnnouncement).toHaveBeenCalledWith('post-1', 'admin-user', 'no');
  });

  it('validates workflow action bodies before calling services', async () => {
    const app = await createApp();

    const assignResponse = await request(app).post('/admin/assign').send({ id: 'post-1' });
    const approveResponse = await request(app).post('/admin/approve/post-1').send({ note: 123 });
    const rejectResponse = await request(app).post('/admin/reject/post-1').send({});

    expect(assignResponse.status).toBe(400);
    expect(approveResponse.status).toBe(400);
    expect(rejectResponse.status).toBe(400);
    expect(mocks.assignAnnouncement).not.toHaveBeenCalled();
    expect(mocks.approveAnnouncement).not.toHaveBeenCalled();
    expect(mocks.rejectAnnouncement).not.toHaveBeenCalled();
  });

  it('rejects invalid comment moderation actions', async () => {
    const app = await createApp();

    const response = await request(app)
      .post('/admin/moderate-comment/comment-1')
      .send({ action: 'anything' });

    expect(response.status).toBe(400);
    expect(mocks.moderateComment).not.toHaveBeenCalled();
  });

  it('queues campaign delivery from the send endpoint', async () => {
    const app = await createApp();
    const response = await request(app).post('/admin/campaigns/campaign-1/send');

    expect(response.status).toBe(202);
    expect(response.body).toEqual({
      message: 'Campaign delivery queued',
      data: {
        mode: 'delivery',
        status: 'sending',
      },
    });
  });

  it('exposes campaign estimate, stats, and failed retry endpoints', async () => {
    const app = await createApp();

    const estimateResponse = await request(app).get('/admin/campaigns/campaign-1/estimate');
    const statsResponse = await request(app).get('/admin/campaigns/campaign-1/stats');
    const retryResponse = await request(app).post('/admin/campaigns/campaign-1/retry-failed');

    expect(estimateResponse.status).toBe(200);
    expect(estimateResponse.body.data).toEqual({ email: 2, push: 1, total: 3 });
    expect(statsResponse.status).toBe(200);
    expect(statsResponse.body.data).toMatchObject({ total: 3, sent: 2, failed: 1 });
    expect(retryResponse.status).toBe(202);
    expect(retryResponse.body.data).toEqual({ mode: 'delivery', status: 'sending' });
  });

  it('rejects invalid content analytics type values', async () => {
    const app = await createApp();
    const response = await request(app).get('/admin/analytics/content?type=bad&limit=10');

    expect(response.status).toBe(400);
    expect(mocks.getTrending).not.toHaveBeenCalled();
  });

  it('validates calendar date query parameters before calling the service', async () => {
    const app = await createApp();
    const invalidDateResponse = await request(app).get('/admin/calendar?start=abc&end=xyz');
    const reversedRangeResponse = await request(app).get('/admin/calendar?start=2026-02-01&end=2026-01-01');

    expect(invalidDateResponse.status).toBe(400);
    expect(reversedRangeResponse.status).toBe(400);
    expect(mocks.getCalendarAnnouncements).not.toHaveBeenCalled();
  });

  it('rejects negative upcoming deadline limits', async () => {
    const app = await createApp();
    const response = await request(app).get('/admin/upcoming-deadlines?limit=-5');

    expect(response.status).toBe(400);
    expect(mocks.getUpcomingDeadlines).not.toHaveBeenCalled();
  });

  it('keeps push send endpoint available when VAPID keys are missing', async () => {
    mocks.listAllPushSubscriptions.mockResolvedValue([{ endpoint: 'https://example.com/push', keys: { p256dh: 'p', auth: 'a' } }]);

    const app = await createApp();
    const response = await request(app)
      .post('/admin/push/send')
      .send({ title: 'Test', body: 'Body' });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      sent: 0,
      failed: 0,
      total: 1,
      message: 'VAPID keys not configured',
    });
  });
});
