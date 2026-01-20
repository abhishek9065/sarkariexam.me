import { ObjectId, Filter, Sort, WithId, Document } from 'mongodb';
import { getCollection } from '../services/cosmosdb.js';
import { Announcement, ContentType, CreateAnnouncementDto, Tag } from '../types.js';

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Announcement document interface for MongoDB
 */
interface AnnouncementDoc extends Document {
    _id: ObjectId;
    title: string;
    slug: string;
    type: ContentType;
    category: string;
    organization: string;
    content?: string;
    externalLink?: string;
    location?: string;
    deadline?: Date;
    minQualification?: string;
    ageLimit?: string;
    applicationFee?: string;
    totalPosts?: number;
    tags: string[];
    postedBy: string;
    postedAt: Date;
    updatedAt: Date;
    isActive: boolean;
    viewCount: number;
    jobDetails?: any;
    importantDates?: Array<{ eventName: string; eventDate: Date; description?: string }>;
}

/**
 * MongoDB-based Announcement Model
 * Replaces PostgreSQL version for Azure Cosmos DB
 */
export class AnnouncementModelMongo {
    private static get collection() {
        return getCollection<AnnouncementDoc>('announcements');
    }

    /**
     * Find all announcements with filters
     */
    static async findAll(filters?: {
        type?: ContentType;
        search?: string;
        category?: string;
        organization?: string;
        qualification?: string;
        sort?: 'newest' | 'oldest' | 'deadline';
        limit?: number;
        offset?: number;
    }): Promise<Announcement[]> {
        try {
            const query: Filter<AnnouncementDoc> = { isActive: true };

            if (filters?.type) {
                query.type = filters.type;
            }

            if (filters?.category) {
                query.category = { $regex: filters.category, $options: 'i' };
            }

            if (filters?.organization) {
                query.organization = { $regex: filters.organization, $options: 'i' };
            }

            if (filters?.qualification) {
                query.minQualification = { $regex: filters.qualification, $options: 'i' };
            }

            if (filters?.search && filters.search.trim()) {
                const safeSearch = escapeRegex(filters.search.trim());
                const searchRegex = new RegExp(safeSearch, 'i');
                query.$or = [
                    { title: searchRegex },
                    { content: searchRegex },
                    { organization: searchRegex },
                    { category: searchRegex },
                    { tags: searchRegex },
                ];
            }

            // Cosmos DB only indexes _id by default, so use simple sort
            // Sort by _id (descending = newest first since ObjectId contains timestamp)
            let sortDirection: 1 | -1 = -1; // Default: newest first
            switch (filters?.sort) {
                case 'newest':
                    sortDirection = -1;
                    break;
                case 'oldest':
                    sortDirection = 1;
                    break;
                case 'deadline':
                    sortDirection = -1; // Just use newest for deadline too
                    break;
            }

            const limit = filters?.limit || 100;
            const skip = filters?.offset || 0;

            const docs = await this.collection
                .find(query)
                .sort({ _id: sortDirection })
                .skip(skip)
                .limit(limit)
                .toArray();

            return docs.map(this.docToAnnouncement);
        } catch (error) {
            console.error('[MongoDB] findAll error:', error);
            return [];
        }
    }

    /**
     * Cursor-based pagination for better performance
     */
    static async findAllWithCursor(filters?: {
        type?: ContentType;
        search?: string;
        category?: string;
        organization?: string;
        qualification?: string;
        sort?: 'newest' | 'oldest' | 'deadline';
        limit?: number;
        cursor?: string;
    }): Promise<{ data: Announcement[]; nextCursor: string | null; hasMore: boolean }> {
        try {
            const query: Filter<AnnouncementDoc> = { isActive: true };
            const limit = filters?.limit || 20;

            if (filters?.cursor) {
                if (!ObjectId.isValid(filters.cursor)) {
                    return { data: [], nextCursor: null, hasMore: false };
                }
                const cursorId = new ObjectId(filters.cursor);
                if (filters?.sort === 'oldest') {
                    query._id = { $gt: cursorId };
                } else {
                    query._id = { $lt: cursorId };
                }
            }

            if (filters?.type) query.type = filters.type;
            if (filters?.category) query.category = { $regex: filters.category, $options: 'i' };
            if (filters?.organization) query.organization = { $regex: filters.organization, $options: 'i' };
            if (filters?.qualification) query.minQualification = { $regex: filters.qualification, $options: 'i' };
            if (filters?.search && filters.search.trim()) {
                const safeSearch = escapeRegex(filters.search.trim());
                const searchRegex = new RegExp(safeSearch, 'i');
                query.$or = [
                    { title: searchRegex },
                    { content: searchRegex },
                    { organization: searchRegex },
                    { category: searchRegex },
                    { tags: searchRegex },
                ];
            }

            let sort: Sort = { _id: -1 };
            if (filters?.sort === 'oldest') sort = { _id: 1 };

            const docs = await this.collection
                .find(query)
                .sort(sort)
                .limit(limit + 1)
                .toArray();

            const hasMore = docs.length > limit;
            const data = hasMore ? docs.slice(0, limit) : docs;
            const nextCursor = hasMore && data.length > 0
                ? data[data.length - 1]._id.toString()
                : null;

            return {
                data: data.map(this.docToAnnouncement),
                nextCursor,
                hasMore,
            };
        } catch (error) {
            console.error('[MongoDB] findAllWithCursor error:', error);
            return { data: [], nextCursor: null, hasMore: false };
        }
    }

    /**
     * OPTIMIZED: Fetch only essential fields for listing cards
     * Reduces RU consumption by ~60% compared to fetching full documents
     */
    static async findListingCards(filters?: {
        type?: ContentType;
        category?: string;
        limit?: number;
        cursor?: string;
    }): Promise<{
        data: Array<{
            id: string;
            title: string;
            slug: string;
            type: string;
            category: string;
            organization: string;
            deadline: string | null;
            totalPosts: number | null;
            postedAt: string;
            viewCount: number;
        }>;
        nextCursor: string | null;
        hasMore: boolean
    }> {
        try {
            const query: Filter<AnnouncementDoc> = { isActive: true };
            const limit = filters?.limit || 20;

            if (filters?.type) {
                query.type = filters.type;
            }

            if (filters?.category) {
                query.category = { $regex: filters.category, $options: 'i' };
            }

            // Handle cursor for keyset pagination
            if (filters?.cursor && ObjectId.isValid(filters.cursor)) {
                query._id = { $lt: new ObjectId(filters.cursor) };
            }

            // PROJECT only essential fields (60% less data transfer)
            const projection = {
                _id: 1,
                title: 1,
                slug: 1,
                type: 1,
                category: 1,
                organization: 1,
                deadline: 1,
                totalPosts: 1,
                postedAt: 1,
                viewCount: 1,
                isActive: 1
            };

            const docs = await this.collection
                .find(query)
                .project(projection)
                .sort({ _id: -1 })
                .limit(limit + 1)
                .toArray();

            const hasMore = docs.length > limit;
            if (hasMore) docs.pop();

            const nextCursor = docs.length > 0 ? docs[docs.length - 1]._id?.toString() || null : null;

            return {
                data: docs.map(doc => ({
                    id: doc._id?.toString() || '',
                    title: doc.title || '',
                    slug: doc.slug || '',
                    type: doc.type || '',
                    category: doc.category || '',
                    organization: doc.organization || '',
                    deadline: doc.deadline?.toISOString() || null,
                    totalPosts: doc.totalPosts || null,
                    postedAt: doc.postedAt?.toISOString() || '',
                    viewCount: doc.viewCount || 0,
                    isActive: doc.isActive
                })),
                nextCursor,
                hasMore
            };
        } catch (error) {
            console.error('[MongoDB] findListingCards error:', error);
            return { data: [], nextCursor: null, hasMore: false };
        }
    }

    /**
     * Find by slug with CACHE-ASIDE pattern
     * Caches for 1 hour (3600s) - most users view same popular jobs
     */
    static async findBySlug(slug: string): Promise<Announcement | null> {
        const { RedisCache } = await import('../services/redis.js');

        const cacheKey = `job:${slug}`;

        return RedisCache.getOrFetch<Announcement>(
            cacheKey,
            async () => {
                try {
                    const doc = await this.collection.findOne({ slug, isActive: true });
                    return doc ? this.docToAnnouncement(doc) : null;
                } catch (error) {
                    console.error('[MongoDB] findBySlug error:', error);
                    return null;
                }
            },
            3600 // Cache for 1 hour
        );
    }

    /**
     * Find by ID
     */
    static async findByIds(ids: string[]): Promise<Announcement[]> {
        const validIds = ids.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id));
        if (validIds.length === 0) return [];

        try {
            const docs = await this.collection
                .find({ _id: { $in: validIds }, isActive: true })
                .toArray();
            return docs.map(this.docToAnnouncement);
        } catch (error) {
            console.error('[MongoDB] findByIds error:', error);
            return [];
        }
    }

    static async findById(id: string): Promise<Announcement | null> {
        try {
            if (!ObjectId.isValid(id)) return null;
            const doc = await this.collection.findOne({ _id: new ObjectId(id) });
            return doc ? this.docToAnnouncement(doc) : null;
        } catch (error) {
            console.error('[MongoDB] findById error:', error);
            return null;
        }
    }

    /**
     * Create new announcement
     */
    static async create(data: CreateAnnouncementDto, userId: string): Promise<Announcement> {
        const slug = this.generateSlug(data.title);
        const now = new Date();

        const doc: Omit<AnnouncementDoc, '_id'> = {
            title: data.title,
            slug,
            type: data.type,
            category: data.category,
            organization: data.organization,
            content: data.content || undefined,
            externalLink: data.externalLink || undefined,
            location: data.location || undefined,
            deadline: data.deadline ? new Date(data.deadline) : undefined,
            minQualification: data.minQualification || undefined,
            ageLimit: data.ageLimit || undefined,
            applicationFee: data.applicationFee || undefined,
            totalPosts: data.totalPosts || undefined,
            tags: data.tags || [],
            postedBy: userId,
            postedAt: now,
            updatedAt: now,
            isActive: true,
            viewCount: 0,
            jobDetails: (data as any).jobDetails || undefined,
            importantDates: data.importantDates?.map(date => ({
                eventName: date.eventName,
                eventDate: new Date(date.eventDate),
                description: date.description,
            })),
        };

        const result = await this.collection.insertOne(doc as AnnouncementDoc);
        return this.findById(result.insertedId.toString()) as Promise<Announcement>;
    }

    /**
     * Update announcement
     */
    static async update(id: string, data: Partial<CreateAnnouncementDto>): Promise<Announcement | null> {
        if (!ObjectId.isValid(id)) return null;

        const updateData: any = { updatedAt: new Date() };

        if (data.title) updateData.title = data.title;
        if (data.type) updateData.type = data.type;
        if (data.category) updateData.category = data.category;
        if (data.organization) updateData.organization = data.organization;
        if (data.content !== undefined) updateData.content = data.content;
        if (data.externalLink !== undefined) updateData.externalLink = data.externalLink;
        if (data.location !== undefined) updateData.location = data.location;
        if (data.deadline !== undefined) updateData.deadline = data.deadline ? new Date(data.deadline) : null;
        if (data.minQualification !== undefined) updateData.minQualification = data.minQualification;
        if (data.ageLimit !== undefined) updateData.ageLimit = data.ageLimit;
        if (data.applicationFee !== undefined) updateData.applicationFee = data.applicationFee;
        if (data.totalPosts !== undefined) updateData.totalPosts = data.totalPosts;
        if (data.tags) updateData.tags = data.tags;
        if ((data as any).jobDetails !== undefined) updateData.jobDetails = (data as any).jobDetails;
        if (data.importantDates !== undefined) {
            updateData.importantDates = data.importantDates?.map(date => ({
                eventName: date.eventName,
                eventDate: new Date(date.eventDate),
                description: date.description,
            }));
        }

        await this.collection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );

        return this.findById(id);
    }

    /**
     * Delete announcement
     */
    static async delete(id: string): Promise<boolean> {
        if (!ObjectId.isValid(id)) return false;
        const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
        return result.deletedCount > 0;
    }

    /**
     * Soft delete (set isActive = false)
     */
    static async softDelete(id: string): Promise<boolean> {
        if (!ObjectId.isValid(id)) return false;
        const result = await this.collection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { isActive: false, updatedAt: new Date() } }
        );
        return result.modifiedCount > 0;
    }

    /**
     * Increment view count
     */
    static async incrementViewCount(id: string): Promise<void> {
        if (!ObjectId.isValid(id)) return;
        await this.collection.updateOne(
            { _id: new ObjectId(id) },
            { $inc: { viewCount: 1 } }
        );
    }

    /**
     * Get trending announcements
     */
    static async getTrending(options?: { type?: ContentType; limit?: number }): Promise<Announcement[]> {
        try {
            const query: Filter<AnnouncementDoc> = { isActive: true };
            if (options?.type) query.type = options.type;

            const docs = await this.collection
                .find(query)
                .sort({ viewCount: -1, postedAt: -1 })
                .limit(options?.limit || 10)
                .toArray();

            return docs.map(this.docToAnnouncement);
        } catch (error) {
            console.error('[MongoDB] getTrending error:', error);
            return [];
        }
    }

    /**
     * Get announcements by deadline range
     */
    static async getByDeadlineRange(options: {
        startDate: Date;
        endDate: Date;
        limit?: number;
    }): Promise<Announcement[]> {
        try {
            const docs = await this.collection
                .find({
                    isActive: true,
                    deadline: { $gte: options.startDate, $lte: options.endDate },
                })
                .sort({ deadline: 1 })
                .limit(options.limit || 100)
                .toArray();

            return docs.map(this.docToAnnouncement);
        } catch (error) {
            console.error('[MongoDB] getByDeadlineRange error:', error);
            return [];
        }
    }

    /**
     * Get distinct categories
     */
    static async getCategories(): Promise<string[]> {
        try {
            return await this.collection.distinct('category', { isActive: true });
        } catch (error) {
            console.error('[MongoDB] getCategories error:', error);
            return [];
        }
    }

    /**
     * Get distinct organizations
     */
    static async getOrganizations(): Promise<string[]> {
        try {
            return await this.collection.distinct('organization', { isActive: true });
        } catch (error) {
            console.error('[MongoDB] getOrganizations error:', error);
            return [];
        }
    }

    /**
     * Get tags with counts
     */
    static async getTags(): Promise<{ name: string; count: number }[]> {
        try {
            const result = await this.collection.aggregate([
                { $match: { isActive: true } },
                { $unwind: '$tags' },
                { $group: { _id: '$tags', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 30 },
                { $project: { name: '$_id', count: 1, _id: 0 } },
            ]).toArray();

            return result as { name: string; count: number }[];
        } catch (error) {
            console.error('[MongoDB] getTags error:', error);
            return [];
        }
    }

    /**
     * Batch insert multiple announcements
     * More efficient than individual inserts for bulk operations
     */
    static async batchInsert(items: Array<{
        title: string;
        type: ContentType;
        category: string;
        organization: string;
        content?: string;
        externalLink?: string;
        location?: string;
        deadline?: Date;
        minQualification?: string;
        ageLimit?: string;
        applicationFee?: string;
        totalPosts?: number;
        tags?: string[];
        importantDates?: Array<{ eventName: string; eventDate: string; description?: string }>;
        jobDetails?: any;
    }>, userId: string): Promise<{ inserted: number; errors: string[] }> {
        const errors: string[] = [];
        const docs: Omit<AnnouncementDoc, '_id'>[] = [];
        const now = new Date();

        for (const item of items) {
            try {
                docs.push({
                    title: item.title,
                    slug: this.generateSlug(item.title),
                    type: item.type,
                    category: item.category,
                    organization: item.organization,
                    content: item.content,
                    externalLink: item.externalLink,
                    location: item.location,
                    deadline: item.deadline,
                    minQualification: item.minQualification,
                    ageLimit: item.ageLimit,
                    applicationFee: item.applicationFee,
                    totalPosts: item.totalPosts,
                    tags: item.tags || [],
                    importantDates: item.importantDates?.map(date => ({
                        eventName: date.eventName,
                        eventDate: new Date(date.eventDate),
                        description: date.description,
                    })),
                    jobDetails: item.jobDetails,
                    postedBy: userId,
                    postedAt: now,
                    updatedAt: now,
                    isActive: true,
                    viewCount: 0,
                } as Omit<AnnouncementDoc, '_id'>);
            } catch (error) {
                errors.push(`Failed to prepare "${item.title}": ${error}`);
            }
        }

        if (docs.length === 0) {
            return { inserted: 0, errors };
        }

        try {
            const result = await this.collection.insertMany(docs as AnnouncementDoc[], { ordered: false });
            console.log(`[BatchInsert] Inserted ${result.insertedCount} documents`);
            return { inserted: result.insertedCount, errors };
        } catch (error: any) {
            // With ordered: false, some inserts may succeed even if others fail
            const insertedCount = error.result?.nInserted || 0;
            errors.push(`Batch insert error: ${error.message}`);
            return { inserted: insertedCount, errors };
        }
    }

    /**
     * Batch update multiple announcements by ID
     */
    static async batchUpdate(updates: Array<{
        id: string;
        data: Partial<{ title: string; content: string; deadline: Date; isActive: boolean }>;
    }>): Promise<{ updated: number; errors: string[] }> {
        const errors: string[] = [];
        let updated = 0;

        // Use bulkWrite for efficiency
        const operations = updates
            .filter(u => ObjectId.isValid(u.id))
            .map(update => ({
                updateOne: {
                    filter: { _id: new ObjectId(update.id) },
                    update: { $set: { ...update.data, updatedAt: new Date() } }
                }
            }));

        if (operations.length === 0) {
            return { updated: 0, errors: ['No valid IDs provided'] };
        }

        try {
            const result = await this.collection.bulkWrite(operations, { ordered: false });
            updated = result.modifiedCount;
            console.log(`[BatchUpdate] Updated ${updated} documents`);
        } catch (error: any) {
            errors.push(`Batch update error: ${error.message}`);
        }

        return { updated, errors };
    }

    /**
     * Bulk upsert - insert or update based on slug
     * Useful for importing data that may already exist
     */
    static async bulkUpsert(items: Array<{
        slug: string;
        title: string;
        type: ContentType;
        category: string;
        organization: string;
        content?: string;
        externalLink?: string;
        deadline?: Date;
        tags?: string[];
    }>, userId: string): Promise<{ upserted: number; modified: number; errors: string[] }> {
        const errors: string[] = [];
        const now = new Date();

        const operations = items.map(item => ({
            updateOne: {
                filter: { slug: item.slug },
                update: {
                    $set: {
                        title: item.title,
                        type: item.type,
                        category: item.category,
                        organization: item.organization,
                        content: item.content,
                        externalLink: item.externalLink,
                        deadline: item.deadline,
                        tags: item.tags || [],
                        updatedAt: now,
                    },
                    $setOnInsert: {
                        slug: item.slug,
                        postedBy: userId,
                        postedAt: now,
                        isActive: true,
                        viewCount: 0,
                    }
                },
                upsert: true
            }
        }));

        try {
            const result = await this.collection.bulkWrite(operations, { ordered: false });
            console.log(`[BulkUpsert] Upserted: ${result.upsertedCount}, Modified: ${result.modifiedCount}`);
            return {
                upserted: result.upsertedCount,
                modified: result.modifiedCount,
                errors
            };
        } catch (error: any) {
            errors.push(`Bulk upsert error: ${error.message}`);
            return { upserted: 0, modified: 0, errors };
        }
    }

    /**
     * Batch increment view counts
     * More efficient than individual updates
     */
    static async batchIncrementViews(ids: string[]): Promise<number> {
        const validIds = ids.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id));

        if (validIds.length === 0) return 0;

        try {
            const result = await this.collection.updateMany(
                { _id: { $in: validIds } },
                { $inc: { viewCount: 1 } }
            );
            return result.modifiedCount;
        } catch (error) {
            console.error('[BatchIncrementViews] Error:', error);
            return 0;
        }
    }

    /**
     * Generate URL-safe slug
     */
    private static generateSlug(text: string): string {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 200) + '-' + Date.now();
    }

    /**
     * Convert MongoDB document to Announcement type
     */
    private static docToAnnouncement(doc: WithId<AnnouncementDoc>): Announcement {
        return {
            id: doc._id.toString() as any, // Keep as string for MongoDB
            title: doc.title,
            slug: doc.slug,
            type: doc.type,
            category: doc.category,
            organization: doc.organization,
            content: doc.content,
            externalLink: doc.externalLink,
            location: doc.location,
            deadline: doc.deadline?.toISOString() as any,
            minQualification: doc.minQualification,
            ageLimit: doc.ageLimit,
            applicationFee: doc.applicationFee,
            totalPosts: doc.totalPosts,
            tags: doc.tags?.map(t => ({ id: 0, name: t, slug: t.toLowerCase() })) || [],
            postedBy: doc.postedBy?.toString(),
            postedAt: doc.postedAt?.toISOString() as any,
            updatedAt: doc.updatedAt?.toISOString() as any,
            isActive: doc.isActive,
            viewCount: doc.viewCount,
            importantDates: doc.importantDates?.map((date, index) => ({
                id: `${doc._id.toString()}-${index}`,
                announcementId: doc._id.toString(),
                eventName: date.eventName,
                eventDate: date.eventDate?.toISOString() as any,
                description: date.description,
            })) || [],
            jobDetails: doc.jobDetails,
        };
    }
}

export default AnnouncementModelMongo;
