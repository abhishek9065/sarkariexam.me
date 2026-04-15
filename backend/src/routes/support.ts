import { Router } from 'express';
import { z } from 'zod';

import { optionalAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import ErrorReportModelPostgres from '../models/errorReports.postgres.js';
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
    updatedAt?: Date;
    userId?: string | null;
    userEmail?: string | null;
    status: 'new' | 'triaged' | 'resolved';
    reviewNote?: string | null;
    assigneeEmail?: string | null;
    release?: string | null;
    requestId?: string | null;
    sentryEventUrl?: string | null;
    resolvedAt?: Date | null;
    resolvedBy?: string | null;
}

const reportSchema = z.object({
    errorId: z.string().trim().min(6).max(120),
    message: z.string().trim().min(1).max(500),
    pageUrl: z.string().trim().max(500).optional(),
    userAgent: z.string().trim().max(300).optional(),
    note: z.string().trim().max(1000).optional(),
    stack: z.string().trim().max(5000).optional(),
    componentStack: z.string().trim().max(5000).optional(),
    release: z.string().trim().max(200).optional(),
    requestId: z.string().trim().max(120).optional(),
    sentryEventUrl: z.string().trim().max(1000).optional(),
    timestamp: z.string().trim().optional(),
});

router.post('/error-report', rateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 20, keyPrefix: 'support-error-report' }), optionalAuth, async (req, res) => {
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
            release: input.release ?? null,
            requestId: input.requestId ?? req.requestId ?? null,
            sentryEventUrl: input.sentryEventUrl ?? null,
            createdAt: now,
            userId: req.user?.userId ?? null,
            userEmail: req.user?.email ?? null,
            status: 'new',
        };

        const result = await ErrorReportModelPostgres.create({
            errorId: doc.errorId,
            message: doc.message,
            pageUrl: doc.pageUrl,
            userAgent: doc.userAgent,
            note: doc.note,
            stack: doc.stack,
            componentStack: doc.componentStack,
            createdAt: doc.createdAt,
            userId: doc.userId,
            userEmail: doc.userEmail,
            status: doc.status,
            reviewNote: doc.reviewNote,
            assigneeEmail: doc.assigneeEmail,
            release: doc.release,
            requestId: doc.requestId,
            sentryEventUrl: doc.sentryEventUrl,
        });

        ErrorTracking.captureMessage(`Client error report: ${doc.errorId}`, 'warning');
        ErrorTracking.addBreadcrumb({
            category: 'error_report',
            message: `${doc.errorId} ${doc.message}`,
            level: 'warning',
        });

        return res.status(201).json({ message: 'Report received', id: result.id });
    } catch (error) {
        console.error('Error report create error:', error);
        return res.status(500).json({ error: 'Failed to submit report' });
    }
});

export default router;
