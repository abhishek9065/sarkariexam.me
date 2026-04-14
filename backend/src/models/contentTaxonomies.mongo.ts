import type { Collection, Document, WithId } from 'mongodb';
import { ObjectId } from 'mongodb';

import type { TaxonomyDocument, TaxonomyRef, TaxonomyType } from '../content/types.js';
import { getCollection } from '../services/cosmosdb.js';
import { slugify } from '../utils/slugify.js';

interface TaxonomyDoc extends Document {
  name: string;
  slug: string;
  description?: string;
  officialWebsite?: string;
  shortName?: string;
  priority?: number;
  type: TaxonomyType;
  createdAt: Date;
  updatedAt: Date;
}

const collectionByType: Record<TaxonomyType, string> = {
  states: 'states',
  organizations: 'organizations',
  categories: 'categories',
  institutions: 'institutions',
  exams: 'exams',
  qualifications: 'qualifications',
};

export class ContentTaxonomyModelMongo {
  private static getCollection(type: TaxonomyType): Collection<TaxonomyDoc> {
    return getCollection<TaxonomyDoc>(collectionByType[type]);
  }

  static async upsert(type: TaxonomyType, ref?: TaxonomyRef | null): Promise<TaxonomyDocument | null> {
    if (!ref?.name?.trim()) return null;
    const name = ref.name.trim();
    const slug = slugify(ref.slug || name);
    const now = new Date();
    const collection = this.getCollection(type);

    await collection.updateOne(
      { slug },
      {
        $set: { name, slug, updatedAt: now, type },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );

    return this.findBySlug(type, slug);
  }

  static async upsertMany(type: TaxonomyType, refs: TaxonomyRef[]): Promise<TaxonomyDocument[]> {
    const results = await Promise.all(refs.map((ref) => this.upsert(type, ref)));
    return results.filter(Boolean) as TaxonomyDocument[];
  }

  static async findBySlug(type: TaxonomyType, slug: string): Promise<TaxonomyDocument | null> {
    const doc = await this.getCollection(type).findOne({ slug });
    return doc ? this.docToTaxonomy(doc) : null;
  }

  static async list(type: TaxonomyType, limit = 100): Promise<TaxonomyDocument[]> {
    const docs = await this.getCollection(type)
      .find({})
      .sort({ priority: -1, name: 1 })
      .limit(limit)
      .toArray();
    return docs.map((doc) => this.docToTaxonomy(doc));
  }

  static async findById(type: TaxonomyType, id: string): Promise<TaxonomyDocument | null> {
    if (!ObjectId.isValid(id)) return null;
    const doc = await this.getCollection(type).findOne({ _id: new ObjectId(id) });
    return doc ? this.docToTaxonomy(doc) : null;
  }

  static async create(type: TaxonomyType, input: Omit<TaxonomyDocument, 'id' | 'type' | 'createdAt' | 'updatedAt'>) {
    const now = new Date();
    const name = input.name.trim();
    const slug = slugify(input.slug || name);
    const collection = this.getCollection(type);
    const existing = await collection.findOne({ slug });
    if (existing) {
      throw new Error(`A ${type.slice(0, -1)} with slug "${slug}" already exists`);
    }

    const result = await collection.insertOne({
      name,
      slug,
      description: input.description?.trim() || undefined,
      officialWebsite: input.officialWebsite?.trim() || undefined,
      shortName: input.shortName?.trim() || undefined,
      priority: input.priority,
      type,
      createdAt: now,
      updatedAt: now,
    } as TaxonomyDoc);
    const created = await collection.findOne({ _id: result.insertedId });
    return created ? this.docToTaxonomy(created) : null;
  }

  static async update(type: TaxonomyType, id: string, input: Omit<TaxonomyDocument, 'id' | 'type' | 'createdAt' | 'updatedAt'>) {
    if (!ObjectId.isValid(id)) return null;
    const collection = this.getCollection(type);
    const existing = await collection.findOne({ _id: new ObjectId(id) });
    if (!existing) return null;

    const name = input.name.trim();
    const slug = slugify(input.slug || name);
    const slugConflict = await collection.findOne({ slug, _id: { $ne: new ObjectId(id) } });
    if (slugConflict) {
      throw new Error(`A ${type.slice(0, -1)} with slug "${slug}" already exists`);
    }

    await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name,
          slug,
          description: input.description?.trim() || undefined,
          officialWebsite: input.officialWebsite?.trim() || undefined,
          shortName: input.shortName?.trim() || undefined,
          priority: input.priority,
          updatedAt: new Date(),
        },
      },
    );

    return this.findById(type, id);
  }

  static async remove(type: TaxonomyType, id: string) {
    if (!ObjectId.isValid(id)) return false;
    const result = await this.getCollection(type).deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  private static docToTaxonomy(doc: WithId<TaxonomyDoc>): TaxonomyDocument {
    return {
      id: doc._id.toString(),
      name: doc.name,
      slug: doc.slug,
      description: doc.description,
      officialWebsite: doc.officialWebsite,
      shortName: doc.shortName,
      priority: doc.priority,
      type: doc.type,
      createdAt: doc.createdAt?.toISOString(),
      updatedAt: doc.updatedAt?.toISOString(),
    };
  }
}

export default ContentTaxonomyModelMongo;
