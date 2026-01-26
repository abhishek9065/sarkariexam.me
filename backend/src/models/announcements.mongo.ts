import { ObjectId, Filter, Sort, WithId, Document } from 'mongodb';

import { getCollection } from '../services/cosmosdb.js';
import { Announcement, AnnouncementStatus, ContentType, CreateAnnouncementDto } from '../types.js';

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseFilterList(value?: string): string[] {
    if (!value) return [];
    return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function buildStringFilter(value?: string) {
    if (!value) return undefined;
    const values = parseFilterList(value);
    if (values.length > 1) {
        return { $in: values };
    }
    return { $regex: values[0], $options: 'i' };
}

function buildSearchRegexes(value: string): RegExp[] {
    const trimmed = value.trim();
    if (!trimmed) return [];
    const exact = new RegExp(escapeRegex(trimmed), 'i');
    const words = trimmed.split(/\s+/).filter(Boolean);
    const fuzzyPattern = words
        .map(word => word.split('').map(char => escapeRegex(char)).join('.*?'))
        .join('.*');
    const regexes = [exact];
    if (trimmed.length >= 4 && fuzzyPattern.length > 0) {
        regexes.push(new RegExp(fuzzyPattern, 'i'));
    }
    return regexes;
}

interface AnnouncementVersionDoc {
    version: number;
    updatedAt: Date;
    updatedBy?: string;
    note?: string;
    snapshot: {
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
        salaryMin?: number;
        salaryMax?: number;
        difficulty?: 'easy' | 'medium' | 'hard';
        cutoffMarks?: string;
        totalPosts?: number;
        tags: string[];
        importantDates?: Array<{ eventName: string; eventDate: Date; description?: string }>;
        jobDetails?: any;
        status?: AnnouncementStatus;
        publishAt?: Date;
        approvedAt?: Date;
        approvedBy?: string;
        isActive?: boolean;
        postedBy?: string;
        postedAt?: Date;
        updatedAt?: Date;
        viewCount?: number;
    };
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
    salaryMin?: number;
    salaryMax?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    cutoffMarks?: string;
    totalPosts?: number;
    tags: string[];
    postedBy: string;
    postedAt: Date;
    updatedAt: Date;
    status?: AnnouncementStatus;
    publishAt?: Date;
    approvedAt?: Date;
    approvedBy?: string;
    version?: number;
    versions?: AnnouncementVersionDoc[];
    isActive: boolean;
    viewCount: number;
    jobDetails?: any;
    importantDates?: Array<{ eventName: string; eventDate: Date; description?: string }>;
}

const DEFAULT_STATUS: AnnouncementStatus = 'published';

function normalizeStatus(status?: AnnouncementStatus | null): AnnouncementStatus {
    return status ?? DEFAULT_STATUS;
}

function buildLiveQuery(now: Date = new Date()): Filter<AnnouncementDoc> {
    return {
        $and: [
            {
                $or: [
                    { isActive: true },
                    { isActive: { $exists: false } },
                    { isActive: null },
                ],
            },
            {
                $or: [
                    { status: { $in: ['published'] } },
                    { status: { $exists: false } },
                    { status: null },
                    { status: 'scheduled', publishAt: { $lte: now } },
                ],
            },
        ],
    };
}

function addSearchFilter(query: Filter<AnnouncementDoc>, searchRegexes: RegExp[]): void {
    const regexes = searchRegexes.length > 0 ? searchRegexes : [];
    if (regexes.length === 0) return;
    const orClauses = regexes.flatMap((regex) => ([
        { title: regex },
        { content: regex },
        { organization: regex },
        { category: regex },
        { tags: regex },
    ]));

    const searchClause: Filter<AnnouncementDoc> = {
        $or: orClauses,
    };

    if (query.$and) {
        query.$and.push(searchClause);
    } else {
        query.$and = [searchClause];
    }
}

function addSalaryFilter(query: Filter<AnnouncementDoc>, minSalary?: number, maxSalary?: number): void {
    const clauses: Filter<AnnouncementDoc>[] = [];
    if (minSalary !== undefined) {
        clauses.push({
            $or: [
                { salaryMax: { $gte: minSalary } },
                { salaryMin: { $gte: minSalary } },
            ],
        });
    }
    if (maxSalary !== undefined) {
        clauses.push({
            $or: [
                { salaryMin: { $lte: maxSalary } },
                { salaryMax: { $lte: maxSalary } },
            ],
        });
    }
    if (clauses.length === 0) return;
    if (query.$and) {
        query.$and.push(...clauses);
    } else {
        query.$and = [...clauses];
    }
}

function buildAdminQuery(filters?: {
    type?: ContentType;
    search?: string;
    category?: string;
    organization?: string;
    location?: string;
    qualification?: string;
    status?: AnnouncementStatus | 'all';
    includeInactive?: boolean;
}): Filter<AnnouncementDoc> {
    const query: Filter<AnnouncementDoc> = {};

    if (!filters?.includeInactive) {
        query.isActive = true;
    }

    if (filters?.status && filters.status !== 'all') {
        query.status = filters.status as AnnouncementStatus;
    }

    if (filters?.type) {
        query.type = filters.type;
    }

    if (filters?.category) {
        query.category = buildStringFilter(filters.category);
    }

    if (filters?.organization) {
        query.organization = buildStringFilter(filters.organization);
    }

    if (filters?.location) {
        query.location = { $regex: filters.location, $options: 'i' };
    }

    if (filters?.qualification) {
        query.minQualification = { $regex: filters.qualification, $options: 'i' };
    }

    if (filters?.search && filters.search.trim()) {
        addSearchFilter(query, buildSearchRegexes(filters.search));
    }

    return query;
}

function buildAdminSort(sort?: 'newest' | 'oldest' | 'deadline' | 'updated' | 'views'): Sort {
    switch (sort) {
        case 'oldest':
            return { _id: 1 };
        case 'deadline':
            return { deadline: 1, _id: -1 };
        case 'updated':
            return { updatedAt: -1, _id: -1 };
        case 'views':
            return { viewCount: -1, _id: -1 };
        case 'newest':
        default:
            return { _id: -1 };
    }
}

function buildVersionSnapshot(doc: AnnouncementDoc): AnnouncementVersionDoc['snapshot'] {
    return {
        title: doc.title,
        type: doc.type,
        category: doc.category,
        organization: doc.organization,
        content: doc.content,
        externalLink: doc.externalLink,
        location: doc.location,
        deadline: doc.deadline,
        minQualification: doc.minQualification,
        ageLimit: doc.ageLimit,
        applicationFee: doc.applicationFee,
        salaryMin: doc.salaryMin,
        salaryMax: doc.salaryMax,
        difficulty: doc.difficulty,
        cutoffMarks: doc.cutoffMarks,
        totalPosts: doc.totalPosts,
        tags: doc.tags || [],
        importantDates: doc.importantDates,
        jobDetails: doc.jobDetails,
        status: doc.status,
        publishAt: doc.publishAt,
        approvedAt: doc.approvedAt,
        approvedBy: doc.approvedBy,
        isActive: doc.isActive,
        postedBy: doc.postedBy,
        postedAt: doc.postedAt,
        updatedAt: doc.updatedAt,
        viewCount: doc.viewCount,
    };
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
        location?: string;
        qualification?: string;
        salaryMin?: number;
        salaryMax?: number;
        sort?: 'newest' | 'oldest' | 'deadline' | 'views';
        limit?: number;
        offset?: number;
    }): Promise<Announcement[]> {
        try {
            const query: Filter<AnnouncementDoc> = buildLiveQuery();

            if (filters?.type) {
                query.type = filters.type;
            }

            if (filters?.category) {
                query.category = buildStringFilter(filters.category);
            }

            if (filters?.organization) {
                query.organization = buildStringFilter(filters.organization);
            }

            if (filters?.location) {
                query.location = { $regex: filters.location, $options: 'i' };
            }

            if (filters?.qualification) {
                query.minQualification = { $regex: filters.qualification, $options: 'i' };
            }

            if (filters?.search && filters.search.trim()) {
                addSearchFilter(query, buildSearchRegexes(filters.search));
            }

            if (filters?.salaryMin !== undefined || filters?.salaryMax !== undefined) {
                addSalaryFilter(query, filters.salaryMin, filters.salaryMax);
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
     * Find all announcements for admin views (includes drafts and scheduled items)
     */
    static async findAllAdmin(filters?: {
        type?: ContentType;
        search?: string;
        category?: string;
        organization?: string;
        location?: string;
        qualification?: string;
        status?: AnnouncementStatus | 'all';
        includeInactive?: boolean;
        sort?: 'newest' | 'oldest' | 'deadline' | 'updated' | 'views';
        limit?: number;
        offset?: number;
    }): Promise<Announcement[]> {
        try {
            const query = buildAdminQuery(filters);
            const sort = buildAdminSort(filters?.sort);

            const limit = filters?.limit || 100;
            const skip = filters?.offset || 0;

            const docs = await this.collection
                .find(query)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .toArray();

            return docs.map(this.docToAnnouncement);
        } catch (error) {
            console.error('[MongoDB] findAllAdmin error:', error);
            return [];
        }
    }

    static async countAdmin(filters?: {
        type?: ContentType;
        search?: string;
        category?: string;
        organization?: string;
        location?: string;
        qualification?: string;
        status?: AnnouncementStatus | 'all';
        includeInactive?: boolean;
    }): Promise<number> {
        try {
            const query = buildAdminQuery(filters);
            return await this.collection.countDocuments(query);
        } catch (error) {
            console.error('[MongoDB] countAdmin error:', error);
            return 0;
        }
    }

    static async getAdminCounts(options?: { includeInactive?: boolean }): Promise<{
        total: number;
        byStatus: Record<AnnouncementStatus, number>;
        byType: Record<ContentType, number>;
    }> {
        try {
            const query = buildAdminQuery({ includeInactive: options?.includeInactive });
            const results = await this.collection.aggregate([
                { $match: query },
                {
                    $addFields: {
                        normalizedStatus: { $ifNull: ['$status', DEFAULT_STATUS] },
                    },
                },
                {
                    $facet: {
                        total: [{ $count: 'value' }],
                        byStatus: [{ $group: { _id: '$normalizedStatus', count: { $sum: 1 } } }],
                        byType: [{ $group: { _id: '$type', count: { $sum: 1 } } }],
                    },
                },
            ]).toArray();

            const summary = results[0] ?? {};
            const total = summary.total?.[0]?.value ?? 0;
            const byStatus: Record<AnnouncementStatus, number> = {
                draft: 0,
                pending: 0,
                scheduled: 0,
                published: 0,
                archived: 0,
            };
            for (const entry of summary.byStatus ?? []) {
                const status = entry._id as AnnouncementStatus;
                if (status && status in byStatus) {
                    byStatus[status] = entry.count;
                }
            }

            const byType: Record<ContentType, number> = {
                job: 0,
                result: 0,
                'admit-card': 0,
                syllabus: 0,
                'answer-key': 0,
                admission: 0,
            };
            for (const entry of summary.byType ?? []) {
                const type = entry._id as ContentType;
                if (type && type in byType) {
                    byType[type] = entry.count;
                }
            }

            return { total, byStatus, byType };
        } catch (error) {
            console.error('[MongoDB] getAdminCounts error:', error);
            return {
                total: 0,
                byStatus: {
                    draft: 0,
                    pending: 0,
                    scheduled: 0,
                    published: 0,
                    archived: 0,
                },
                byType: {
                    job: 0,
                    result: 0,
                    'admit-card': 0,
                    syllabus: 0,
                    'answer-key': 0,
                    admission: 0,
                },
            };
        }
    }

    static async getAdminQaCounts(options?: { includeInactive?: boolean }): Promise<{
        totalQaIssues: number;
        pendingQaIssues: number;
    }> {
        try {
            const now = new Date();
            const qaOr: Filter<AnnouncementDoc>[] = [
                { title: { $exists: false } },
                { title: { $regex: /^.{0,9}$/ } },
                { category: { $in: [null, ''] } },
                { organization: { $in: [null, ''] } },
                {
                    status: 'scheduled',
                    $or: [{ publishAt: { $exists: false } }, { publishAt: null }],
                },
                { deadline: { $lt: now } },
                { externalLink: { $exists: true, $ne: '', $not: /^https?:\/\//i } },
            ];

            const attachOrClause = (base: Filter<AnnouncementDoc>, orClause: Filter<AnnouncementDoc>[]) => {
                const query: any = { ...base };
                if (query.$and) {
                    query.$and = [...query.$and, { $or: orClause }];
                    return query;
                }
                if (query.$or) {
                    query.$and = [{ $or: query.$or }, { $or: orClause }];
                    delete query.$or;
                    return query;
                }
                query.$or = orClause;
                return query;
            };

            const baseQuery = buildAdminQuery({ includeInactive: options?.includeInactive });
            const pendingBaseQuery = buildAdminQuery({ includeInactive: options?.includeInactive, status: 'pending' });

            const qaQuery = attachOrClause(baseQuery, qaOr);
            const pendingQaQuery = attachOrClause(pendingBaseQuery, qaOr);

            const [totalQaIssues, pendingQaIssues] = await Promise.all([
                this.collection.countDocuments(qaQuery),
                this.collection.countDocuments(pendingQaQuery),
            ]);

            return {
                totalQaIssues,
                pendingQaIssues,
            };
        } catch (error) {
            console.error('[MongoDB] getAdminQaCounts error:', error);
            return { totalQaIssues: 0, pendingQaIssues: 0 };
        }
    }

    static async getPendingSlaSummary(options?: { includeInactive?: boolean; staleLimit?: number }): Promise<{
        pendingTotal: number;
        averageDays: number;
        buckets: { lt1: number; d1_3: number; d3_7: number; gt7: number };
        stale: Array<{
            id: string;
            title: string;
            organization?: string;
            category?: string;
            type: ContentType;
            version?: number;
            status?: AnnouncementStatus;
            publishAt?: Date;
            deadline?: Date;
            externalLink?: string;
            isActive?: boolean;
            postedAt?: Date;
            updatedAt?: Date;
            ageDays: number;
        }>;
    }> {
        try {
            const query = buildAdminQuery({ includeInactive: options?.includeInactive, status: 'pending' });
            const docs = await this.collection
                .find(query)
                .project({
                    title: 1,
                    organization: 1,
                    category: 1,
                    type: 1,
                    version: 1,
                    status: 1,
                    publishAt: 1,
                    deadline: 1,
                    externalLink: 1,
                    isActive: 1,
                    updatedAt: 1,
                    postedAt: 1,
                })
                .toArray();

            const buckets = { lt1: 0, d1_3: 0, d3_7: 0, gt7: 0 };
            const staleLimit = options?.staleLimit ?? 10;
            const stale: Array<{
                id: string;
                title: string;
                organization?: string;
                category?: string;
                type: ContentType;
                version?: number;
                status?: AnnouncementStatus;
                publishAt?: Date;
                deadline?: Date;
                externalLink?: string;
                isActive?: boolean;
                postedAt?: Date;
                updatedAt?: Date;
                ageDays: number;
            }> = [];
            let totalDays = 0;

            const now = Date.now();
            for (const doc of docs) {
                const baseDate = doc.updatedAt || doc.postedAt;
                const ageDays = baseDate ? Math.max(0, Math.floor((now - new Date(baseDate).getTime()) / (1000 * 60 * 60 * 24))) : 0;
                totalDays += ageDays;
                if (ageDays < 1) {
                    buckets.lt1 += 1;
                } else if (ageDays < 3) {
                    buckets.d1_3 += 1;
                } else if (ageDays < 7) {
                    buckets.d3_7 += 1;
                } else {
                    buckets.gt7 += 1;
                }

                if (ageDays >= 7) {
                    stale.push({
                        id: doc._id?.toString?.() || doc._id,
                        title: doc.title,
                        organization: doc.organization,
                        category: doc.category,
                        type: doc.type,
                        version: doc.version,
                        status: doc.status,
                        publishAt: doc.publishAt,
                        deadline: doc.deadline,
                        externalLink: doc.externalLink,
                        isActive: doc.isActive,
                        postedAt: doc.postedAt,
                        updatedAt: doc.updatedAt,
                        ageDays,
                    });
                }
            }

            stale.sort((a, b) => b.ageDays - a.ageDays);

            return {
                pendingTotal: docs.length,
                averageDays: docs.length ? Math.round(totalDays / docs.length) : 0,
                buckets,
                stale: stale.slice(0, staleLimit),
            };
        } catch (error) {
            console.error('[MongoDB] getPendingSlaSummary error:', error);
            return {
                pendingTotal: 0,
                averageDays: 0,
                buckets: { lt1: 0, d1_3: 0, d3_7: 0, gt7: 0 },
                stale: [],
            };
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
        location?: string;
        qualification?: string;
        salaryMin?: number;
        salaryMax?: number;
        sort?: 'newest' | 'oldest' | 'deadline';
        limit?: number;
        cursor?: string;
    }): Promise<{ data: Announcement[]; nextCursor: string | null; hasMore: boolean }> {
        try {
            const query: Filter<AnnouncementDoc> = buildLiveQuery();
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
            if (filters?.category) query.category = buildStringFilter(filters.category);
            if (filters?.organization) query.organization = buildStringFilter(filters.organization);
            if (filters?.location) query.location = { $regex: filters.location, $options: 'i' };
            if (filters?.qualification) query.minQualification = { $regex: filters.qualification, $options: 'i' };
            if (filters?.search && filters.search.trim()) {
                addSearchFilter(query, buildSearchRegexes(filters.search));
            }
            if (filters?.salaryMin !== undefined || filters?.salaryMax !== undefined) {
                addSalaryFilter(query, filters.salaryMin, filters.salaryMax);
            }

            let sort: Sort = { _id: -1 };
            if (filters?.sort === 'oldest') {
                sort = { _id: 1 };
            } else if (filters?.sort === 'deadline') {
                sort = { deadline: 1, _id: -1 };
            } else if (filters?.sort === 'views') {
                sort = { viewCount: -1, _id: -1 };
            }

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
        search?: string;
        organization?: string;
        location?: string;
        qualification?: string;
        salaryMin?: number;
        salaryMax?: number;
        sort?: 'newest' | 'oldest' | 'deadline';
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
            location?: string | null;
            minQualification?: string | null;
            ageLimit?: string | null;
            salaryMin?: number | null;
            salaryMax?: number | null;
            difficulty?: string | null;
            cutoffMarks?: string | null;
            deadline: string | null;
            totalPosts: number | null;
            postedAt: string;
            viewCount: number;
        }>;
        nextCursor: string | null;
        hasMore: boolean
    }> {
        try {
            const query: Filter<AnnouncementDoc> = buildLiveQuery();
            const limit = filters?.limit || 20;

            if (filters?.type) {
                query.type = filters.type;
            }

            if (filters?.category) {
                query.category = buildStringFilter(filters.category);
            }

            if (filters?.organization) {
                query.organization = buildStringFilter(filters.organization);
            }

            if (filters?.location) {
                query.location = { $regex: filters.location, $options: 'i' };
            }

            if (filters?.qualification) {
                query.minQualification = { $regex: filters.qualification, $options: 'i' };
            }

            if (filters?.search && filters.search.trim()) {
                addSearchFilter(query, buildSearchRegexes(filters.search));
            }

            if (filters?.salaryMin !== undefined || filters?.salaryMax !== undefined) {
                addSalaryFilter(query, filters.salaryMin, filters.salaryMax);
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
                location: 1,
                minQualification: 1,
                ageLimit: 1,
                salaryMin: 1,
                salaryMax: 1,
                difficulty: 1,
                cutoffMarks: 1,
                deadline: 1,
                totalPosts: 1,
                postedAt: 1,
                viewCount: 1,
                isActive: 1
            };

            let sort: Sort = { _id: -1 };
            if (filters?.sort === 'oldest') {
                sort = { _id: 1 };
            } else if (filters?.sort === 'deadline') {
                sort = { deadline: 1, _id: -1 };
            } else if (filters?.sort === 'views') {
                sort = { viewCount: -1, _id: -1 };
            }

            const docs = await this.collection
                .find(query)
                .project(projection)
                .sort(sort)
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
                    location: doc.location || null,
                    minQualification: doc.minQualification || null,
                    ageLimit: doc.ageLimit || null,
                    salaryMin: doc.salaryMin ?? null,
                    salaryMax: doc.salaryMax ?? null,
                    difficulty: doc.difficulty || null,
                    cutoffMarks: doc.cutoffMarks || null,
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
                    const doc = await this.collection.findOne({ ...buildLiveQuery(), slug });
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
                .find({ ...buildLiveQuery(), _id: { $in: validIds } })
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

    static async findByIdsAdmin(ids: string[]): Promise<AnnouncementDoc[]> {
        const validIds = ids.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id));
        if (validIds.length === 0) return [];

        try {
            return await this.collection
                .find({ _id: { $in: validIds } })
                .toArray();
        } catch (error) {
            console.error('[MongoDB] findByIdsAdmin error:', error);
            return [];
        }
    }

    /**
     * Create new announcement
     */
    static async create(data: CreateAnnouncementDto, userId: string): Promise<Announcement> {
        const slug = this.generateSlug(data.title);
        const now = new Date();
        const status = normalizeStatus(data.status);
        const publishAt = data.publishAt ? new Date(data.publishAt) : undefined;
        const approvedAt = data.approvedAt ? new Date(data.approvedAt) : undefined;

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
            salaryMin: data.salaryMin ?? undefined,
            salaryMax: data.salaryMax ?? undefined,
            difficulty: (data as any).difficulty || undefined,
            cutoffMarks: (data as any).cutoffMarks || undefined,
            totalPosts: data.totalPosts || undefined,
            tags: data.tags || [],
            postedBy: userId,
            postedAt: now,
            updatedAt: now,
            status,
            publishAt,
            approvedAt,
            approvedBy: data.approvedBy,
            version: 1,
            versions: [],
            isActive: status !== 'archived',
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
    static async update(id: string, data: Partial<CreateAnnouncementDto>, updatedBy?: string): Promise<Announcement | null> {
        if (!ObjectId.isValid(id)) return null;

        const existing = await this.collection.findOne({ _id: new ObjectId(id) });
        if (!existing) return null;

        const now = new Date();
        const note = typeof (data as any).note === 'string' ? (data as any).note.trim() || undefined : undefined;
        const updateData: Partial<AnnouncementDoc> & { updatedAt: Date } = { updatedAt: now };

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
        if ((data as any).salaryMin !== undefined) updateData.salaryMin = (data as any).salaryMin;
        if ((data as any).salaryMax !== undefined) updateData.salaryMax = (data as any).salaryMax;
        if ((data as any).difficulty !== undefined) updateData.difficulty = (data as any).difficulty;
        if ((data as any).cutoffMarks !== undefined) updateData.cutoffMarks = (data as any).cutoffMarks;
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
        if (data.status !== undefined) {
            const status = normalizeStatus(data.status);
            updateData.status = status;
            updateData.isActive = status !== 'archived';
        }
        if (data.publishAt !== undefined) updateData.publishAt = data.publishAt ? new Date(data.publishAt) : null;
        if (data.approvedAt !== undefined) updateData.approvedAt = data.approvedAt ? new Date(data.approvedAt) : null;
        if (data.approvedBy !== undefined) updateData.approvedBy = data.approvedBy || null;
        if ((data as any).isActive !== undefined) updateData.isActive = (data as any).isActive;

        const changeKeys = Object.keys(updateData).filter(key => key !== 'updatedAt');
        const updateOps: any = { $set: updateData };

        if (changeKeys.length > 0) {
            const versionEntry: AnnouncementVersionDoc = {
                version: existing.version ?? 1,
                updatedAt: now,
                updatedBy,
                note: note || undefined,
                snapshot: buildVersionSnapshot(existing),
            };

            updateOps.$push = {
                versions: { $each: [versionEntry], $position: 0, $slice: 20 },
            };
            updateOps.$set.version = (existing.version ?? 1) + 1;
        }

        await this.collection.updateOne(
            { _id: new ObjectId(id) },
            updateOps
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
            const query: Filter<AnnouncementDoc> = buildLiveQuery();
            if (options?.type) query.type = options.type;

            const docs = await this.collection
                .find(query)
                .sort({ viewCount: -1 })
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
                    ...buildLiveQuery(),
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
            return await this.collection.distinct('category', buildLiveQuery());
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
            return await this.collection.distinct('organization', buildLiveQuery());
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
                { $match: buildLiveQuery() },
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
                    status: DEFAULT_STATUS,
                    version: 1,
                    versions: [],
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
    static async batchUpdate(
        updates: Array<{
            id: string;
            data: Partial<CreateAnnouncementDto> & { isActive?: boolean };
        }>,
        updatedBy?: string
    ): Promise<{ updated: number; errors: string[] }> {
        const errors: string[] = [];
        let updated = 0;

        for (const update of updates) {
            if (!ObjectId.isValid(update.id)) {
                errors.push(`Invalid ID: ${update.id}`);
                continue;
            }

            try {
                const result = await this.update(update.id, update.data as Partial<CreateAnnouncementDto>, updatedBy);
                if (result) {
                    updated += 1;
                } else {
                    errors.push(`Announcement not found: ${update.id}`);
                }
            } catch (error: any) {
                errors.push(`Update failed for ${update.id}: ${error?.message || error}`);
            }
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
                        status: DEFAULT_STATUS,
                        version: 1,
                        versions: [],
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
        const versions = doc.versions?.map((version) => ({
            version: version.version,
            updatedAt: version.updatedAt?.toISOString() as any,
            updatedBy: version.updatedBy,
            note: version.note,
            snapshot: {
                title: version.snapshot.title,
                type: version.snapshot.type,
                category: version.snapshot.category,
                organization: version.snapshot.organization,
                content: version.snapshot.content,
                externalLink: version.snapshot.externalLink,
                location: version.snapshot.location,
                deadline: version.snapshot.deadline?.toISOString() as any,
                minQualification: version.snapshot.minQualification,
                ageLimit: version.snapshot.ageLimit,
                applicationFee: version.snapshot.applicationFee,
                totalPosts: version.snapshot.totalPosts,
                tags: version.snapshot.tags?.map(t => ({ id: 0, name: t, slug: t.toLowerCase() })) || [],
                importantDates: version.snapshot.importantDates?.map((date, index) => ({
                    id: `${doc._id.toString()}-v${version.version}-${index}`,
                    announcementId: doc._id.toString(),
                    eventName: date.eventName,
                    eventDate: date.eventDate?.toISOString() as any,
                    description: date.description,
                })) || [],
                jobDetails: version.snapshot.jobDetails,
                status: normalizeStatus(version.snapshot.status),
                publishAt: version.snapshot.publishAt?.toISOString() as any,
                approvedAt: version.snapshot.approvedAt?.toISOString() as any,
                approvedBy: version.snapshot.approvedBy,
                isActive: version.snapshot.isActive ?? true,
            },
        })) || [];

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
            salaryMin: doc.salaryMin,
            salaryMax: doc.salaryMax,
            difficulty: doc.difficulty,
            cutoffMarks: doc.cutoffMarks,
            totalPosts: doc.totalPosts,
            tags: doc.tags?.map(t => ({ id: 0, name: t, slug: t.toLowerCase() })) || [],
            postedBy: doc.postedBy?.toString(),
            postedAt: doc.postedAt?.toISOString() as any,
            updatedAt: doc.updatedAt?.toISOString() as any,
            status: normalizeStatus(doc.status),
            publishAt: doc.publishAt?.toISOString() as any,
            approvedAt: doc.approvedAt?.toISOString() as any,
            approvedBy: doc.approvedBy,
            version: doc.version ?? 1,
            versions,
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
