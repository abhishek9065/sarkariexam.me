import { Router } from 'express';
import { z } from 'zod';

import { authenticateToken, optionalAuth, requirePermission } from '../middleware/auth.js';
import { getCollection, isValidObjectId, toObjectId } from '../services/cosmosdb.js';
import ErrorTracking from '../services/errorTracking.js';
import { getPathParam } from '../utils/routeParams.js';

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
    adminNote?: string | null;
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
    timestamp: z.string().trim().optional(),
});

const listQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(50).optional(),
    offset: z.coerce.number().int().min(0).max(500).optional(),
    status: z.enum(['new', 'triaged', 'resolved']).optional(),
    errorId: z.string().trim().min(2).max(120).optional(),
});

const updateSchema = z.object({
    status: z.enum(['new', 'triaged', 'resolved']),
    adminNote: z.string().trim().max(1000).optional(),
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

        ErrorTracking.captureMessage(`Client error report: ${doc.errorId}`, 'warning');
        ErrorTracking.addBreadcrumb({
            category: 'error_report',
            message: `${doc.errorId} ${doc.message}`,
            level: 'warning',
        });

        return res.status(201).json({ message: 'Report received', id: result.insertedId });
    } catch (error) {
        console.error('Error report create error:', error);
        return res.status(500).json({ error: 'Failed to submit report' });
    }
});

router.get('/error-reports', authenticateToken, requirePermission('admin:read'), async (req, res) => {
    const parseResult = listQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.flatten() });
    }

    try {
        const limit = parseResult.data.limit ?? 20;
        const offset = parseResult.data.offset ?? 0;
        const query: Partial<ErrorReportDoc> & { errorId?: any } = {};
        if (parseResult.data.status) {
            query.status = parseResult.data.status;
        }
        if (parseResult.data.errorId) {
            const escaped = parseResult.data.errorId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.errorId = { $regex: escaped, $options: 'i' };
        }
        const [items, total] = await Promise.all([
            reportsCollection()
                .find(query as any)
                .sort({ createdAt: -1 })
                .skip(offset)
                .limit(limit)
                .toArray(),
            reportsCollection().countDocuments(query as any),
        ]);

        const data = items.map((doc: any) => {
            const { _id, ...rest } = doc;
            return { id: _id?.toString?.() || _id, ...rest };
        });

        return res.json({ data, count: total });
    } catch (error) {
        console.error('Error reports fetch error:', error);
        return res.status(500).json({ error: 'Failed to load error reports' });
    }
});

router.patch('/error-reports/:id', authenticateToken, requirePermission('admin:write'), async (req, res) => {
    const id = getPathParam(req.params.id);
    if (!isValidObjectId(id)) {
        return res.status(400).json({ error: 'Invalid report id' });
    }
    const parseResult = updateSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.flatten() });
    }

    try {
        const now = new Date();
        const status = parseResult.data.status;
        const update: Partial<ErrorReportDoc> = {
            status,
            adminNote: parseResult.data.adminNote ?? null,
            updatedAt: now,
            resolvedAt: status === 'resolved' ? now : null,
            resolvedBy: status === 'resolved' ? (req.user?.email ?? req.user?.userId ?? 'admin') : null,
        };
        const result = await reportsCollection().updateOne(
            { _id: toObjectId(id) } as any,
            { $set: update }
        );

        if (!result.matchedCount) {
            return res.status(404).json({ error: 'Report not found' });
        }

        const updated = await reportsCollection().findOne({ _id: toObjectId(id) } as any);
        if (!updated) {
            return res.status(404).json({ error: 'Report not found' });
        }
        const { _id, ...rest } = updated as any;
        return res.json({ data: { id: _id?.toString?.() || _id, ...rest } });
    } catch (error) {
        console.error('Error report update error:', error);
        return res.status(500).json({ error: 'Failed to update error report' });
    }
});

export default router;
