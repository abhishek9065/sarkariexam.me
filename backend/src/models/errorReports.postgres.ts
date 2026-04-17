import { randomUUID } from 'crypto';

import { prismaApp } from '../services/postgres/prisma.js';

export type ErrorReportStatus = 'new' | 'triaged' | 'resolved';

interface ErrorReportRow {
  id: string;
  errorId: string;
  message: string;
  pageUrl: string | null;
  userAgent: string | null;
  note: string | null;
  stack: string | null;
  componentStack: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  userId: string | null;
  userEmail: string | null;
  status: string;
  reviewNote: string | null;
  assigneeEmail: string | null;
  release: string | null;
  requestId: string | null;
  sentryEventUrl: string | null;
  resolvedAt: Date | null;
  resolvedBy: string | null;
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
    errorId: row.errorId,
    message: row.message,
    pageUrl: row.pageUrl,
    userAgent: row.userAgent,
    note: row.note,
    stack: row.stack,
    componentStack: row.componentStack,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    userId: row.userId,
    userEmail: row.userEmail,
    status: toStatus(row.status),
    reviewNote: row.reviewNote,
    assigneeEmail: row.assigneeEmail,
    release: row.release,
    requestId: row.requestId,
    sentryEventUrl: row.sentryEventUrl,
    resolvedAt: row.resolvedAt,
    resolvedBy: row.resolvedBy,
  };
}

export class ErrorReportModelPostgres {
  static async create(input: Omit<ErrorReportRecord, 'id' | 'updatedAt' | 'resolvedAt' | 'resolvedBy'>): Promise<{ id: string }> {
    const id = randomUUID();
    await prismaApp.errorReportEntry.create({
      data: {
        id,
        errorId: input.errorId,
        message: input.message,
        pageUrl: input.pageUrl ?? null,
        userAgent: input.userAgent ?? null,
        note: input.note ?? null,
        stack: input.stack ?? null,
        componentStack: input.componentStack ?? null,
        createdAt: input.createdAt,
        updatedAt: null,
        userId: input.userId ?? null,
        userEmail: input.userEmail ?? null,
        status: input.status,
        reviewNote: input.reviewNote ?? null,
        assigneeEmail: input.assigneeEmail ?? null,
        release: input.release ?? null,
        requestId: input.requestId ?? null,
        sentryEventUrl: input.sentryEventUrl ?? null,
        resolvedAt: null,
        resolvedBy: null,
      },
    });

    return { id };
  }

  static async list(
    limit = 20,
    offset = 0,
    status?: ErrorReportStatus,
  ): Promise<{ data: ErrorReportRecord[]; total: number; count: number }> {
    const where = status ? { status } : undefined;

    const [rows, totalRows] = await Promise.all([
      prismaApp.errorReportEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prismaApp.errorReportEntry.count({ where }),
    ]);

    const data = rows.map((row) => toRecord(row));
    return { data, total: totalRows, count: data.length };
  }

  static async update(
    id: string,
    patch: { status: 'triaged' | 'resolved'; reviewNote?: string; resolvedBy?: string },
  ): Promise<boolean> {
    const data: Record<string, unknown> = {
      status: patch.status,
      updatedAt: new Date(),
    };

    if (patch.reviewNote !== undefined) {
      data.reviewNote = patch.reviewNote || null;
    }

    if (patch.status === 'resolved') {
      data.resolvedAt = new Date();
      data.resolvedBy = patch.resolvedBy || 'admin';
    }

    const updated = await prismaApp.errorReportEntry.updateMany({
      where: { id },
      data,
    });
    return updated.count > 0;
  }
}

export default ErrorReportModelPostgres;
