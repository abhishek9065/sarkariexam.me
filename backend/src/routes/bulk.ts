import { Router } from 'express';
import { z } from 'zod';

import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { AnnouncementModelMongo } from '../models/announcements.mongo.js';
import { ContentType } from '../types.js';

const router = Router();

const bulkSchema = z.object({
    announcements: z.array(z.object({
        title: z.string().min(5),
        type: z.enum(['job', 'result', 'admit-card', 'syllabus', 'answer-key', 'admission'] as [ContentType, ...ContentType[]]),
        category: z.string().min(2),
        organization: z.string().min(2),
        content: z.string().optional(),
        externalLink: z.string().url().optional().or(z.literal('')),
        location: z.string().optional(),
        deadline: z.string().optional(),
        minQualification: z.string().optional(),
        ageLimit: z.string().optional(),
        applicationFee: z.string().optional(),
        totalPosts: z.number().int().positive().optional(),
        tags: z.array(z.string()).optional(),
        importantDates: z.array(z.object({
            eventName: z.string(),
            eventDate: z.string(),
            description: z.string().optional(),
        })).optional(),
        jobDetails: z.any().optional(),
    })).min(1),
});

router.post('/import', authenticateToken, requirePermission('announcements:write'), async (req, res) => {
    const parseResult = bulkSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.flatten() });
    }

    try {
        const items = parseResult.data.announcements.map(item => ({
            title: item.title,
            type: item.type,
            category: item.category,
            organization: item.organization,
            content: item.content,
            externalLink: item.externalLink,
            location: item.location,
            deadline: item.deadline ? new Date(item.deadline) : undefined,
            minQualification: item.minQualification,
            ageLimit: item.ageLimit,
            applicationFee: item.applicationFee,
            totalPosts: item.totalPosts,
            tags: item.tags,
            importantDates: item.importantDates,
            jobDetails: item.jobDetails,
        }));

        const result = await AnnouncementModelMongo.batchInsert(items as any, req.user!.userId);

        return res.json({
            message: `Imported ${result.inserted} announcements`,
            inserted: result.inserted,
            errors: result.errors,
        });
    } catch (error) {
        console.error('Bulk import error:', error);
        return res.status(500).json({ error: 'Failed to import announcements' });
    }
});

export default router;
