import type { Request, Response } from 'express';
import { Router } from 'express';

import { authenticateToken, requireAdminStepUp, requirePermission } from '../middleware/auth.js';
import { delegateToAuthRouter } from '../services/adminAuth/delegate.js';
import { terminateAllOtherSessions, terminateSessionById } from '../services/adminAuth/sessions.js';

const router = Router();

const resolveRequestId = (req: Request, res: Response): string => {
    const headerValue = res.getHeader('X-Request-Id');
    if (typeof headerValue === 'string' && headerValue.trim()) {
        return headerValue;
    }
    return req.requestId ?? 'unknown';
};

const sendAdminAuthError = (
    req: Request,
    res: Response,
    status: number,
    error: string,
    code: string,
    message?: string,
    details?: unknown
) => {
    return res.status(status).json({
        error,
        code,
        message: message ?? error,
        requestId: resolveRequestId(req, res),
        ...(details ? { details } : {}),
    });
};

// Additive admin-auth namespace that reuses hardened auth flows.
router.post('/login', delegateToAuthRouter('/login'));
router.post('/logout', delegateToAuthRouter('/logout'));
router.get('/me', delegateToAuthRouter('/me'));
router.get('/permissions', delegateToAuthRouter('/admin/permissions'));

router.post('/step-up', delegateToAuthRouter('/admin/step-up'));
router.post('/2fa/setup', delegateToAuthRouter('/admin/2fa/setup'));
router.post('/2fa/verify', delegateToAuthRouter('/admin/2fa/verify'));
router.post('/2fa/backup-codes', delegateToAuthRouter('/admin/2fa/backup-codes'));
router.get('/2fa/backup-codes/status', delegateToAuthRouter('/admin/2fa/backup-codes/status'));

router.post('/sessions/terminate', authenticateToken, requirePermission('security:read'), requireAdminStepUp, async (req, res) => {
    const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId.trim() : '';
    if (sessionId.length < 8) {
        return sendAdminAuthError(
            req,
            res,
            400,
            'validation_error',
            'VALIDATION_ERROR',
            'Invalid session termination payload.'
        );
    }

    try {
        const data = await terminateSessionById({ sessionId });
        return res.json({ data });
    } catch (error) {
        console.error('Admin-auth session terminate error:', error);
        return sendAdminAuthError(
            req,
            res,
            500,
            'session_terminate_failed',
            'ADMIN_AUTH_SESSION_TERMINATE_FAILED',
            'Failed to terminate session.'
        );
    }
});

router.post('/sessions/terminate-others', authenticateToken, requirePermission('security:read'), requireAdminStepUp, async (req, res) => {
    try {
        if (!req.user?.userId) {
            return sendAdminAuthError(
                req,
                res,
                401,
                'authentication_required',
                'AUTHENTICATION_REQUIRED',
                'Authentication required.'
            );
        }
        const data = await terminateAllOtherSessions({
            userId: req.user.userId,
            currentSessionId: req.user.sessionId,
        });
        return res.json({ data });
    } catch (error) {
        console.error('Admin-auth terminate-others error:', error);
        return sendAdminAuthError(
            req,
            res,
            500,
            'session_terminate_others_failed',
            'ADMIN_AUTH_TERMINATE_OTHERS_FAILED',
            'Failed to terminate other sessions.'
        );
    }
});

export default router;
