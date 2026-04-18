import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
    trackedDocs,
    bookmarkDocs,
    userDocs,
    subscriptionDocs,
    dueAnnouncementDocs,
    dispatchCreateMock,
    profileListDueTrackedApplicationsMock,
    profileUpsertNotificationsMock,
    bookmarkFindByAnnouncementIdsMock,
    userListActiveEmailMapMock,
    subscriptionListByEmailsMock,
    announcementFindAllMock,
    sendDigestEmailMock,
} = vi.hoisted(() => ({
    trackedDocs: [] as Array<Record<string, any>>,
    bookmarkDocs: [] as Array<Record<string, any>>,
    userDocs: [] as Array<Record<string, any>>,
    subscriptionDocs: [] as Array<Record<string, any>>,
    dueAnnouncementDocs: [] as Array<Record<string, any>>,
    dispatchCreateMock: vi.fn().mockResolvedValue({}),
    profileListDueTrackedApplicationsMock: vi.fn().mockResolvedValue([]),
    profileUpsertNotificationsMock: vi.fn().mockResolvedValue(1),
    bookmarkFindByAnnouncementIdsMock: vi.fn().mockResolvedValue([]),
    userListActiveEmailMapMock: vi.fn().mockResolvedValue(new Map()),
    subscriptionListByEmailsMock: vi.fn().mockResolvedValue([]),
    announcementFindAllMock: vi.fn().mockResolvedValue([]),
    sendDigestEmailMock: vi.fn().mockResolvedValue(true),
}));

vi.mock('../services/postgres/prisma.js', () => ({
    prismaApp: {
        reminderDispatchLogEntry: {
            create: dispatchCreateMock,
        },
    },
}));

vi.mock('../models/profile.postgres.js', () => ({
    default: {
        listDueTrackedApplications: profileListDueTrackedApplicationsMock,
        upsertNotifications: profileUpsertNotificationsMock,
    },
}));

vi.mock('../models/bookmarks.mongo.js', () => ({
    BookmarkModelMongo: {
        findByAnnouncementIds: bookmarkFindByAnnouncementIdsMock,
    },
}));

vi.mock('../models/users.mongo.js', () => ({
    UserModelMongo: {
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

import { processTrackerRemindersOnce } from '../services/trackerReminders.js';

describe('trackerReminders service', () => {
    beforeEach(() => {
        trackedDocs.length = 0;
        bookmarkDocs.length = 0;
        userDocs.length = 0;
        subscriptionDocs.length = 0;
        dueAnnouncementDocs.length = 0;

        vi.clearAllMocks();

        dispatchCreateMock.mockResolvedValue({});
        profileListDueTrackedApplicationsMock.mockImplementation(async () => trackedDocs);
        profileUpsertNotificationsMock.mockResolvedValue(1);
        bookmarkFindByAnnouncementIdsMock.mockImplementation(async () => bookmarkDocs);
        userListActiveEmailMapMock.mockImplementation(async () => (
            new Map(userDocs.map((doc) => [doc.id, String(doc.email).trim().toLowerCase()]))
        ));
        subscriptionListByEmailsMock.mockImplementation(async () => subscriptionDocs);
        announcementFindAllMock.mockResolvedValue(dueAnnouncementDocs);
        sendDigestEmailMock.mockResolvedValue(true);
    });

    it('sends in-app and digest reminders for due tracked applications', async () => {
        const now = new Date('2026-02-13T09:00:00.000Z');
        const userId = 'user-1';
        const trackedId = 'tracked-1';

        trackedDocs.push({
            id: trackedId,
            userId,
            announcementId: 'ann-1',
            slug: 'upsc-job-2026',
            type: 'job',
            title: 'UPSC Job 2026',
            organization: 'UPSC',
            deadline: new Date('2026-02-15T00:00:00.000Z'),
            reminderAt: null,
        });
        userDocs.push({
            id: userId,
            email: 'tracker@test.com',
            isActive: true,
        });
        subscriptionDocs.push({
            email: 'tracker@test.com',
            isActive: true,
            verified: true,
            unsubscribeToken: 'tok-track',
        });

        const result = await processTrackerRemindersOnce(now);

        expect(result).toEqual({
            candidates: 1,
            inAppSent: 1,
            emailSent: 1,
            emailSkippedNoSubscription: 0,
            deduped: 0,
        });
        expect(dispatchCreateMock).toHaveBeenCalledTimes(2);
        expect(profileUpsertNotificationsMock).toHaveBeenCalledTimes(1);
        expect(sendDigestEmailMock).toHaveBeenCalledWith(
            expect.objectContaining({
                email: 'tracker@test.com',
                frequency: 'daily',
            })
        );
    });

    it('treats duplicate email dispatch reservations as deduped and skips email send', async () => {
        const now = new Date('2026-02-13T09:00:00.000Z');
        const userId = 'user-2';
        const trackedId = 'tracked-2';

        trackedDocs.push({
            id: trackedId,
            userId,
            announcementId: 'ann-2',
            slug: 'ssc-job-2026',
            type: 'job',
            title: 'SSC Job 2026',
            organization: 'SSC',
            deadline: new Date('2026-02-16T00:00:00.000Z'),
            reminderAt: null,
        });

        dispatchCreateMock
            .mockResolvedValueOnce({})
            .mockRejectedValueOnce(new Error('E11000 duplicate key error'));

        const result = await processTrackerRemindersOnce(now);

        expect(result).toEqual({
            candidates: 1,
            inAppSent: 1,
            emailSent: 0,
            emailSkippedNoSubscription: 0,
            deduped: 1,
        });
        expect(profileUpsertNotificationsMock).toHaveBeenCalledTimes(1);
        expect(sendDigestEmailMock).not.toHaveBeenCalled();
    });
});
