import { ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
    trackedDocs,
    bookmarkDocs,
    userDocs,
    subscriptionDocs,
    dueAnnouncementDocs,
    dispatchInsertOneMock,
    notificationUpdateOneMock,
    getByDeadlineRangeMock,
    sendDigestEmailMock,
} = vi.hoisted(() => ({
    trackedDocs: [] as Array<Record<string, any>>,
    bookmarkDocs: [] as Array<Record<string, any>>,
    userDocs: [] as Array<Record<string, any>>,
    subscriptionDocs: [] as Array<Record<string, any>>,
    dueAnnouncementDocs: [] as Array<Record<string, any>>,
    dispatchInsertOneMock: vi.fn().mockResolvedValue({ acknowledged: true }),
    notificationUpdateOneMock: vi.fn().mockResolvedValue({ acknowledged: true }),
    getByDeadlineRangeMock: vi.fn().mockResolvedValue([]),
    sendDigestEmailMock: vi.fn().mockResolvedValue(true),
}));

const buildCursor = (rows: Array<Record<string, any>>) => {
    const cursor: any = {
        sort: vi.fn(),
        limit: vi.fn(),
        project: vi.fn(),
        toArray: vi.fn(),
    };
    cursor.sort.mockReturnValue(cursor);
    cursor.limit.mockReturnValue(cursor);
    cursor.project.mockReturnValue(cursor);
    cursor.toArray.mockResolvedValue(rows);
    return cursor;
};

vi.mock('../services/cosmosdb.js', () => ({
    getCollection: vi.fn((name: string) => {
        if (name === 'tracked_applications') {
            return {
                find: vi.fn(() => buildCursor(trackedDocs)),
            };
        }
        if (name === 'bookmarks') {
            return {
                find: vi.fn(() => buildCursor(bookmarkDocs)),
            };
        }
        if (name === 'users') {
            return {
                find: vi.fn(() => buildCursor(userDocs)),
            };
        }
        if (name === 'subscriptions') {
            return {
                find: vi.fn(() => buildCursor(subscriptionDocs)),
            };
        }
        if (name === 'reminder_dispatch_logs') {
            return {
                insertOne: dispatchInsertOneMock,
            };
        }
        if (name === 'user_notifications') {
            return {
                updateOne: notificationUpdateOneMock,
            };
        }
        throw new Error(`Unexpected collection: ${name}`);
    }),
}));

vi.mock('../models/announcements.mongo.js', () => ({
    AnnouncementModelMongo: {
        getByDeadlineRange: getByDeadlineRangeMock,
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

        dispatchInsertOneMock.mockResolvedValue({ acknowledged: true });
        notificationUpdateOneMock.mockResolvedValue({ acknowledged: true });
        getByDeadlineRangeMock.mockResolvedValue(dueAnnouncementDocs);
        sendDigestEmailMock.mockResolvedValue(true);
    });

    it('sends in-app and digest reminders for due tracked applications', async () => {
        const now = new Date('2026-02-13T09:00:00.000Z');
        const userId = new ObjectId().toString();
        const trackedId = new ObjectId();

        trackedDocs.push({
            _id: trackedId,
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
            _id: new ObjectId(userId),
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
        expect(dispatchInsertOneMock).toHaveBeenCalledTimes(2);
        expect(notificationUpdateOneMock).toHaveBeenCalledTimes(1);
        expect(sendDigestEmailMock).toHaveBeenCalledWith(
            expect.objectContaining({
                email: 'tracker@test.com',
                frequency: 'daily',
            })
        );
    });

    it('treats duplicate email dispatch reservations as deduped and skips email send', async () => {
        const now = new Date('2026-02-13T09:00:00.000Z');
        const userId = new ObjectId().toString();
        const trackedId = new ObjectId();

        trackedDocs.push({
            _id: trackedId,
            userId,
            announcementId: 'ann-2',
            slug: 'ssc-job-2026',
            type: 'job',
            title: 'SSC Job 2026',
            organization: 'SSC',
            deadline: new Date('2026-02-16T00:00:00.000Z'),
            reminderAt: null,
        });

        dispatchInsertOneMock
            .mockResolvedValueOnce({ acknowledged: true })
            .mockRejectedValueOnce(new Error('E11000 duplicate key error'));

        const result = await processTrackerRemindersOnce(now);

        expect(result).toEqual({
            candidates: 1,
            inAppSent: 1,
            emailSent: 0,
            emailSkippedNoSubscription: 0,
            deduped: 1,
        });
        expect(notificationUpdateOneMock).toHaveBeenCalledTimes(1);
        expect(sendDigestEmailMock).not.toHaveBeenCalled();
    });
});
