import { randomBytes } from 'crypto';

import type { Collection, Document, Filter, WithId } from 'mongodb';
import { ObjectId } from 'mongodb';

import type {
  AlertSubscriptionRecord,
  PostRecord,
  PostType,
} from '../content/types.js';
import { getCollection } from '../services/cosmosdb.js';
import { slugify } from '../utils/slugify.js';

interface AlertSubscriptionDoc extends Document {
  email: string;
  verified: boolean;
  isActive: boolean;
  frequency: 'instant' | 'daily' | 'weekly';
  categorySlugs: string[];
  categoryNames: string[];
  stateSlugs: string[];
  stateNames: string[];
  organizationSlugs: string[];
  organizationNames: string[];
  qualificationSlugs: string[];
  qualificationNames: string[];
  postTypes: PostType[];
  verificationToken?: string;
  unsubscribeToken: string;
  source?: string;
  alertCount?: number;
  lastAlertedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface AlertSubscriptionCreateInput {
  email: string;
  categories?: string[];
  states?: string[];
  organizations?: string[];
  qualifications?: string[];
  postTypes?: PostType[];
  frequency?: 'instant' | 'daily' | 'weekly';
  source?: string;
  verified?: boolean;
}

function normalizeTokens(values: string[] = []) {
  const entries = values
    .map((value) => value.trim())
    .filter(Boolean)
    .map((name) => ({ name, slug: slugify(name) }))
    .filter((entry) => entry.slug);

  const bySlug = new Map<string, { name: string; slug: string }>();
  for (const entry of entries) {
    bySlug.set(entry.slug, entry);
  }
  return Array.from(bySlug.values());
}

function docToRecord(doc: WithId<AlertSubscriptionDoc>): AlertSubscriptionRecord {
  return {
    id: doc._id.toString(),
    email: doc.email,
    verified: doc.verified,
    isActive: doc.isActive,
    frequency: doc.frequency,
    categorySlugs: doc.categorySlugs || [],
    categoryNames: doc.categoryNames || [],
    stateSlugs: doc.stateSlugs || [],
    stateNames: doc.stateNames || [],
    organizationSlugs: doc.organizationSlugs || [],
    organizationNames: doc.organizationNames || [],
    qualificationSlugs: doc.qualificationSlugs || [],
    qualificationNames: doc.qualificationNames || [],
    postTypes: doc.postTypes || [],
    verificationToken: doc.verificationToken,
    unsubscribeToken: doc.unsubscribeToken,
    source: doc.source,
    alertCount: doc.alertCount || 0,
    lastAlertedAt: doc.lastAlertedAt?.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function buildPostMatchFilter(post: PostRecord): Filter<AlertSubscriptionDoc> {
  const clauses: Filter<AlertSubscriptionDoc>[] = [];
  const categorySlugs = post.categories.map((item) => item.slug).filter(Boolean);
  const stateSlugs = post.states.map((item) => item.slug).filter(Boolean);
  const organizationSlug = post.organization?.slug;
  const qualificationSlugs = post.qualifications.map((item) => item.slug).filter(Boolean);

  clauses.push({
    $or: [
      { categorySlugs: { $size: 0 } as any },
      { categorySlugs: { $exists: false } },
      { categorySlugs: { $in: categorySlugs } },
    ],
  });
  clauses.push({
    $or: [
      { stateSlugs: { $size: 0 } as any },
      { stateSlugs: { $exists: false } },
      { stateSlugs: { $in: stateSlugs } },
    ],
  });
  clauses.push({
    $or: [
      { organizationSlugs: { $size: 0 } as any },
      { organizationSlugs: { $exists: false } },
      ...(organizationSlug ? [{ organizationSlugs: organizationSlug }] : []),
    ],
  });
  clauses.push({
    $or: [
      { qualificationSlugs: { $size: 0 } as any },
      { qualificationSlugs: { $exists: false } },
      { qualificationSlugs: { $in: qualificationSlugs } },
    ],
  });
  clauses.push({
    $or: [
      { postTypes: { $size: 0 } as any },
      { postTypes: { $exists: false } },
      { postTypes: post.type },
    ],
  });

  return {
    isActive: true,
    verified: true,
    $and: clauses,
  };
}

export class AlertSubscriptionModelMongo {
  private static get collection(): Collection<AlertSubscriptionDoc> {
    return getCollection<AlertSubscriptionDoc>('alert_subscriptions');
  }

  static async upsert(input: AlertSubscriptionCreateInput) {
    const email = input.email.trim().toLowerCase();
    const categories = normalizeTokens(input.categories);
    const states = normalizeTokens(input.states);
    const organizations = normalizeTokens(input.organizations);
    const qualifications = normalizeTokens(input.qualifications);
    const now = new Date();
    const existing = await this.collection.findOne({ email });
    const verified = input.verified ?? existing?.verified ?? false;
    const verificationToken = verified ? undefined : existing?.verificationToken || randomBytes(24).toString('hex');
    const unsubscribeToken = existing?.unsubscribeToken || randomBytes(24).toString('hex');

    const update: Partial<AlertSubscriptionDoc> = {
      email,
      verified,
      isActive: true,
      frequency: input.frequency ?? existing?.frequency ?? 'daily',
      categorySlugs: categories.map((item) => item.slug),
      categoryNames: categories.map((item) => item.name),
      stateSlugs: states.map((item) => item.slug),
      stateNames: states.map((item) => item.name),
      organizationSlugs: organizations.map((item) => item.slug),
      organizationNames: organizations.map((item) => item.name),
      qualificationSlugs: qualifications.map((item) => item.slug),
      qualificationNames: qualifications.map((item) => item.name),
      postTypes: Array.from(new Set(input.postTypes || existing?.postTypes || [])),
      verificationToken,
      unsubscribeToken,
      source: input.source || existing?.source,
      updatedAt: now,
    };

    if (existing) {
      await this.collection.updateOne({ _id: existing._id }, { $set: update });
      const doc = await this.collection.findOne({ _id: existing._id });
      return doc ? docToRecord(doc) : null;
    }

    const result = await this.collection.insertOne({
      ...update,
      verified,
      isActive: true,
      frequency: update.frequency || 'daily',
      categorySlugs: update.categorySlugs || [],
      categoryNames: update.categoryNames || [],
      stateSlugs: update.stateSlugs || [],
      stateNames: update.stateNames || [],
      organizationSlugs: update.organizationSlugs || [],
      organizationNames: update.organizationNames || [],
      qualificationSlugs: update.qualificationSlugs || [],
      qualificationNames: update.qualificationNames || [],
      postTypes: update.postTypes || [],
      unsubscribeToken,
      createdAt: now,
      updatedAt: now,
      alertCount: 0,
      lastAlertedAt: null,
    } as AlertSubscriptionDoc);
    const doc = await this.collection.findOne({ _id: result.insertedId });
    return doc ? docToRecord(doc) : null;
  }

  static async verifyByToken(token: string) {
    const result = await this.collection.findOneAndUpdate(
      { verificationToken: token, isActive: true },
      { $set: { verified: true, updatedAt: new Date() }, $unset: { verificationToken: '' } },
      { returnDocument: 'after' },
    );
    return result ? docToRecord(result as WithId<AlertSubscriptionDoc>) : null;
  }

  static async unsubscribeByToken(token: string) {
    const result = await this.collection.findOneAndUpdate(
      { unsubscribeToken: token },
      { $set: { isActive: false, updatedAt: new Date() } },
      { returnDocument: 'after' },
    );
    return result ? docToRecord(result as WithId<AlertSubscriptionDoc>) : null;
  }

  static async listAdmin(filters: {
    search?: string;
    status?: 'all' | 'active' | 'inactive';
    frequency?: 'all' | 'instant' | 'daily' | 'weekly';
    limit?: number;
    offset?: number;
  }) {
    const query: Filter<AlertSubscriptionDoc> = {};
    if (filters.search?.trim()) {
      const safe = filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.email = { $regex: safe, $options: 'i' };
    }
    if (filters.status === 'active') query.isActive = true;
    if (filters.status === 'inactive') query.isActive = false;
    if (filters.frequency && filters.frequency !== 'all') query.frequency = filters.frequency;

    const limit = filters.limit ?? 20;
    const offset = filters.offset ?? 0;
    const [docs, total] = await Promise.all([
      this.collection.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).toArray(),
      this.collection.countDocuments(query),
    ]);
    const data = docs.map((doc) => docToRecord(doc));
    return { data, total, count: data.length };
  }

  static async getStats() {
    const [total, verified, active, byFrequency] = await Promise.all([
      this.collection.countDocuments({}),
      this.collection.countDocuments({ verified: true }),
      this.collection.countDocuments({ isActive: true }),
      this.collection.aggregate([{ $group: { _id: '$frequency', count: { $sum: 1 } } }]).toArray(),
    ]);

    return {
      total,
      verified,
      unverified: total - verified,
      active,
      inactive: total - active,
      byFrequency,
    };
  }

  static async deleteById(id: string) {
    if (!ObjectId.isValid(id)) return false;
    const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  static async listMatchingPost(post: PostRecord, frequency?: 'instant' | 'daily' | 'weekly') {
    const query = buildPostMatchFilter(post);
    if (frequency) {
      query.frequency = frequency;
    }
    const docs = await this.collection.find(query).toArray();
    return docs.map((doc) => docToRecord(doc));
  }

  static async listByEmails(emails: string[]) {
    if (emails.length === 0) return [];
    const normalized = Array.from(new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean)));
    const docs = await this.collection.find({ email: { $in: normalized }, isActive: true, verified: true }).toArray();
    return docs.map((doc) => docToRecord(doc));
  }

  static async markAlerted(ids: string[]) {
    const objectIds = ids.filter(ObjectId.isValid).map((id) => new ObjectId(id));
    if (objectIds.length === 0) return;
    await this.collection.updateMany(
      { _id: { $in: objectIds } },
      { $inc: { alertCount: 1 }, $set: { lastAlertedAt: new Date(), updatedAt: new Date() } },
    );
  }
}

export default AlertSubscriptionModelMongo;
