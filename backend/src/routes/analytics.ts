import { Router } from 'express';
import { z } from 'zod';
import { getCollection } from '../services/cosmosdb.js';
import logger from '../utils/logger.js';

const router = Router();

const AnalyticsEventSchema = z.object({
    event: z.string().min(1).max(100),
    data: z.record(z.unknown()).optional(),
    timestamp: z.number().optional(),
    userId: z.string().optional(),
    sessionId: z.string().optional(),
    url: z.string().optional(),
    userAgent: z.string().optional(),
});

interface AnalyticsEventDoc {
    event: string;
    data?: Record<string, unknown>;
    timestamp: Date;
    userId?: string;
    sessionId?: string;
    url?: string;
    userAgent?: string;
    ip?: string;
    createdAt: Date;
}

/**
 * POST /api/analytics/event
 * Track a custom analytics event from the frontend
 */
router.post('/event', async (req, res) => {
    try {
        const parsed = AnalyticsEventSchema.safeParse(req.body);
        
        if (!parsed.success) {
            return res.status(400).json({
                error: 'Invalid event data',
                details: parsed.error.errors,
            });
        }

        const { event, data, timestamp, userId, sessionId, url, userAgent } = parsed.data;

        const collection = getCollection<AnalyticsEventDoc>('analytics_events');
        
        const eventDoc: AnalyticsEventDoc = {
            event,
            data,
            timestamp: timestamp ? new Date(timestamp) : new Date(),
            userId,
            sessionId,
            url: url || req.headers.referer,
            userAgent: userAgent || req.headers['user-agent'],
            ip: req.ip,
            createdAt: new Date(),
        };

        await collection.insertOne(eventDoc);

        logger.info('Analytics event tracked', { event, userId });

        res.status(201).json({
            success: true,
            message: 'Event tracked successfully',
        });
    } catch (error) {
        logger.error('Failed to track analytics event', { error });
        res.status(500).json({
            error: 'Failed to track event',
        });
    }
});

/**
 * POST /api/analytics/batch
 * Track multiple analytics events in a single request
 */
router.post('/batch', async (req, res) => {
    try {
        const BatchSchema = z.object({
            events: z.array(AnalyticsEventSchema).min(1).max(50),
        });

        const parsed = BatchSchema.safeParse(req.body);
        
        if (!parsed.success) {
            return res.status(400).json({
                error: 'Invalid batch data',
                details: parsed.error.errors,
            });
        }

        const collection = getCollection<AnalyticsEventDoc>('analytics_events');
        
        const eventDocs: AnalyticsEventDoc[] = parsed.data.events.map(evt => ({
            event: evt.event,
            data: evt.data,
            timestamp: evt.timestamp ? new Date(evt.timestamp) : new Date(),
            userId: evt.userId,
            sessionId: evt.sessionId,
            url: evt.url || req.headers.referer,
            userAgent: evt.userAgent || req.headers['user-agent'],
            ip: req.ip,
            createdAt: new Date(),
        }));

        await collection.insertMany(eventDocs);

        logger.info('Analytics batch tracked', { count: eventDocs.length });

        res.status(201).json({
            success: true,
            message: `${eventDocs.length} events tracked successfully`,
        });
    } catch (error) {
        logger.error('Failed to track analytics batch', { error });
        res.status(500).json({
            error: 'Failed to track batch',
        });
    }
});

export default router;
