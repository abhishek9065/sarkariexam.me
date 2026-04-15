import type { Collection, Document, Filter, WithId } from 'mongodb';

import type { ContentPageRecord } from '../content/types.js';
import { getCollection } from '../services/cosmosdb.js';
import { slugify } from '../utils/slugify.js';

interface ContentPageDoc extends Document {
  slug: string;
  pageType: ContentPageRecord['pageType'];
  title: string;
  eyebrow?: string;
  description?: string;
  headerColor?: string;
  layoutVariant?: string;
  payload: Record<string, unknown>;
  status: ContentPageRecord['status'];
  seoTitle?: string;
  seoDescription?: string;
  seoCanonicalPath?: string;
  seoIndexable?: boolean;
  publishedAt?: Date | null;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

function isPayload(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toRecord(doc: WithId<ContentPageDoc>): ContentPageRecord {
  return {
    id: doc._id.toString(),
    slug: doc.slug,
    pageType: doc.pageType,
    title: doc.title,
    eyebrow: doc.eyebrow,
    description: doc.description,
    headerColor: doc.headerColor,
    layoutVariant: doc.layoutVariant,
    payload: isPayload(doc.payload) ? doc.payload : {},
    status: doc.status,
    seoTitle: doc.seoTitle,
    seoDescription: doc.seoDescription,
    seoCanonicalPath: doc.seoCanonicalPath,
    seoIndexable: doc.seoIndexable,
    publishedAt: doc.publishedAt?.toISOString(),
    expiresAt: doc.expiresAt?.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    createdBy: doc.createdBy,
    updatedBy: doc.updatedBy,
  };
}

export class ContentPageModelMongo {
  private static get collection(): Collection<ContentPageDoc> {
    return getCollection<ContentPageDoc>('content_pages');
  }

  static async findPublicBySlug(slug: string): Promise<ContentPageRecord | null> {
    const normalized = slugify(slug);
    const now = new Date();
    const query: Filter<ContentPageDoc> = {
      slug: normalized,
      status: 'published',
      $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }],
    };

    const doc = await this.collection.findOne(query);
    return doc ? toRecord(doc) : null;
  }

  static async listPublicByType(type: ContentPageRecord['pageType'], limit = 100): Promise<ContentPageRecord[]> {
    const now = new Date();
    const query: Filter<ContentPageDoc> = {
      pageType: type,
      status: 'published',
      $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }],
    };

    const docs = await this.collection
      .find(query)
      .sort({ updatedAt: -1 })
      .limit(limit)
      .toArray();

    return docs.map((doc) => toRecord(doc));
  }
}

export default ContentPageModelMongo;
