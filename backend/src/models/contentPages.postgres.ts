import {
  ContentPageType as PrismaContentPageType,
  WorkflowStatus as PrismaWorkflowStatus,
} from '@prisma/client';

import type { ContentPageRecord } from '../content/types.js';
import { prisma } from '../services/postgres/prisma.js';
import { slugify } from '../utils/slugify.js';

function mapPageType(type: PrismaContentPageType): ContentPageRecord['pageType'] {
  if (type === PrismaContentPageType.AUXILIARY) return 'auxiliary';
  if (type === PrismaContentPageType.INFO) return 'info';
  if (type === PrismaContentPageType.COMMUNITY) return 'community';
  if (type === PrismaContentPageType.CATEGORY_META) return 'category_meta';
  if (type === PrismaContentPageType.RESOURCE_META) return 'resource_meta';
  return 'state_directory';
}

function mapStatus(status: PrismaWorkflowStatus): ContentPageRecord['status'] {
  if (status === PrismaWorkflowStatus.DRAFT) return 'draft';
  if (status === PrismaWorkflowStatus.IN_REVIEW) return 'in_review';
  if (status === PrismaWorkflowStatus.APPROVED) return 'approved';
  if (status === PrismaWorkflowStatus.PUBLISHED) return 'published';
  return 'archived';
}

function mapTypeToPrisma(type: ContentPageRecord['pageType']): PrismaContentPageType {
  if (type === 'auxiliary') return PrismaContentPageType.AUXILIARY;
  if (type === 'info') return PrismaContentPageType.INFO;
  if (type === 'community') return PrismaContentPageType.COMMUNITY;
  if (type === 'category_meta') return PrismaContentPageType.CATEGORY_META;
  if (type === 'resource_meta') return PrismaContentPageType.RESOURCE_META;
  return PrismaContentPageType.STATE_DIRECTORY;
}

function isPayload(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toRecord(row: {
  id: string;
  slug: string;
  pageType: PrismaContentPageType;
  title: string;
  eyebrow: string | null;
  description: string | null;
  headerColor: string | null;
  layoutVariant: string | null;
  payload: unknown;
  status: PrismaWorkflowStatus;
  seoTitle: string | null;
  seoDescription: string | null;
  seoCanonicalPath: string | null;
  seoIndexable: boolean;
  publishedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
}): ContentPageRecord {
  return {
    id: row.id,
    slug: row.slug,
    pageType: mapPageType(row.pageType),
    title: row.title,
    eyebrow: row.eyebrow || undefined,
    description: row.description || undefined,
    headerColor: row.headerColor || undefined,
    layoutVariant: row.layoutVariant || undefined,
    payload: isPayload(row.payload) ? row.payload : {},
    status: mapStatus(row.status),
    seoTitle: row.seoTitle || undefined,
    seoDescription: row.seoDescription || undefined,
    seoCanonicalPath: row.seoCanonicalPath || undefined,
    seoIndexable: row.seoIndexable,
    publishedAt: row.publishedAt?.toISOString(),
    expiresAt: row.expiresAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdBy: row.createdBy || undefined,
    updatedBy: row.updatedBy || undefined,
  };
}

export class ContentPageModelPostgres {
  static async findPublicBySlug(slug: string): Promise<ContentPageRecord | null> {
    const normalized = slugify(slug);
    const now = new Date();

    const row = await prisma.contentPage.findFirst({
      where: {
        slug: normalized,
        status: PrismaWorkflowStatus.PUBLISHED,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });

    return row ? toRecord(row) : null;
  }

  static async listPublicByType(type: ContentPageRecord['pageType'], limit = 100): Promise<ContentPageRecord[]> {
    const now = new Date();
    const rows = await prisma.contentPage.findMany({
      where: {
        pageType: mapTypeToPrisma(type),
        status: PrismaWorkflowStatus.PUBLISHED,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    return rows.map((row) => toRecord(row));
  }
}

export default ContentPageModelPostgres;
