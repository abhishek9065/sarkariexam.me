import { randomUUID } from 'crypto';

import { prismaApp } from '../services/postgres/prisma.js';

import type { NotificationCampaignStatus } from './notificationCampaigns.postgres.js';

export type CampaignJobType = 'send' | 'retry';

export interface CampaignJobRecord {
  id: string;
  campaignId: string;
  jobType: CampaignJobType;
  attempts: number;
  maxAttempts: number;
  lockedBy: string;
}

interface CampaignJobRow {
  id: string;
  campaignId: string;
  jobType: string;
  attempts: number;
  maxAttempts: number;
  lockedBy: string;
}

function toRecord(row: CampaignJobRow): CampaignJobRecord {
  return {
    ...row,
    jobType: row.jobType === 'retry' ? 'retry' : 'send',
  };
}

export class CampaignJobModelPostgres {
  static async enqueue(
    campaignId: string,
    jobType: CampaignJobType,
    expectedStatus: NotificationCampaignStatus,
  ): Promise<boolean> {
    return prismaApp.$transaction(async (tx) => {
      const claimed = await tx.notificationCampaignEntry.updateMany({
        where: { id: campaignId, status: expectedStatus },
        data: { status: 'sending' },
      });
      if (claimed.count === 0) return false;

      await tx.campaignJobEntry.create({
        data: {
          id: randomUUID(),
          campaignId,
          jobType,
          status: 'queued',
        },
      });
      return true;
    });
  }

  static async claimNext(workerId: string, staleBefore: Date): Promise<CampaignJobRecord | null> {
    const rows = await prismaApp.$queryRaw<CampaignJobRow[]>`
      WITH candidate AS (
        SELECT "id"
        FROM "app_campaign_jobs"
        WHERE "attempts" < "max_attempts"
          AND (
            ("status" = 'queued' AND "available_at" <= NOW())
            OR ("status" = 'processing' AND "locked_at" < ${staleBefore})
          )
        ORDER BY "available_at" ASC, "created_at" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE "app_campaign_jobs" AS job
      SET
        "status" = 'processing',
        "attempts" = job."attempts" + 1,
        "locked_at" = NOW(),
        "locked_by" = ${workerId},
        "updated_at" = NOW()
      FROM candidate
      WHERE job."id" = candidate."id"
      RETURNING
        job."id",
        job."campaign_id" AS "campaignId",
        job."job_type" AS "jobType",
        job."attempts",
        job."max_attempts" AS "maxAttempts",
        job."locked_by" AS "lockedBy"
    `;

    return rows[0] ? toRecord(rows[0]) : null;
  }

  static async failExhausted(staleBefore: Date): Promise<string[]> {
    const rows = await prismaApp.$queryRaw<Array<{ campaignId: string }>>`
      UPDATE "app_campaign_jobs"
      SET
        "status" = 'failed',
        "locked_at" = NULL,
        "locked_by" = NULL,
        "last_error" = 'Worker lease expired and maximum attempts were exhausted',
        "updated_at" = NOW()
      WHERE "status" = 'processing'
        AND "locked_at" < ${staleBefore}
        AND "attempts" >= "max_attempts"
      RETURNING "campaign_id" AS "campaignId"
    `;
    return rows.map((row) => row.campaignId);
  }

  static async heartbeat(id: string, workerId: string): Promise<boolean> {
    const updated = await prismaApp.campaignJobEntry.updateMany({
      where: { id, status: 'processing', lockedBy: workerId },
      data: { lockedAt: new Date() },
    });
    return updated.count > 0;
  }

  static async markCompleted(id: string, workerId: string): Promise<boolean> {
    const updated = await prismaApp.campaignJobEntry.updateMany({
      where: { id, status: 'processing', lockedBy: workerId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        lockedAt: null,
        lockedBy: null,
        lastError: null,
      },
    });
    return updated.count > 0;
  }

  static async markFailed(id: string, workerId: string, error: string): Promise<boolean> {
    const updated = await prismaApp.campaignJobEntry.updateMany({
      where: { id, status: 'processing', lockedBy: workerId },
      data: {
        status: 'failed',
        lockedAt: null,
        lockedBy: null,
        lastError: error.slice(0, 2000),
      },
    });
    return updated.count > 0;
  }
}

export default CampaignJobModelPostgres;
