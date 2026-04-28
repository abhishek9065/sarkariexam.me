import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
    savedSearchDocs,
    profileDocs,
    userDocs,
    subscriptionDocs,
    announcementDocs,
    profileListDueSavedSearchesMock,
    profileGetProfilesByUserIdsMock,
    profileUpsertNotificationsMock,
    profileMarkSavedSearchesNotifiedMock,
    userListActiveEmailMapMock,
    subscriptionListByEmailsMock,
    announcementFindAllMock,
    sendDigestEmailMock,
} = vi.hoisted(() => ({
    savedSearchDocs: [] as Array<Record<string, any>>,
    profileDocs: [] as Array<Record<string, any>>,
    userDocs: [] as Array<Record<string, any>>,
    subscriptionDocs: [] as Array<Record<string, any>>,
    announcementDocs: [] as Array<Record<string, any>>,
    profileListDueSavedSearchesMock: vi.fn().mockResolvedValue([]),
    profileGetProfilesByUserIdsMock: vi.fn().mockResolvedValue(new Map()),
    profileUpsertNotificationsMock: vi.fn().mockResolvedValue(0),
    profileMarkSavedSearchesNotifiedMock: vi.fn().mockResolvedValue(undefined),
    userListActiveEmailMapMock: vi.fn().mockResolvedValue(new Map()),
    subscriptionListByEmailsMock: vi.fn().mockResolvedValue([]),
    announcementFindAllMock: vi.fn().mockResolvedValue([]),
    sendDigestEmailMock: vi.fn().mockResolvedValue(true),
}));

vi.mock('../models/profile.postgres.js', () => ({
    default: {
        listDueSavedSearches: profileListDueSavedSearchesMock,
        getProfilesByUserIds: profileGetProfilesByUserIdsMock,
        upsertNotifications: profileUpsertNotificationsMock,
        markSavedSearchesNotified: profileMarkSavedSearchesNotifiedMock,
    },
}));

vi.mock('../models/users.postgres.js', () => ({
    UserModelPostgres: {
        listActiveEmailMap: userListActiveEmailMapMock,
    },
}));

vi.mock('../models/alertSubscriptions.postgres.js', () => ({
    default: {
        listByEmails: subscriptionListByEmailsMock,
    },
}));

vi.mock('../models/announcements.postgres.js', () => ({
    default: {
        findAll: announcementFindAllMock,
    },
}));

vi.mock('../services/email.js', () => ({
    sendDigestEmail: sendDigestEmailMock,
}));

import { processSavedSearchAlertsOnce } from '../services/savedSearchAlerts.js';

describe('savedSearchAlerts service', () => {
    beforeEach(() => {
        savedSearchDocs.length = 0;
        profileDocs.length = 0;
        userDocs.length = 0;
        subscriptionDocs.length = 0;
        announcementDocs.length = 0;

        vi.clearAllMocks();

        profileListDueSavedSearchesMock.mockImplementation(async () => savedSearchDocs);
        profileGetProfilesByUserIdsMock.mockImplementation(async () => (
            new Map(profileDocs.map((doc) => [doc.userId, doc]))
        ));
        profileUpsertNotificationsMock.mockResolvedValue(0);
        profileMarkSavedSearchesNotifiedMock.mockResolvedValue(undefined);
        userListActiveEmailMapMock.mockImplementation(async () => (
            new Map(userDocs.map((doc) => [doc.id, String(doc.email).trim().toLowerCase()]))
        ));
        subscriptionListByEmailsMock.mockImplementation(async () => subscriptionDocs);
        announcementFindAllMock.mockResolvedValue(announcementDocs);
        sendDigestEmailMock.mockResolvedValue(true);
    });

    it('upserts notifications, sends digest mail, and marks search notified', async () => {
        const now = new Date('2026-02-13T09:00:00.000Z');
        const userId = 'user-1';
        const searchId = 'search-1';

        savedSearchDocs.push({
            id: searchId,
            userId,
            name: 'UPSC jobs',
            query: 'upsc',
            notificationsEnabled: true,
            frequency: 'daily',
            lastNotifiedAt: null,
            createdAt: new Date('2026-02-10T00:00:00.000Z'),
            updatedAt: new Date('2026-02-12T00:00:00.000Z'),
        });
        profileDocs.push({
            userId,
            alertWindowDays: 7,
            alertMaxItems: 5,
        });
        userDocs.push({
            id: userId,
            email: 'User@Test.com',
            isActive: true,
        });
        subscriptionDocs.push({
            email: 'user@test.com',
            isActive: true,
            verified: true,
            unsubscribeToken: 'tok-1',
        });
        announcementDocs.push(
            {
                id: 'a1',
                title: 'UPSC Recruitment 2026',
                slug: 'upsc-recruitment-2026',
                type: 'job',
                category: 'Central Government',
                organization: 'UPSC',
                updatedAt: now.toISOString(),
                postedAt: now.toISOString(),
                deadline: new Date('2026-03-01T00:00:00.000Z').toISOString(),
            },
            {
                id: 'a2',
                title: 'UPSC Result 2026',
                slug: 'upsc-result-2026',
                type: 'result',
                category: 'Central Government',
                organization: 'UPSC',
                updatedAt: now.toISOString(),
                postedAt: now.toISOString(),
                deadline: null,
            }
        );

        profileUpsertNotificationsMock.mockResolvedValue(2);

        const result = await processSavedSearchAlertsOnce(now);

        expect(result).toEqual({
            dueSearches: 1,
            searchesWithMatches: 1,
            notificationsUpserted: 2,
            emailSent: 1,
            emailSkippedNoSubscription: 0,
            errors: 0,
        });
        expect(profileUpsertNotificationsMock).toHaveBeenCalledTimes(1);
        expect(sendDigestEmailMock).toHaveBeenCalledWith(
            expect.objectContaining({
                email: 'user@test.com',
                frequency: 'daily',
            })
        );
        expect(profileMarkSavedSearchesNotifiedMock).toHaveBeenCalledWith([searchId], now);
    });

    it('records subscription skip when no verified subscription is available', async () => {
        const now = new Date('2026-02-13T09:00:00.000Z');
        const userId = 'user-2';
        const searchId = 'search-2';

        savedSearchDocs.push({
            id: searchId,
            userId,
            name: 'Railway weekly',
            query: 'railway',
            notificationsEnabled: true,
            frequency: 'weekly',
            lastNotifiedAt: null,
            createdAt: new Date('2026-02-01T00:00:00.000Z'),
            updatedAt: new Date('2026-02-12T00:00:00.000Z'),
        });
        profileDocs.push({
            userId,
            alertWindowDays: 10,
            alertMaxItems: 6,
        });
        userDocs.push({
            id: userId,
            email: 'weekly@test.com',
            isActive: true,
        });
        announcementDocs.push({
            id: 'a3',
            title: 'Railway Group D 2026',
            slug: 'railway-group-d-2026',
            type: 'job',
            category: 'Railways',
            organization: 'RRB',
            updatedAt: now.toISOString(),
            postedAt: now.toISOString(),
        });
        profileUpsertNotificationsMock.mockResolvedValue(1);

        const result = await processSavedSearchAlertsOnce(now);

        expect(result).toEqual({
            dueSearches: 1,
            searchesWithMatches: 1,
            notificationsUpserted: 1,
            emailSent: 0,
            emailSkippedNoSubscription: 1,
            errors: 0,
        });
        expect(sendDigestEmailMock).not.toHaveBeenCalled();
        expect(profileMarkSavedSearchesNotifiedMock).toHaveBeenCalledTimes(1);
    });
});
