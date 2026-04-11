import { Router } from 'express';
import { z } from 'zod';

import { optionalAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { getCollectionAsync } from '../services/cosmosdb.js';

const router = Router();

interface ForumDoc {
    title: string;
    content: string;
    category: string;
    author: string;
    createdAt: Date;
    updatedAt: Date;
}

interface QaDoc {
    question: string;
    answer?: string | null;
    answeredBy?: string | null;
    author: string;
    createdAt: Date;
    updatedAt: Date;
}

interface GroupDoc {
    name: string;
    topic: string;
    language: string;
    link?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

type CommunityEntityType = 'forum' | 'qa' | 'group';

interface FlagDoc {
    entityType: CommunityEntityType;
    entityId: string;
    reason: string;
    reporter?: string | null;
    status: 'open' | 'reviewed' | 'resolved';
    createdAt: Date;
    updatedAt: Date;
}

const forumsCollection = () => getCollectionAsync<ForumDoc>('community_forums');
const qaCollection = () => getCollectionAsync<QaDoc>('community_qa');
const groupsCollection = () => getCollectionAsync<GroupDoc>('community_groups');
const flagsCollection = () => getCollectionAsync<FlagDoc>('community_flags');

const listQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(50).optional(),
    offset: z.coerce.number().int().min(0).max(500).optional(),
});

const forumCreateSchema = z.object({
    title: z.string().trim().min(3).max(120),
    content: z.string().trim().min(5).max(2000),
    category: z.string().trim().min(2).max(50),
    author: z.string().trim().min(2).max(60).optional().default('Guest'),
});

const qaCreateSchema = z.object({
    question: z.string().trim().min(5).max(500),
    author: z.string().trim().min(2).max(60).optional().default('Guest'),
});

const groupCreateSchema = z.object({
    name: z.string().trim().min(3).max(80),
    topic: z.string().trim().min(3).max(120),
    language: z.string().trim().min(2).max(40),
    link: z.string().trim().url().optional().or(z.literal('')).transform((value) => value || undefined),
});

const flagCreateSchema = z.object({
    entityType: z.enum(['forum', 'qa', 'group']),
    entityId: z.string().trim().min(1),
    reason: z.string().trim().min(3).max(300),
    reporter: z.string().trim().min(2).max(60).optional(),
});

const formatDoc = (doc: any) => {
    const { _id, ...rest } = doc;
    return { id: _id?.toString?.() || _id, ...rest };
};

router.get('/forums', async (req, res) => {
    const parseResult = listQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.flatten() });
    }

    try {
        const limit = parseResult.data.limit ?? 20;
        const offset = parseResult.data.offset ?? 0;
        const col = await forumsCollection();
        const [items, total] = await Promise.all([
            col
                .find({})
                .sort({ createdAt: -1 })
                .skip(offset)
                .limit(limit)
                .toArray(),
            col.countDocuments(),
        ]);

        return res.json({ data: items.map(formatDoc), count: total });
    } catch (error) {
        console.error('Forums fetch error:', error);
        return res.status(500).json({ error: 'Failed to load forums' });
    }
});

router.post('/forums', rateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 20, keyPrefix: 'community-forums' }), async (req, res) => {
    const parseResult = forumCreateSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.flatten() });
    }

    try {
        const now = new Date();
        const input = parseResult.data;
        const doc: ForumDoc = {
            title: input.title,
            content: input.content,
            category: input.category,
            author: input.author,
            createdAt: now,
            updatedAt: now,
        };
        const col = await forumsCollection();
        const result = await col.insertOne(doc as any);
        return res.status(201).json({ data: formatDoc({ ...doc, _id: result.insertedId }) });
    } catch (error) {
        console.error('Forum create error:', error);
        return res.status(500).json({ error: 'Failed to create forum post' });
    }
});

router.get('/qa', async (req, res) => {
    const parseResult = listQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.flatten() });
    }

    try {
        const limit = parseResult.data.limit ?? 20;
        const offset = parseResult.data.offset ?? 0;
        const col = await qaCollection();
        const [items, total] = await Promise.all([
            col
                .find({})
                .sort({ createdAt: -1 })
                .skip(offset)
                .limit(limit)
                .toArray(),
            col.countDocuments(),
        ]);

        return res.json({ data: items.map(formatDoc), count: total });
    } catch (error) {
        console.error('QA fetch error:', error);
        return res.status(500).json({ error: 'Failed to load Q&A' });
    }
});

router.post('/qa', rateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 20, keyPrefix: 'community-qa' }), async (req, res) => {
    const parseResult = qaCreateSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.flatten() });
    }

    try {
        const now = new Date();
        const input = parseResult.data;
        const doc: QaDoc = {
            question: input.question,
            author: input.author,
            answer: null,
            createdAt: now,
            updatedAt: now,
        };
        const col = await qaCollection();
        const result = await col.insertOne(doc as any);
        return res.status(201).json({ data: formatDoc({ ...doc, _id: result.insertedId }) });
    } catch (error) {
        console.error('QA create error:', error);
        return res.status(500).json({ error: 'Failed to create question' });
    }
});

router.get('/groups', async (req, res) => {
    const parseResult = listQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.flatten() });
    }

    try {
        const limit = parseResult.data.limit ?? 20;
        const offset = parseResult.data.offset ?? 0;
        const col = await groupsCollection();
        const [items, total] = await Promise.all([
            col
                .find({})
                .sort({ createdAt: -1 })
                .skip(offset)
                .limit(limit)
                .toArray(),
            col.countDocuments(),
        ]);

        return res.json({ data: items.map(formatDoc), count: total });
    } catch (error) {
        console.error('Groups fetch error:', error);
        return res.status(500).json({ error: 'Failed to load study groups' });
    }
});

router.post('/groups', rateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 20, keyPrefix: 'community-groups' }), async (req, res) => {
    const parseResult = groupCreateSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.flatten() });
    }

    try {
        const now = new Date();
        const input = parseResult.data;
        const doc: GroupDoc = {
            name: input.name,
            topic: input.topic,
            language: input.language,
            link: input.link || null,
            createdAt: now,
            updatedAt: now,
        };
        const col = await groupsCollection();
        const result = await col.insertOne(doc as any);
        return res.status(201).json({ data: formatDoc({ ...doc, _id: result.insertedId }) });
    } catch (error) {
        console.error('Group create error:', error);
        return res.status(500).json({ error: 'Failed to create study group' });
    }
});

router.post('/flags', rateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 30, keyPrefix: 'community-flags' }), optionalAuth, async (req, res) => {
    const parseResult = flagCreateSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.flatten() });
    }

    try {
        const now = new Date();
        const input = parseResult.data;
        const doc: FlagDoc = {
            entityType: input.entityType,
            entityId: input.entityId,
            reason: input.reason,
            reporter: input.reporter ?? req.user?.email ?? 'Anonymous',
            status: 'open',
            createdAt: now,
            updatedAt: now,
        };
        const col = await flagsCollection();
        const result = await col.insertOne(doc as any);
        return res.status(201).json({ data: formatDoc({ ...doc, _id: result.insertedId }) });
    } catch (error) {
        console.error('Flag create error:', error);
        return res.status(500).json({ error: 'Failed to submit report' });
    }
});

export default router;
