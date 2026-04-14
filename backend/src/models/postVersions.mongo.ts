import type { Document, WithId } from 'mongodb';

import type { PostRecord, PostVersionRecord } from '../content/types.js';
import { getCollection } from '../services/cosmosdb.js';

interface PostVersionDoc extends Document {
  postId: string;
  version: number;
  note?: string;
  reason?: string;
  actorId?: string;
  snapshot: PostRecord;
  createdAt: Date;
}

export class PostVersionModelMongo {
  private static get collection() {
    return getCollection<PostVersionDoc>('post_versions');
  }

  static async create(entry: {
    postId: string;
    version: number;
    note?: string;
    reason?: string;
    actorId?: string;
    snapshot: PostRecord;
  }) {
    const doc: Omit<PostVersionDoc, '_id'> = {
      postId: entry.postId,
      version: entry.version,
      note: entry.note,
      reason: entry.reason,
      actorId: entry.actorId,
      snapshot: entry.snapshot,
      createdAt: new Date(),
    };

    const result = await this.collection.insertOne(doc as PostVersionDoc);
    const inserted = await this.collection.findOne({ _id: result.insertedId });
    return inserted ? this.docToVersion(inserted) : null;
  }

  static async listByPost(postId: string) {
    const docs = await this.collection
      .find({ postId })
      .sort({ version: -1, createdAt: -1 })
      .toArray();
    return docs.map((doc) => this.docToVersion(doc));
  }

  private static docToVersion(doc: WithId<PostVersionDoc>): PostVersionRecord {
    return {
      id: doc._id.toString(),
      postId: doc.postId,
      version: doc.version,
      note: doc.note,
      reason: doc.reason,
      actorId: doc.actorId,
      snapshot: doc.snapshot,
      createdAt: doc.createdAt.toISOString(),
    };
  }
}

export default PostVersionModelMongo;
