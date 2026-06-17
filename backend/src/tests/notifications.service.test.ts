import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  campaignCreate: vi.fn(),
  campaignFindById: vi.fn(),
  campaignList: vi.fn(),
  campaignMarkFailed: vi.fn(),
  campaignMarkSending: vi.fn(),
  campaignMarkSent: vi.fn(),
  campaignMarkSimulated: vi.fn(),
  campaignSchedule: vi.fn(),
  campaignRemove: vi.fn(),
  campaignListScheduledDue: vi.fn(),
  pushListAll: vi.fn(),
  subscriptionCount: vi.fn(),
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
  },
}));

vi.mock('../services/postgres/prisma.js', () => ({
  prisma: {
    subscription: {
      count: mocks.subscriptionCount,
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
}));

describe('notification service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.campaignCreate.mockResolvedValue({ id: 'campaign-1' });
    mocks.campaignFindById.mockResolvedValue({
      id: 'campaign-1',
      status: 'draft',
      segment: { type: 'all', value: '' },
    });
    mocks.campaignMarkFailed.mockResolvedValue(true);
    mocks.campaignMarkSending.mockResolvedValue(true);
    mocks.campaignMarkSent.mockResolvedValue(true);
    mocks.campaignMarkSimulated.mockResolvedValue(true);
    mocks.pushListAll.mockResolvedValue([{ id: 'push-1' }]);
    mocks.subscriptionCount.mockResolvedValue(2);
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

  it('allows empty segment values for all-user campaigns', async () => {
    const { createCampaign } = await import('../services/notifications.js');

    const result = await createCampaign({
      title: 'All users campaign',
      body: 'This should be accepted.',
      segment: { type: 'all', value: '' },
    }, 'admin-user');

    expect(result.success).toBe(true);
    expect(mocks.campaignCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        segment: { type: 'all', value: '' },
      }),
      'admin-user',
    );
  });

  it('marks campaign send attempts as simulated, not sent', async () => {
    const { sendCampaign } = await import('../services/notifications.js');

    const result = await sendCampaign('campaign-1');

    expect(result).toEqual({ success: true, mode: 'simulation', estimatedCount: 3 });
    expect(mocks.campaignMarkSimulated).toHaveBeenCalledWith('campaign-1', 3);
    expect(mocks.campaignMarkSent).not.toHaveBeenCalled();
    expect(mocks.campaignMarkSending).not.toHaveBeenCalled();
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
