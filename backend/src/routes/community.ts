import { Router } from 'express';
import { z } from 'zod';

import { authenticateToken, optionalAuth, requirePermission } from '../middleware/auth.js';
import { getCollection, isValidObjectId, toObjectId } from '../services/cosmosdb.js';

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

const forumsCollection = () => getCollection<ForumDoc>('community_forums');
const qaCollection = () => getCollection<QaDoc>('community_qa');
const groupsCollection = () => getCollection<GroupDoc>('community_groups');
const flagsCollection = () => getCollection<FlagDoc>('community_flags');

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

const qaAnswerSchema = z.object({
    answer: z.string().trim().min(2).max(2000),
    answeredBy: z.string().trim().min(2).max(60).optional(),
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

const flagListSchema = listQuerySchema.extend({
    status: z.enum(['open', 'reviewed', 'resolved']).optional(),
    entityType: z.enum(['forum', 'qa', 'group']).optional(),
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
        const [items, total] = await Promise.all([
            forumsCollection()
                .find({})
                .sort({ createdAt: -1 })
                .skip(offset)
                .limit(limit)
                .toArray(),
            forumsCollection().countDocuments(),
        ]);

        return res.json({ data: items.map(formatDoc), count: total });
    } catch (error) {
        console.error('Forums fetch error:', error);
        return res.status(500).json({ error: 'Failed to load forums' });
    }
});

router.post('/forums', async (req, res) => {
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
        const result = await forumsCollection().insertOne(doc as any);
        return res.status(201).json({ data: formatDoc({ ...doc, _id: result.insertedId }) });
    } catch (error) {
        console.error('Forum create error:', error);
        return res.status(500).json({ error: 'Failed to create forum post' });
    }
});

router.delete('/forums/:id', authenticateToken, requirePermission('admin:write'), async (req, res) => {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
        return res.status(400).json({ error: 'Invalid forum id' });
    }

    try {
        const result = await forumsCollection().deleteOne({ _id: toObjectId(id) } as any);
        if (!result.deletedCount) {
            return res.status(404).json({ error: 'Forum post not found' });
        }
        return res.json({ message: 'Forum post deleted' });
    } catch (error) {
        console.error('Forum delete error:', error);
        return res.status(500).json({ error: 'Failed to delete forum post' });
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
        const [items, total] = await Promise.all([
            qaCollection()
                .find({})
                .sort({ createdAt: -1 })
                .skip(offset)
                .limit(limit)
                .toArray(),
            qaCollection().countDocuments(),
        ]);

        return res.json({ data: items.map(formatDoc), count: total });
    } catch (error) {
        console.error('QA fetch error:', error);
        return res.status(500).json({ error: 'Failed to load Q&A' });
    }
});

router.post('/qa', async (req, res) => {
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
        const result = await qaCollection().insertOne(doc as any);
        return res.status(201).json({ data: formatDoc({ ...doc, _id: result.insertedId }) });
    } catch (error) {
        console.error('QA create error:', error);
        return res.status(500).json({ error: 'Failed to create question' });
    }
});

router.patch('/qa/:id/answer', authenticateToken, requirePermission('admin:write'), async (req, res) => {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
        return res.status(400).json({ error: 'Invalid question id' });
    }
    const parseResult = qaAnswerSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.flatten() });
    }

    try {
        const now = new Date();
        const update: Partial<QaDoc> = {
            answer: parseResult.data.answer,
            updatedAt: now,
            answeredBy: parseResult.data.answeredBy ?? null,
        };
        const result = await qaCollection().findOneAndUpdate(
            { _id: toObjectId(id) } as any,
            { $set: update },
            { returnDocument: 'after' }
        );
        if (!result.value) {
            return res.status(404).json({ error: 'Question not found' });
        }
        return res.json({ data: formatDoc(result.value) });
    } catch (error) {
        console.error('QA answer error:', error);
        return res.status(500).json({ error: 'Failed to answer question' });
    }
});

router.delete('/qa/:id', authenticateToken, requirePermission('admin:write'), async (req, res) => {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
        return res.status(400).json({ error: 'Invalid question id' });
    }

    try {
        const result = await qaCollection().deleteOne({ _id: toObjectId(id) } as any);
        if (!result.deletedCount) {
            return res.status(404).json({ error: 'Question not found' });
        }
        return res.json({ message: 'Question deleted' });
    } catch (error) {
        console.error('QA delete error:', error);
        return res.status(500).json({ error: 'Failed to delete question' });
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
        const [items, total] = await Promise.all([
            groupsCollection()
                .find({})
                .sort({ createdAt: -1 })
                .skip(offset)
                .limit(limit)
                .toArray(),
            groupsCollection().countDocuments(),
        ]);

        return res.json({ data: items.map(formatDoc), count: total });
    } catch (error) {
        console.error('Groups fetch error:', error);
        return res.status(500).json({ error: 'Failed to load study groups' });
    }
});

router.post('/groups', async (req, res) => {
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
        const result = await groupsCollection().insertOne(doc as any);
        return res.status(201).json({ data: formatDoc({ ...doc, _id: result.insertedId }) });
    } catch (error) {
        console.error('Group create error:', error);
        return res.status(500).json({ error: 'Failed to create study group' });
    }
});

router.delete('/groups/:id', authenticateToken, requirePermission('admin:write'), async (req, res) => {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
        return res.status(400).json({ error: 'Invalid group id' });
    }

    try {
        const result = await groupsCollection().deleteOne({ _id: toObjectId(id) } as any);
        if (!result.deletedCount) {
            return res.status(404).json({ error: 'Study group not found' });
        }
        return res.json({ message: 'Study group deleted' });
    } catch (error) {
        console.error('Group delete error:', error);
        return res.status(500).json({ error: 'Failed to delete study group' });
    }
});

router.get('/flags', authenticateToken, requirePermission('admin:read'), async (req, res) => {
    const parseResult = flagListSchema.safeParse(req.query);
    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.flatten() });
    }

    try {
        const limit = parseResult.data.limit ?? 20;
        const offset = parseResult.data.offset ?? 0;
        const query: Partial<FlagDoc> = {};
        if (parseResult.data.status) query.status = parseResult.data.status;
        if (parseResult.data.entityType) query.entityType = parseResult.data.entityType;
        const [items, total] = await Promise.all([
            flagsCollection()
                .find(query as any)
                .sort({ createdAt: -1 })
                .skip(offset)
                .limit(limit)
                .toArray(),
            flagsCollection().countDocuments(query as any),
        ]);
        return res.json({ data: items.map(formatDoc), count: total });
    } catch (error) {
        console.error('Flags fetch error:', error);
        return res.status(500).json({ error: 'Failed to load flags' });
    }
});

router.post('/flags', optionalAuth, async (req, res) => {
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
        const result = await flagsCollection().insertOne(doc as any);
        return res.status(201).json({ data: formatDoc({ ...doc, _id: result.insertedId }) });
    } catch (error) {
        console.error('Flag create error:', error);
        return res.status(500).json({ error: 'Failed to submit report' });
    }
});

router.delete('/flags/:id', authenticateToken, requirePermission('admin:write'), async (req, res) => {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
        return res.status(400).json({ error: 'Invalid flag id' });
    }

    try {
        const result = await flagsCollection().deleteOne({ _id: toObjectId(id) } as any);
        if (!result.deletedCount) {
            return res.status(404).json({ error: 'Flag not found' });
        }
        return res.json({ message: 'Flag resolved' });
    } catch (error) {
        console.error('Flag delete error:', error);
        return res.status(500).json({ error: 'Failed to resolve flag' });
    }
});

export default router;
