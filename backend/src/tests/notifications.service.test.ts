import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  campaignCreate: vi.fn(),
  campaignFindById: vi.fn(),
  campaignList: vi.fn(),
  campaignMarkFailed: vi.fn(),
  campaignMarkPartialFailed: vi.fn(),
  campaignMarkSending: vi.fn(),
  campaignMarkSent: vi.fn(),
  campaignMarkSimulated: vi.fn(),
  campaignSchedule: vi.fn(),
  campaignRemove: vi.fn(),
  campaignListScheduledDue: vi.fn(),
  dispatchCreateMany: vi.fn(),
  dispatchListFailed: vi.fn(),
  dispatchStats: vi.fn(),
  sendCampaignEmail: vi.fn(),
  webPushSendNotification: vi.fn(),
  webPushSetVapidDetails: vi.fn(),
  pushListAll: vi.fn(),
  pushListForUserIds: vi.fn(),
  pushFindByEndpoint: vi.fn(),
  pushDeleteByEndpoint: vi.fn(),
  subscriptionCount: vi.fn(),
  subscriptionFindMany: vi.fn(),
  userAccountFindMany: vi.fn(),
  vapidPublicKey: '',
  vapidPrivateKey: '',
  subscriptionStateGroupBy: vi.fn(),
  subscriptionCategoryGroupBy: vi.fn(),
  stateFindMany: vi.fn(),
  categoryFindMany: vi.fn(),
}));

vi.mock('../models/notificationCampaigns.postgres.js', () => ({
  default: {
    create: mocks.campaignCreate,
    findById: mocks.campaignFindById,
    list: mocks.campaignList,
    markFailed: mocks.campaignMarkFailed,
    markPartialFailed: mocks.campaignMarkPartialFailed,
    markSending: mocks.campaignMarkSending,
    markSent: mocks.campaignMarkSent,
    markSimulated: mocks.campaignMarkSimulated,
    schedule: mocks.campaignSchedule,
    remove: mocks.campaignRemove,
    listScheduledDue: mocks.campaignListScheduledDue,
  },
}));

vi.mock('../models/pushSubscriptions.postgres.js', () => ({
  default: {
    listAll: mocks.pushListAll,
    listForUserIds: mocks.pushListForUserIds,
    findByEndpoint: mocks.pushFindByEndpoint,
    deleteByEndpoint: mocks.pushDeleteByEndpoint,
  },
}));

vi.mock('../models/campaignDispatchLogs.postgres.js', () => ({
  default: {
    createMany: mocks.dispatchCreateMany,
    listFailed: mocks.dispatchListFailed,
    stats: mocks.dispatchStats,
  },
}));

vi.mock('../services/email.js', () => ({
  sendCampaignEmail: mocks.sendCampaignEmail,
}));

vi.mock('web-push', () => ({
  default: {
    sendNotification: mocks.webPushSendNotification,
    setVapidDetails: mocks.webPushSetVapidDetails,
  },
}));

vi.mock('../config.js', () => ({
  config: {
    frontendUrl: 'https://sarkariexams.me',
    get vapidPublicKey() {
      return mocks.vapidPublicKey;
    },
    get vapidPrivateKey() {
      return mocks.vapidPrivateKey;
    },
  },
}));

vi.mock('../services/postgres/prisma.js', () => ({
  prisma: {
    subscription: {
      count: mocks.subscriptionCount,
      findMany: mocks.subscriptionFindMany,
    },
    subscriptionState: {
      groupBy: mocks.subscriptionStateGroupBy,
    },
    subscriptionCategory: {
      groupBy: mocks.subscriptionCategoryGroupBy,
    },
    state: {
      findMany: mocks.stateFindMany,
    },
    category: {
      findMany: mocks.categoryFindMany,
    },
  },
  prismaApp: {
    userAccountEntry: {
      findMany: mocks.userAccountFindMany,
    },
  },
}));

describe('notification service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.vapidPublicKey = '';
    mocks.vapidPrivateKey = '';
    mocks.campaignCreate.mockResolvedValue({ id: 'campaign-1' });
    mocks.campaignFindById.mockResolvedValue({
      id: 'campaign-1',
      status: 'draft',
      segment: { type: 'all', value: '' },
      unsupportedSegment: false,
    });
    mocks.campaignMarkFailed.mockResolvedValue(true);
    mocks.campaignMarkPartialFailed.mockResolvedValue(true);
    mocks.campaignMarkSending.mockResolvedValue(true);
    mocks.campaignMarkSent.mockResolvedValue(true);
    mocks.campaignMarkSimulated.mockResolvedValue(true);
    mocks.dispatchCreateMany.mockResolvedValue(1);
    mocks.dispatchListFailed.mockResolvedValue([]);
    mocks.dispatchStats.mockResolvedValue({ total: 1, sent: 1, failed: 0, byChannel: [], recentFailures: [] });
    mocks.sendCampaignEmail.mockResolvedValue({ success: true, messageId: 'msg-1' });
    mocks.webPushSendNotification.mockResolvedValue(undefined);
    mocks.pushListAll.mockResolvedValue([{ id: 'push-1', endpoint: 'https://push.example/sub', keys: { p256dh: 'p', auth: 'a' } }]);
    mocks.pushListForUserIds.mockResolvedValue([{ id: 'push-user-1', endpoint: 'https://push.example/user-1', keys: { p256dh: 'p', auth: 'a' }, userId: 'user-1' }]);
    mocks.pushFindByEndpoint.mockResolvedValue({ id: 'push-1', endpoint: 'https://push.example/sub', keys: { p256dh: 'p', auth: 'a' } });
    mocks.pushDeleteByEndpoint.mockResolvedValue(true);
    mocks.subscriptionCount.mockResolvedValue(2);
    mocks.subscriptionFindMany.mockResolvedValue([
      { id: 'sub-1', email: 'one@example.com' },
      { id: 'sub-2', email: 'two@example.com' },
    ]);
    mocks.userAccountFindMany.mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }]);
    mocks.subscriptionStateGroupBy.mockResolvedValue([]);
    mocks.subscriptionCategoryGroupBy.mockResolvedValue([]);
    mocks.stateFindMany.mockResolvedValue([]);
    mocks.categoryFindMany.mockResolvedValue([]);
  });

  it('rejects unsupported language campaign segments', async () => {
    const { createCampaign } = await import('../services/notifications.js');

    const result = await createCampaign({
      title: 'Language campaign',
      body: 'This should not be accepted.',
      segment: { type: 'language', value: 'Hindi' },
    }, 'admin-user');

    expect(result.success).toBe(false);
    expect(mocks.campaignCreate).not.toHaveBeenCalled();
  });

  it('requires segment values for targeted campaigns', async () => {
    const { createCampaign } = await import('../services/notifications.js');

    const result = await createCampaign({
      title: 'State campaign',
      body: 'This should not be accepted.',
      segment: { type: 'state', value: '   ' },
    }, 'admin-user');

    expect(result.success).toBe(false);
    expect(mocks.campaignCreate).not.toHaveBeenCalled();
  });

  it('normalizes all-user campaign segment values', async () => {
    const { createCampaign } = await import('../services/notifications.js');

    const result = await createCampaign({
      title: 'All users campaign',
      body: 'This should be accepted.',
      segment: { type: 'all', value: '   ' },
    }, 'admin-user');

    expect(result.success).toBe(true);
    expect(mocks.campaignCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        segment: { type: 'all', value: 'all' },
      }),
      'admin-user',
    );
  });

  it('delivers campaign recipients and records dispatch logs', async () => {
    const { sendCampaign } = await import('../services/notifications.js');

    const result = await sendCampaign('campaign-1');

    expect(result).toEqual({
      success: true,
      mode: 'delivery',
      sentCount: 2,
      failedCount: 1,
      totals: { email: 2, push: 1, total: 3 },
    });
    expect(mocks.campaignMarkSending).toHaveBeenCalledWith('campaign-1');
    expect(mocks.sendCampaignEmail).toHaveBeenCalledTimes(2);
    expect(mocks.dispatchCreateMany).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ channel: 'email', status: 'sent', recipient: 'one@example.com' }),
      expect.objectContaining({ channel: 'push', status: 'failed', error: 'VAPID keys are not configured' }),
    ]));
    expect(mocks.campaignMarkPartialFailed).toHaveBeenCalledWith('campaign-1', 2, 1);
    expect(mocks.campaignMarkSent).not.toHaveBeenCalled();
    expect(mocks.campaignMarkSimulated).not.toHaveBeenCalled();
  });

  it('marks campaign failed when all deliveries fail', async () => {
    mocks.sendCampaignEmail.mockResolvedValue({ success: false, error: 'SendGrid is not configured' });
    mocks.pushListAll.mockResolvedValue([]);
    const { sendCampaign } = await import('../services/notifications.js');

    const result = await sendCampaign('campaign-1');

    expect(result).toEqual({
      success: true,
      mode: 'delivery',
      sentCount: 0,
      failedCount: 2,
      totals: { email: 2, push: 0, total: 2 },
    });
    expect(mocks.campaignMarkFailed).toHaveBeenCalledWith('campaign-1', { sentCount: 0, failedCount: 2 });
  });

  it('estimates campaign recipients by channel', async () => {
    const { estimateCampaignRecipients } = await import('../services/notifications.js');

    const result = await estimateCampaignRecipients('campaign-1');

    expect(result).toEqual({
      success: true,
      data: { email: 2, push: 1, total: 3 },
    });
  });

  it('targets push recipients through users matched by the same campaign segment', async () => {
    mocks.campaignFindById.mockResolvedValue({
      id: 'campaign-1',
      status: 'draft',
      segment: { type: 'state', value: 'Uttar Pradesh' },
      unsupportedSegment: false,
    });
    const { sendCampaign } = await import('../services/notifications.js');

    await sendCampaign('campaign-1');

    expect(mocks.userAccountFindMany).toHaveBeenCalledWith({
      where: {
        email: { in: ['one@example.com', 'two@example.com'], mode: 'insensitive' },
        isActive: true,
      },
      select: { id: true },
    });
    expect(mocks.pushListForUserIds).toHaveBeenCalledWith(['user-1', 'user-2']);
    expect(mocks.pushListAll).not.toHaveBeenCalled();
  });

  it('deletes expired push subscriptions on 404 or 410 delivery failures', async () => {
    mocks.vapidPublicKey = 'public-key';
    mocks.vapidPrivateKey = 'private-key';
    const goneError = Object.assign(new Error('Gone'), { statusCode: 410 });
    mocks.webPushSendNotification.mockRejectedValue(goneError);
    const { sendCampaign } = await import('../services/notifications.js');

    await sendCampaign('campaign-1');

    expect(mocks.pushDeleteByEndpoint).toHaveBeenCalledWith('https://push.example/sub');
    expect(mocks.dispatchCreateMany).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        channel: 'push',
        status: 'failed',
        metadata: { source: 'campaign', statusCode: 410 },
      }),
    ]));
  });

  it('retries only failed campaign dispatches', async () => {
    mocks.dispatchListFailed.mockResolvedValue([
      {
        id: 'failed-email',
        campaignId: 'campaign-1',
        channel: 'email',
        recipient: 'retry@example.com',
        subscriptionId: 'sub-retry',
        status: 'failed',
        attemptCount: 1,
      },
    ]);
    mocks.dispatchStats.mockResolvedValue({ total: 2, sent: 1, failed: 1, byChannel: [], recentFailures: [] });
    const { retryFailedCampaign } = await import('../services/notifications.js');

    const result = await retryFailedCampaign('campaign-1');

    expect(result).toEqual({
      success: true,
      mode: 'delivery',
      retried: 1,
      sentCount: 1,
      failedCount: 0,
    });
    expect(mocks.sendCampaignEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'retry@example.com' }));
    expect(mocks.dispatchCreateMany).toHaveBeenCalledWith([
      expect.objectContaining({ channel: 'email', status: 'sent', metadata: { retryOf: 'failed-email' }, attemptCount: 2 }),
    ]);
  });

  it('fails legacy unsupported campaign segments instead of simulating zero recipients', async () => {
    mocks.campaignFindById.mockResolvedValue({
      id: 'campaign-1',
      status: 'draft',
      segment: { type: 'language', value: 'Hindi' },
      unsupportedSegment: true,
    });
    const { sendCampaign } = await import('../services/notifications.js');

    const result = await sendCampaign('campaign-1');

    expect(result).toEqual({ success: false, error: 'Campaign segment is no longer supported' });
    expect(mocks.campaignMarkFailed).toHaveBeenCalledWith('campaign-1');
    expect(mocks.campaignMarkSimulated).not.toHaveBeenCalled();
  });

  it('does not advertise language segments', async () => {
    const { getUserSegments } = await import('../services/notifications.js');

    const result = await getUserSegments();

    expect(result.languages).toEqual([]);
  });

  it('maps direct language segment counts to an unsupported zero-target query', async () => {
    const { getSegmentUserCount } = await import('../services/notifications.js');

    await getSegmentUserCount('language', 'Hindi');

    expect(mocks.subscriptionCount).toHaveBeenCalledWith({
      where: {
        id: '__unsupported_language_segment__',
        isActive: true,
      },
    });
  });
});
