import { beforeEach, describe, expect, it, vi } from 'vitest';

const { listMatchingPostMock } = vi.hoisted(() => ({
    listMatchingPostMock: vi.fn().mockResolvedValue([]),
}));

vi.mock('../services/email.js', () => ({
    sendAnnouncementEmail: vi.fn().mockResolvedValue(0),
}));

vi.mock('../models/alertSubscriptions.postgres.js', () => ({
    default: {
        listMatchingPost: listMatchingPostMock,
    },
}));

import { sendAnnouncementEmail } from '../services/email.js';
import { dispatchAnnouncementToSubscribers } from '../services/subscriberDispatch.js';
import type { Announcement } from '../types.js';

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

describe('subscriberDispatch', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('sends instant notifications to category-matching or all-category subscribers', async () => {
        listMatchingPostMock.mockResolvedValue([
            {
                id: 'sub-1',
                email: 'all@example.com',
                categorySlugs: [],
                stateSlugs: [],
                organizationSlugs: [],
                qualificationSlugs: [],
                postTypes: [],
                frequency: 'instant',
                unsubscribeToken: 'tok-all',
                verified: true,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
            {
                id: 'sub-2',
                email: 'category@example.com',
                categorySlugs: ['central-government'],
                stateSlugs: [],
                organizationSlugs: [],
                qualificationSlugs: [],
                postTypes: [],
                frequency: 'instant',
                unsubscribeToken: 'tok-category',
                verified: true,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
            {
                id: 'sub-3',
                email: 'other@example.com',
                categorySlugs: ['state-government'],
                stateSlugs: [],
                organizationSlugs: [],
                qualificationSlugs: [],
                postTypes: [],
                frequency: 'instant',
                unsubscribeToken: 'tok-other',
                verified: true,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
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
        listMatchingPostMock.mockResolvedValue([]);

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

