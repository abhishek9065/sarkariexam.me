import { Router } from 'express';
import { z } from 'zod';
import { getCollection } from '../services/cosmosdb.js';
import { requireAuth } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = Router();

const AlertSchema = z.object({
    name: z.string().min(1).max(100),
    criteria: z.object({
        keywords: z.array(z.string()).optional(),
        types: z.array(z.enum(['job', 'result', 'admit-card', 'answer-key', 'admission', 'syllabus'])).optional(),
        locations: z.array(z.string()).optional(),
        organizations: z.array(z.string()).optional(),
        qualifications: z.array(z.string()).optional(),
    }),
    frequency: z.enum(['instant', 'daily', 'weekly']),
    channels: z.object({
        email: z.boolean().optional(),
        push: z.boolean().optional(),
    }),
});

interface JobAlert {
    _id?: unknown;
    userId: string;
    name: string;
    criteria: {
        keywords?: string[];
        types?: string[];
        locations?: string[];
        organizations?: string[];
        qualifications?: string[];
    };
    frequency: 'instant' | 'daily' | 'weekly';
    channels: {
        email?: boolean;
        push?: boolean;
    };
    isActive: boolean;
    lastTriggered?: Date;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * GET /api/alerts
 * Get all alerts for the authenticated user
 */
router.get('/', requireAuth, async (req, res) => {
    try {
        const collection = getCollection<JobAlert>('job_alerts');
        const alerts = await collection
            .find({ userId: req.user!.id })
            .sort({ createdAt: -1 })
            .toArray();

        res.json({
            success: true,
            data: alerts,
        });
    } catch (error) {
        logger.error('Failed to fetch alerts', { error, userId: req.user?.id });
        res.status(500).json({
            error: 'Failed to fetch alerts',
        });
    }
});

/**
 * POST /api/alerts
 * Create a new job alert
 */
router.post('/', requireAuth, async (req, res) => {
    try {
        const parsed = AlertSchema.safeParse(req.body);
        
        if (!parsed.success) {
            return res.status(400).json({
                error: 'Invalid alert data',
                details: parsed.error.errors,
            });
        }

        const collection = getCollection<JobAlert>('job_alerts');
        
        // Check alert limit (max 10 per user)
        const existingCount = await collection.countDocuments({ userId: req.user!.id });
        if (existingCount >= 10) {
            return res.status(400).json({
                error: 'Alert limit reached',
                message: 'You can create a maximum of 10 alerts',
            });
        }

        const alert: JobAlert = {
            userId: req.user!.id,
            ...parsed.data,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await collection.insertOne(alert);

        logger.info('Job alert created', { userId: req.user!.id, alertId: result.insertedId });

        res.status(201).json({
            success: true,
            data: { ...alert, _id: result.insertedId },
        });
    } catch (error) {
        logger.error('Failed to create alert', { error, userId: req.user?.id });
        res.status(500).json({
            error: 'Failed to create alert',
        });
    }
});

/**
 * PATCH /api/alerts/:id
 * Update an existing alert
 */
router.patch('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const parsed = AlertSchema.partial().safeParse(req.body);
        
        if (!parsed.success) {
            return res.status(400).json({
                error: 'Invalid alert data',
                details: parsed.error.errors,
            });
        }

        const collection = getCollection<JobAlert>('job_alerts');
        const { ObjectId } = await import('mongodb');
        
        const result = await collection.findOneAndUpdate(
            { _id: new ObjectId(id), userId: req.user!.id },
            { $set: { ...parsed.data, updatedAt: new Date() } },
            { returnDocument: 'after' }
        );

        if (!result) {
            return res.status(404).json({
                error: 'Alert not found',
            });
        }

        logger.info('Job alert updated', { userId: req.user!.id, alertId: id });

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        logger.error('Failed to update alert', { error, userId: req.user?.id });
        res.status(500).json({
            error: 'Failed to update alert',
        });
    }
});

/**
 * DELETE /api/alerts/:id
 * Delete an alert
 */
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const collection = getCollection<JobAlert>('job_alerts');
        const { ObjectId } = await import('mongodb');
        
        const result = await collection.deleteOne({
            _id: new ObjectId(id),
            userId: req.user!.id,
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                error: 'Alert not found',
            });
        }

        logger.info('Job alert deleted', { userId: req.user!.id, alertId: id });

        res.json({
            success: true,
            message: 'Alert deleted successfully',
        });
    } catch (error) {
        logger.error('Failed to delete alert', { error, userId: req.user?.id });
        res.status(500).json({
            error: 'Failed to delete alert',
        });
    }
});

export default router;
