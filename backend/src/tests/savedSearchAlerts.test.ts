import { ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
    savedSearchDocs,
    profileDocs,
    userDocs,
    subscriptionDocs,
    announcementDocs,
    notificationsBulkWriteMock,
    savedSearchesUpdateManyMock,
    announcementFindAllMock,
    sendDigestEmailMock,
} = vi.hoisted(() => ({
    savedSearchDocs: [] as Array<Record<string, any>>,
    profileDocs: [] as Array<Record<string, any>>,
    userDocs: [] as Array<Record<string, any>>,
    subscriptionDocs: [] as Array<Record<string, any>>,
    announcementDocs: [] as Array<Record<string, any>>,
    notificationsBulkWriteMock: vi.fn().mockResolvedValue({ upsertedCount: 0 }),
    savedSearchesUpdateManyMock: vi.fn().mockResolvedValue({ modifiedCount: 0 }),
    announcementFindAllMock: vi.fn().mockResolvedValue([]),
    sendDigestEmailMock: vi.fn().mockResolvedValue(true),
}));

const buildCursor = (rows: Array<Record<string, any>>) => {
    const cursor: any = {
        sort: vi.fn(),
        limit: vi.fn(),
        toArray: vi.fn(),
    };
    cursor.sort.mockReturnValue(cursor);
    cursor.limit.mockReturnValue(cursor);
    cursor.toArray.mockResolvedValue(rows);
    return cursor;
};

vi.mock('../services/cosmosdb.js', () => ({
    getCollection: vi.fn((name: string) => {
        if (name === 'saved_searches') {
            return {
                find: vi.fn(() => buildCursor(savedSearchDocs)),
                updateMany: savedSearchesUpdateManyMock,
            };
        }
        if (name === 'user_profiles') {
            return {
                find: vi.fn(() => buildCursor(profileDocs)),
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
        if (name === 'user_notifications') {
            return {
                bulkWrite: notificationsBulkWriteMock,
            };
        }
        throw new Error(`Unexpected collection: ${name}`);
    }),
}));

vi.mock('../models/announcements.mongo.js', () => ({
    AnnouncementModelMongo: {
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

        notificationsBulkWriteMock.mockResolvedValue({ upsertedCount: 0 });
        savedSearchesUpdateManyMock.mockResolvedValue({ modifiedCount: 0 });
        announcementFindAllMock.mockResolvedValue(announcementDocs);
        sendDigestEmailMock.mockResolvedValue(true);
    });

    it('upserts notifications, sends digest mail, and marks search notified', async () => {
        const now = new Date('2026-02-13T09:00:00.000Z');
        const userId = new ObjectId().toString();
        const searchId = new ObjectId();

        savedSearchDocs.push({
            _id: searchId,
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
            _id: new ObjectId(userId),
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

        notificationsBulkWriteMock.mockResolvedValue({ upsertedCount: 2 });

        const result = await processSavedSearchAlertsOnce(now);

        expect(result).toEqual({
            dueSearches: 1,
            searchesWithMatches: 1,
            notificationsUpserted: 2,
            emailSent: 1,
            emailSkippedNoSubscription: 0,
            errors: 0,
        });
        expect(notificationsBulkWriteMock).toHaveBeenCalledTimes(1);
        expect(sendDigestEmailMock).toHaveBeenCalledWith(
            expect.objectContaining({
                email: 'user@test.com',
                frequency: 'daily',
            })
        );
        expect(savedSearchesUpdateManyMock).toHaveBeenCalledWith(
            { _id: { $in: [searchId] } },
            { $set: { lastNotifiedAt: now } }
        );
    });

    it('records subscription skip when no verified subscription is available', async () => {
        const now = new Date('2026-02-13T09:00:00.000Z');
        const userId = new ObjectId().toString();
        const searchId = new ObjectId();

        savedSearchDocs.push({
            _id: searchId,
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
            _id: new ObjectId(userId),
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
        notificationsBulkWriteMock.mockResolvedValue({ upsertedCount: 1 });

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
        expect(savedSearchesUpdateManyMock).toHaveBeenCalledTimes(1);
    });
});
