import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Announcement } from '../types.js';

vi.mock('../services/cosmosdb.js', () => ({
    getCollection: vi.fn(),
}));

vi.mock('../services/email.js', () => ({
    sendAnnouncementEmail: vi.fn().mockResolvedValue(0),
}));

import { getCollection } from '../services/cosmosdb.js';
import { sendAnnouncementEmail } from '../services/email.js';
import { dispatchAnnouncementToSubscribers } from '../services/subscriberDispatch.js';

const baseAnnouncement: Announcement = {
    id: 'a1',
    title: 'UPSC Result 2026',
    slug: 'upsc-result-2026',
    type: 'result',
    category: 'Central Government',
    organization: 'UPSC',
    postedAt: new Date() as any,
    updatedAt: new Date() as any,
    status: 'published',
    version: 1,
    isActive: true,
    viewCount: 0,
};

const mockSubscriptionQuery = (subscriptions: Array<Record<string, any>>) => {
    const toArray = vi.fn().mockResolvedValue(subscriptions);
    const project = vi.fn().mockReturnValue({ toArray });
    const find = vi.fn().mockReturnValue({ project });
    vi.mocked(getCollection as any).mockReturnValue({ find });
};

describe('subscriberDispatch', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('sends instant notifications to category-matching or all-category subscribers', async () => {
        mockSubscriptionQuery([
            {
                email: 'all@example.com',
                categories: [],
                frequency: 'instant',
                unsubscribeToken: 'tok-all',
                verified: true,
                isActive: true,
            },
            {
                email: 'category@example.com',
                categories: ['central government'],
                frequency: 'instant',
                unsubscribeToken: 'tok-category',
                verified: true,
                isActive: true,
            },
            {
                email: 'other@example.com',
                categories: ['state government'],
                frequency: 'instant',
                unsubscribeToken: 'tok-other',
                verified: true,
                isActive: true,
            },
        ]);
        vi.mocked(sendAnnouncementEmail as any).mockResolvedValue(2);

        const result = await dispatchAnnouncementToSubscribers(baseAnnouncement, { frequency: 'instant' });

        expect(sendAnnouncementEmail).toHaveBeenCalledTimes(1);
        const [emails] = vi.mocked(sendAnnouncementEmail as any).mock.calls[0];
        expect(emails).toEqual(['all@example.com', 'category@example.com']);
        expect(result).toEqual({
            matched: 2,
            sent: 2,
            skipped: 0,
            frequency: 'instant',
        });
    });

    it('skips dispatch when announcement is not published', async () => {
        mockSubscriptionQuery([]);

        const result = await dispatchAnnouncementToSubscribers(
            { ...baseAnnouncement, status: 'draft' },
            { frequency: 'instant' }
        );

        expect(sendAnnouncementEmail).not.toHaveBeenCalled();
        expect(result).toEqual({
            matched: 0,
            sent: 0,
            skipped: 0,
            frequency: 'instant',
        });
    });
});

