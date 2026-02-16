import { Router } from 'express';

import { authenticateToken, requireAdminStepUp, requirePermission } from '../middleware/auth.js';
import { delegateToAuthRouter } from '../services/adminAuth/delegate.js';
import { terminateAllOtherSessions, terminateSessionById } from '../services/adminAuth/sessions.js';

const router = Router();

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
    try {
        const data = await terminateSessionById(req.body ?? {});
        return res.json({ data });
    } catch (error) {
        console.error('Admin-auth session terminate error:', error);
        return res.status(400).json({ error: 'Failed to terminate session' });
    }
});

router.post('/sessions/terminate-others', authenticateToken, requirePermission('security:read'), requireAdminStepUp, async (req, res) => {
    try {
        if (!req.user?.userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const data = await terminateAllOtherSessions({
            userId: req.user.userId,
            currentSessionId: req.user.sessionId,
        });
        return res.json({ data });
    } catch (error) {
        console.error('Admin-auth terminate-others error:', error);
        return res.status(500).json({ error: 'Failed to terminate other sessions' });
    }
});

export default router;
