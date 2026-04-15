import { randomUUID } from 'crypto';

import { Prisma } from '@prisma/client';

import { ensureErrorReportsTable } from '../services/postgres/legacyTables.js';
import { prisma } from '../services/postgres/prisma.js';

export type ErrorReportStatus = 'new' | 'triaged' | 'resolved';

interface ErrorReportRow {
  id: string;
  error_id: string;
  message: string;
  page_url: string | null;
  user_agent: string | null;
  note: string | null;
  stack: string | null;
  component_stack: string | null;
  created_at: Date;
  updated_at: Date | null;
  user_id: string | null;
  user_email: string | null;
  status: string;
  review_note: string | null;
  assignee_email: string | null;
  release: string | null;
  request_id: string | null;
  sentry_event_url: string | null;
  resolved_at: Date | null;
  resolved_by: string | null;
}

export interface ErrorReportRecord {
  id: string;
  errorId: string;
  message: string;
  pageUrl?: string | null;
  userAgent?: string | null;
  note?: string | null;
  stack?: string | null;
  componentStack?: string | null;
  createdAt: Date;
  updatedAt?: Date | null;
  userId?: string | null;
  userEmail?: string | null;
  status: ErrorReportStatus;
  reviewNote?: string | null;
  assigneeEmail?: string | null;
  release?: string | null;
  requestId?: string | null;
  sentryEventUrl?: string | null;
  resolvedAt?: Date | null;
  resolvedBy?: string | null;
}

function toStatus(value: string): ErrorReportStatus {
  if (value === 'triaged' || value === 'resolved') return value;
  return 'new';
}

function toRecord(row: ErrorReportRow): ErrorReportRecord {
  return {
    id: row.id,
    errorId: row.error_id,
    message: row.message,
    pageUrl: row.page_url,
    userAgent: row.user_agent,
    note: row.note,
    stack: row.stack,
    componentStack: row.component_stack,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userId: row.user_id,
    userEmail: row.user_email,
    status: toStatus(row.status),
    reviewNote: row.review_note,
    assigneeEmail: row.assignee_email,
    release: row.release,
    requestId: row.request_id,
    sentryEventUrl: row.sentry_event_url,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
  };
}

export class ErrorReportModelPostgres {
  static async create(input: Omit<ErrorReportRecord, 'id' | 'updatedAt' | 'resolvedAt' | 'resolvedBy'>): Promise<{ id: string }> {
    await ensureErrorReportsTable();

    const id = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO app_error_reports (
        id,
        error_id,
        message,
        page_url,
        user_agent,
        note,
        stack,
        component_stack,
        created_at,
        updated_at,
        user_id,
        user_email,
        status,
        review_note,
        assignee_email,
        release,
        request_id,
        sentry_event_url,
        resolved_at,
        resolved_by
      ) VALUES (
        ${id},
        ${input.errorId},
        ${input.message},
        ${input.pageUrl ?? null},
        ${input.userAgent ?? null},
        ${input.note ?? null},
        ${input.stack ?? null},
        ${input.componentStack ?? null},
        ${input.createdAt},
        ${null},
        ${input.userId ?? null},
        ${input.userEmail ?? null},
        ${input.status},
        ${input.reviewNote ?? null},
        ${input.assigneeEmail ?? null},
        ${input.release ?? null},
        ${input.requestId ?? null},
        ${input.sentryEventUrl ?? null},
        ${null},
        ${null}
      )
    `;

    return { id };
  }

  static async list(
    limit = 20,
    offset = 0,
    status?: ErrorReportStatus,
  ): Promise<{ data: ErrorReportRecord[]; total: number; count: number }> {
    await ensureErrorReportsTable();

    const whereClause = status ? Prisma.sql`WHERE status = ${status}` : Prisma.empty;

    const [rows, totalRows] = await Promise.all([
      prisma.$queryRaw<ErrorReportRow[]>(Prisma.sql`
        SELECT
          id,
          error_id,
          message,
          page_url,
          user_agent,
          note,
          stack,
          component_stack,
          created_at,
          updated_at,
          user_id,
          user_email,
          status,
          review_note,
          assignee_email,
          release,
          request_id,
          sentry_event_url,
          resolved_at,
          resolved_by
        FROM app_error_reports
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `),
      prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM app_error_reports
        ${whereClause}
      `),
    ]);

    const data = rows.map((row) => toRecord(row));
    return { data, total: Number(totalRows[0]?.count || 0), count: data.length };
  }

  static async update(
    id: string,
    patch: { status: 'triaged' | 'resolved'; reviewNote?: string; resolvedBy?: string },
  ): Promise<boolean> {
    await ensureErrorReportsTable();

    const setClauses: Prisma.Sql[] = [
      Prisma.sql`status = ${patch.status}`,
      Prisma.sql`updated_at = NOW()`,
    ];

    if (patch.reviewNote !== undefined) {
      setClauses.push(Prisma.sql`review_note = ${patch.reviewNote || null}`);
    }

    if (patch.status === 'resolved') {
      setClauses.push(Prisma.sql`resolved_at = NOW()`);
      setClauses.push(Prisma.sql`resolved_by = ${patch.resolvedBy || 'admin'}`);
    }

    const updated = await prisma.$executeRaw(
      Prisma.sql`UPDATE app_error_reports SET ${Prisma.join(setClauses, ', ')} WHERE id = ${id}`,
    );
    return Number(updated) > 0;
  }
}

export default ErrorReportModelPostgres;