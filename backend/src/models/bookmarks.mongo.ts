import { ObjectId, Document } from 'mongodb';

import { getCollection } from '../services/cosmosdb.js';

interface BookmarkDoc extends Document {
    _id: ObjectId;
    userId: string;
    announcementId: string;
    createdAt: Date;
}

export class BookmarkModelMongo {
    private static get collection() {
        return getCollection<BookmarkDoc>('bookmarks');
    }

    static async findByUser(userId: string): Promise<BookmarkDoc[]> {
        try {
            return await this.collection
                .find({ userId })
                .sort({ createdAt: -1 })
                .toArray();
        } catch (error) {
            console.error('[MongoDB] findByUser bookmarks error:', error);
            return [];
        }
    }

    static async findAnnouncementIdsByUser(userId: string): Promise<string[]> {
        const docs = await this.findByUser(userId);
        return docs.map(doc => doc.announcementId);
    }

    static async add(userId: string, announcementId: string): Promise<boolean> {
        try {
            const now = new Date();
            const result = await this.collection.updateOne(
                { userId, announcementId },
                { $setOnInsert: { userId, announcementId, createdAt: now } },
                { upsert: true }
            );
            return result.upsertedCount > 0 || result.matchedCount > 0;
        } catch (error) {
            console.error('[MongoDB] add bookmark error:', error);
            return false;
        }
    }

    static async remove(userId: string, announcementId: string): Promise<boolean> {
        try {
            const result = await this.collection.deleteOne({ userId, announcementId });
            return result.deletedCount > 0;
        } catch (error) {
            console.error('[MongoDB] remove bookmark error:', error);
            return false;
        }
    }
}

export default BookmarkModelMongo;
