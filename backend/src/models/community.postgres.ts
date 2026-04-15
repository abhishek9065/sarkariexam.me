import { randomUUID } from 'crypto';

import { Prisma } from '@prisma/client';

import { ensureCommunityTables } from '../services/postgres/legacyTables.js';
import { prisma } from '../services/postgres/prisma.js';

export type CommunityEntityType = 'forum' | 'qa' | 'group';
export type CommunityFlagStatus = 'open' | 'reviewed' | 'resolved';

interface ForumRow {
  id: string;
  title: string;
  content: string;
  category: string;
  author: string;
  created_at: Date;
  updated_at: Date;
}

interface QaRow {
  id: string;
  question: string;
  answer: string | null;
  answered_by: string | null;
  author: string;
  created_at: Date;
  updated_at: Date;
}

interface GroupRow {
  id: string;
  name: string;
  topic: string;
  language: string;
  link: string | null;
  created_at: Date;
  updated_at: Date;
}

interface FlagRow {
  id: string;
  entity_type: string;
  entity_id: string;
  reason: string;
  reporter: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface ForumRecord {
  id: string;
  title: string;
  content: string;
  category: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QaRecord {
  id: string;
  question: string;
  answer?: string | null;
  answeredBy?: string | null;
  author: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupRecord {
  id: string;
  name: string;
  topic: string;
  language: string;
  link?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FlagRecord {
  id: string;
  entityType: CommunityEntityType;
  entityId: string;
  reason: string;
  reporter?: string | null;
  status: CommunityFlagStatus;
  createdAt: Date;
  updatedAt: Date;
}

function toForumRecord(row: ForumRow): ForumRecord {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    category: row.category,
    author: row.author,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toQaRecord(row: QaRow): QaRecord {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    answeredBy: row.answered_by,
    author: row.author,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toGroupRecord(row: GroupRow): GroupRecord {
  return {
    id: row.id,
    name: row.name,
    topic: row.topic,
    language: row.language,
    link: row.link,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toFlagStatus(value: string): CommunityFlagStatus {
  if (value === 'reviewed' || value === 'resolved') return value;
  return 'open';
}

function toFlagRecord(row: FlagRow): FlagRecord {
  return {
    id: row.id,
    entityType: row.entity_type as CommunityEntityType,
    entityId: row.entity_id,
    reason: row.reason,
    reporter: row.reporter,
    status: toFlagStatus(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class CommunityModelPostgres {
  static async listForums(limit = 20, offset = 0): Promise<{ data: ForumRecord[]; total: number; count: number }> {
    await ensureCommunityTables();

    const [rows, totalRows] = await Promise.all([
      prisma.$queryRaw<ForumRow[]>(Prisma.sql`
        SELECT id, title, content, category, author, created_at, updated_at
        FROM app_community_forums
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `),
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count
        FROM app_community_forums
      `,
    ]);

    const data = rows.map((row) => toForumRecord(row));
    return { data, total: Number(totalRows[0]?.count || 0), count: data.length };
  }

  static async createForum(input: {
    title: string;
    content: string;
    category: string;
    author: string;
  }): Promise<ForumRecord | null> {
    await ensureCommunityTables();

    const rows = await prisma.$queryRaw<ForumRow[]>`
      INSERT INTO app_community_forums (
        id,
        title,
        content,
        category,
        author,
        created_at,
        updated_at
      ) VALUES (
        ${randomUUID()},
        ${input.title},
        ${input.content},
        ${input.category},
        ${input.author},
        NOW(),
        NOW()
      )
      RETURNING id, title, content, category, author, created_at, updated_at
    `;
    return rows[0] ? toForumRecord(rows[0]) : null;
  }

  static async deleteForum(id: string): Promise<boolean> {
    await ensureCommunityTables();
    const deleted = await prisma.$executeRaw`
      DELETE FROM app_community_forums
      WHERE id = ${id}
    `;
    return Number(deleted) > 0;
  }

  static async listQa(limit = 20, offset = 0): Promise<{ data: QaRecord[]; total: number; count: number }> {
    await ensureCommunityTables();

    const [rows, totalRows] = await Promise.all([
      prisma.$queryRaw<QaRow[]>(Prisma.sql`
        SELECT id, question, answer, answered_by, author, created_at, updated_at
        FROM app_community_qa
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `),
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count
        FROM app_community_qa
      `,
    ]);

    const data = rows.map((row) => toQaRecord(row));
    return { data, total: Number(totalRows[0]?.count || 0), count: data.length };
  }

  static async createQa(input: {
    question: string;
    author: string;
  }): Promise<QaRecord | null> {
    await ensureCommunityTables();

    const rows = await prisma.$queryRaw<QaRow[]>`
      INSERT INTO app_community_qa (
        id,
        question,
        answer,
        answered_by,
        author,
        created_at,
        updated_at
      ) VALUES (
        ${randomUUID()},
        ${input.question},
        ${null},
        ${null},
        ${input.author},
        NOW(),
        NOW()
      )
      RETURNING id, question, answer, answered_by, author, created_at, updated_at
    `;
    return rows[0] ? toQaRecord(rows[0]) : null;
  }

  static async answerQa(id: string, answer: string, answeredBy: string): Promise<QaRecord | null> {
    await ensureCommunityTables();

    const rows = await prisma.$queryRaw<QaRow[]>`
      UPDATE app_community_qa
      SET answer = ${answer},
          answered_by = ${answeredBy},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, question, answer, answered_by, author, created_at, updated_at
    `;
    return rows[0] ? toQaRecord(rows[0]) : null;
  }

  static async deleteQa(id: string): Promise<boolean> {
    await ensureCommunityTables();
    const deleted = await prisma.$executeRaw`
      DELETE FROM app_community_qa
      WHERE id = ${id}
    `;
    return Number(deleted) > 0;
  }

  static async listGroups(limit = 20, offset = 0): Promise<{ data: GroupRecord[]; total: number; count: number }> {
    await ensureCommunityTables();

    const [rows, totalRows] = await Promise.all([
      prisma.$queryRaw<GroupRow[]>(Prisma.sql`
        SELECT id, name, topic, language, link, created_at, updated_at
        FROM app_community_groups
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `),
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count
        FROM app_community_groups
      `,
    ]);

    const data = rows.map((row) => toGroupRecord(row));
    return { data, total: Number(totalRows[0]?.count || 0), count: data.length };
  }

  static async createGroup(input: {
    name: string;
    topic: string;
    language: string;
    link?: string | null;
  }): Promise<GroupRecord | null> {
    await ensureCommunityTables();

    const rows = await prisma.$queryRaw<GroupRow[]>`
      INSERT INTO app_community_groups (
        id,
        name,
        topic,
        language,
        link,
        created_at,
        updated_at
      ) VALUES (
        ${randomUUID()},
        ${input.name},
        ${input.topic},
        ${input.language},
        ${input.link ?? null},
        NOW(),
        NOW()
      )
      RETURNING id, name, topic, language, link, created_at, updated_at
    `;
    return rows[0] ? toGroupRecord(rows[0]) : null;
  }

  static async deleteGroup(id: string): Promise<boolean> {
    await ensureCommunityTables();
    const deleted = await prisma.$executeRaw`
      DELETE FROM app_community_groups
      WHERE id = ${id}
    `;
    return Number(deleted) > 0;
  }

  static async createFlag(input: {
    entityType: CommunityEntityType;
    entityId: string;
    reason: string;
    reporter?: string;
  }): Promise<FlagRecord | null> {
    await ensureCommunityTables();

    const rows = await prisma.$queryRaw<FlagRow[]>`
      INSERT INTO app_community_flags (
        id,
        entity_type,
        entity_id,
        reason,
        reporter,
        status,
        created_at,
        updated_at
      ) VALUES (
        ${randomUUID()},
        ${input.entityType},
        ${input.entityId},
        ${input.reason},
        ${input.reporter ?? null},
        ${'open'},
        NOW(),
        NOW()
      )
      RETURNING id, entity_type, entity_id, reason, reporter, status, created_at, updated_at
    `;
    return rows[0] ? toFlagRecord(rows[0]) : null;
  }

  static async listFlags(
    limit = 20,
    offset = 0,
    status?: CommunityFlagStatus,
  ): Promise<{ data: FlagRecord[]; total: number; count: number }> {
    await ensureCommunityTables();

    const whereClause = status ? Prisma.sql`WHERE status = ${status}` : Prisma.empty;

    const [rows, totalRows] = await Promise.all([
      prisma.$queryRaw<FlagRow[]>(Prisma.sql`
        SELECT id, entity_type, entity_id, reason, reporter, status, created_at, updated_at
        FROM app_community_flags
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `),
      prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM app_community_flags
        ${whereClause}
      `),
    ]);

    const data = rows.map((row) => toFlagRecord(row));
    return { data, total: Number(totalRows[0]?.count || 0), count: data.length };
  }

  static async updateFlagStatus(id: string, status: Exclude<CommunityFlagStatus, 'open'>): Promise<boolean> {
    await ensureCommunityTables();
    const updated = await prisma.$executeRaw`
      UPDATE app_community_flags
      SET status = ${status},
          updated_at = NOW()
      WHERE id = ${id}
    `;
    return Number(updated) > 0;
  }
}

export default CommunityModelPostgres;