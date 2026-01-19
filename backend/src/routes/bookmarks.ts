import { Router, Request, Response } from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { BookmarkModelMongo } from '../models/bookmarks.mongo.js';
import { AnnouncementModelMongo } from '../models/announcements.mongo.js';

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

/**
 * POST /api/bookmarks
 * Add bookmark (requires auth)
 */
router.post('/', authenticateToken, async (req: Request, res: Response) => {
    try {
        const { announcementId } = req.body as { announcementId?: string };
        if (!announcementId) {
            return res.status(400).json({ error: 'announcementId is required' });
        }

        const announcement = await AnnouncementModelMongo.findById(announcementId);
        if (!announcement) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        const saved = await BookmarkModelMongo.add(req.user!.userId, announcementId);
        if (!saved) {
            return res.status(500).json({ error: 'Failed to save bookmark' });
        }

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
        const announcementId = req.params.id;
        if (!announcementId) {
            return res.status(400).json({ error: 'announcementId is required' });
        }

        const removed = await BookmarkModelMongo.remove(req.user!.userId, announcementId);
        if (!removed) {
            return res.status(404).json({ error: 'Bookmark not found' });
        }

        return res.json({ message: 'Bookmark removed' });
    } catch (error) {
        console.error('Error removing bookmark:', error);
        return res.status(500).json({ error: 'Failed to remove bookmark' });
    }
});

export default router;
