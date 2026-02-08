import { ObjectId } from 'mongodb';
import { describe, expect, it } from 'vitest';

import {
  cleanupOldAdminApprovals,
  createAdminApprovalRequest,
  getAdminApprovalRequest,
  validateApprovalForExecution,
} from '../services/adminApprovals.js';
import { getCollection } from '../services/cosmosdb.js';

const describeOrSkip = process.env.SKIP_MONGO_TESTS === 'true' ? describe.skip : describe;

describeOrSkip('Admin approvals lifecycle', () => {
  it('marks expired pending approvals as expired when fetched', async () => {
    const approval = await createAdminApprovalRequest({
      actionType: 'announcement_publish',
      endpoint: '/api/admin/announcements/123/approve',
      method: 'POST',
      targetIds: ['announcement-123'],
      payload: { status: 'published' },
      requestedBy: {
        userId: 'requester-1',
        email: 'requester@example.com',
        role: 'editor',
      },
    });

    await getCollection('admin_approval_requests').updateOne(
      { _id: new ObjectId(approval.id) },
      { $set: { expiresAt: new Date(Date.now() - 60_000) } }
    );

    const refreshed = await getAdminApprovalRequest(approval.id);

    expect(refreshed).toBeTruthy();
    expect(refreshed?.status).toBe('expired');
  });

  it('blocks execution validation for expired approvals', async () => {
    const approval = await createAdminApprovalRequest({
      actionType: 'announcement_delete',
      endpoint: '/api/admin/announcements/xyz',
      method: 'DELETE',
      targetIds: ['xyz'],
      payload: {},
      requestedBy: {
        userId: 'requester-2',
        email: 'requester2@example.com',
        role: 'reviewer',
      },
    });

    await getCollection('admin_approval_requests').updateOne(
      { _id: new ObjectId(approval.id) },
      { $set: { expiresAt: new Date(Date.now() - 60_000) } }
    );

    const validation = await validateApprovalForExecution({
      id: approval.id,
      actionType: 'announcement_delete',
      endpoint: '/api/admin/announcements/xyz',
      method: 'DELETE',
      targetIds: ['xyz'],
      payload: {},
    });

    expect(validation.ok).toBe(false);
    expect(validation.reason).toBe('invalid_status:expired');
  });

  it('cleans up old resolved approvals and expires overdue active ones', async () => {
    const staleExecuted = await createAdminApprovalRequest({
      actionType: 'announcement_delete',
      endpoint: '/api/admin/announcements/old-item',
      method: 'DELETE',
      targetIds: ['old-item'],
      payload: {},
      requestedBy: {
        userId: 'requester-3',
        email: 'requester3@example.com',
        role: 'admin',
      },
    });

    const overduePending = await createAdminApprovalRequest({
      actionType: 'announcement_publish',
      endpoint: '/api/admin/announcements/new-item/approve',
      method: 'POST',
      targetIds: ['new-item'],
      payload: { status: 'published' },
      requestedBy: {
        userId: 'requester-4',
        email: 'requester4@example.com',
        role: 'editor',
      },
    });

    await getCollection('admin_approval_requests').updateOne(
      { _id: new ObjectId(staleExecuted.id) },
      {
        $set: {
          status: 'executed',
          requestedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
      }
    );

    await getCollection('admin_approval_requests').updateOne(
      { _id: new ObjectId(overduePending.id) },
      { $set: { expiresAt: new Date(Date.now() - 60_000) } }
    );

    const cleanupResult = await cleanupOldAdminApprovals({ retentionDays: 1 });

    expect(cleanupResult.deletedCount).toBeGreaterThanOrEqual(1);
    expect(cleanupResult.expiredCount).toBeGreaterThanOrEqual(1);

    const staleDoc = await getCollection('admin_approval_requests').findOne({ _id: new ObjectId(staleExecuted.id) });
    expect(staleDoc).toBeNull();

    const pendingDoc = await getAdminApprovalRequest(overduePending.id);
    expect(pendingDoc?.status).toBe('expired');
  });
});
