import { Router } from 'express';
import { z } from 'zod';

import { optionalAuth } from '../middleware/auth.js';
import { getCollection } from '../services/cosmosdb.js';
import ErrorTracking from '../services/errorTracking.js';

const router = Router();

interface ErrorReportDoc {
    errorId: string;
    message: string;
    pageUrl?: string | null;
    userAgent?: string | null;
    note?: string | null;
    stack?: string | null;
    componentStack?: string | null;
    createdAt: Date;
    userId?: string | null;
    userEmail?: string | null;
    status: 'new' | 'triaged' | 'resolved';
}

const reportSchema = z.object({
    errorId: z.string().trim().min(6).max(120),
    message: z.string().trim().min(1).max(500),
    pageUrl: z.string().trim().max(500).optional(),
    userAgent: z.string().trim().max(300).optional(),
    note: z.string().trim().max(1000).optional(),
    stack: z.string().trim().max(5000).optional(),
    componentStack: z.string().trim().max(5000).optional(),
    timestamp: z.string().trim().optional(),
});

const reportsCollection = () => getCollection<ErrorReportDoc>('error_reports');

router.post('/error-report', optionalAuth, async (req, res) => {
    const parseResult = reportSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.flatten() });
    }

    try {
        const now = new Date();
        const input = parseResult.data;
        const doc: ErrorReportDoc = {
            errorId: input.errorId,
            message: input.message,
            pageUrl: input.pageUrl ?? null,
            userAgent: input.userAgent ?? null,
            note: input.note ?? null,
            stack: input.stack ?? null,
            componentStack: input.componentStack ?? null,
            createdAt: now,
            userId: req.user?.userId ?? null,
            userEmail: req.user?.email ?? null,
            status: 'new',
        };

        const result = await reportsCollection().insertOne(doc as any);

        ErrorTracking.captureMessage('Client error report', 'error');
        ErrorTracking.addBreadcrumb({
            category: 'error_report',
            message: `${doc.errorId} ${doc.message}`,
            level: 'error',
        });

        return res.status(201).json({ message: 'Report received', id: result.insertedId });
    } catch (error) {
        console.error('Error report create error:', error);
        return res.status(500).json({ error: 'Failed to submit report' });
    }
});

export default router;
