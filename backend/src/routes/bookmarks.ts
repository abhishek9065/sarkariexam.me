import { Router, Request, Response } from 'express';
import { z } from 'zod';

import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { AnnouncementModelMongo } from '../models/announcements.mongo.js';
import { BookmarkModelMongo } from '../models/bookmarks.mongo.js';
import { recordAnalyticsEvent } from '../services/analytics.js';
import { getPathParam } from '../utils/routeParams.js';

const router = Router();

/**
 * GET /api/bookmarks
 * Get user's bookmarks (returns empty if not logged in)
 */
router.get('/', optionalAuth, async (req: Request, res: Response) => {
    if (!req.user) {
        return res.json({ data: [], count: 0 });
    }

    try {
        const ids = await BookmarkModelMongo.findAnnouncementIdsByUser(req.user.userId);
        if (ids.length === 0) {
            return res.json({ data: [], count: 0 });
        }

        const announcements = await AnnouncementModelMongo.findByIds(ids);
        const byId = new Map(announcements.map(item => [item.id.toString(), item]));
        const ordered = ids.map(id => byId.get(id)).filter(Boolean);

        return res.json({ data: ordered, count: ordered.length });
    } catch (error) {
        console.error('Error fetching bookmarks:', error);
        return res.status(500).json({ error: 'Failed to fetch bookmarks' });
    }
});

/**
 * GET /api/bookmarks/ids
 * Get user's bookmarked announcement IDs (returns empty if not logged in)
 */
router.get('/ids', optionalAuth, async (req: Request, res: Response) => {
    if (!req.user) {
        return res.json({ data: [] });
    }

    try {
        const ids = await BookmarkModelMongo.findAnnouncementIdsByUser(req.user.userId);
        return res.json({ data: ids });
    } catch (error) {
        console.error('Error fetching bookmark ids:', error);
        return res.status(500).json({ error: 'Failed to fetch bookmarks' });
    }
});

// Input validation schema for bookmarks
const bookmarkSchema = z.object({
    announcementId: z.string().trim().min(1).max(24).regex(/^[a-fA-F0-9]{24}$/, 'Invalid announcement ID format')
});

/**
 * POST /api/bookmarks
 * Add bookmark (requires auth)
 */
router.post('/', authenticateToken, async (req: Request, res: Response) => {
    try {
        const parseResult = bookmarkSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ 
                error: 'Invalid input',
                details: parseResult.error.flatten().fieldErrors
            });
        }

        const { announcementId } = parseResult.data;

        const announcement = await AnnouncementModelMongo.findById(announcementId);
        if (!announcement) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        const saved = await BookmarkModelMongo.add(req.user!.userId, announcementId);
        if (!saved) {
            return res.status(500).json({ error: 'Failed to save bookmark' });
        }

        recordAnalyticsEvent({
            type: 'bookmark_add',
            announcementId,
            userId: req.user!.userId,
        }).catch(console.error);

        return res.status(201).json({ message: 'Bookmark saved' });
    } catch (error) {
        console.error('Error saving bookmark:', error);
        return res.status(500).json({ error: 'Failed to save bookmark' });
    }
});

/**
 * DELETE /api/bookmarks/:id
 * Remove bookmark (requires auth)
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        const announcementId = getPathParam(req.params.id);
        if (!announcementId) {
            return res.status(400).json({ error: 'announcementId is required' });
        }

        // Validate ObjectId format
        if (!/^[a-fA-F0-9]{24}$/.test(announcementId)) {
            return res.status(400).json({ error: 'Invalid announcement ID format' });
        }

        const removed = await BookmarkModelMongo.remove(req.user!.userId, announcementId);
        if (!removed) {
            return res.status(404).json({ error: 'Bookmark not found' });
        }

        recordAnalyticsEvent({
            type: 'bookmark_remove',
            announcementId,
            userId: req.user!.userId,
        }).catch(console.error);

        return res.json({ message: 'Bookmark removed' });
    } catch (error) {
        console.error('Error removing bookmark:', error);
        return res.status(500).json({ error: 'Failed to remove bookmark' });
    }
});

export default router;
