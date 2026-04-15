import PostModelPostgres from '../models/posts.postgres.js';

import { getCollection } from './cosmosdb.js';

function toLegacyStatus(status: 'draft' | 'in_review' | 'approved' | 'published' | 'archived') {
  if (status === 'in_review') return 'pending';
  if (status === 'approved') return 'scheduled';
  return status;
}

export async function createBackupMetadata(collections: string[], initiatedBy: string) {
  try {
    const { getCollection } = await import('./cosmosdb.js');
    const col = getCollection('backups');
    
    const backup = {
      id: `backup_${Date.now()}`,
      collections,
      initiatedBy,
      status: 'pending',
      createdAt: new Date(),
      completedAt: null,
      fileSize: 0,
      downloadUrl: null,
    };
    
    await col.insertOne(backup as any);
    return backup;
  } catch {
    return null;
  }
}

export async function getBackups(limit = 20) {
  try {
    const { getCollection } = await import('./cosmosdb.js');
    const col = getCollection('backups');
    return await col.find({}).sort({ createdAt: -1 }).limit(limit).toArray();
  } catch {
    return [];
  }
}

export async function exportCollectionToJSON(collectionName: string) {
  try {
    const col = getCollection(collectionName);
    const docs = await col.find({}).limit(10000).toArray();
    return JSON.stringify(docs, null, 2);
  } catch {
    return null;
  }
}

export async function exportAnnouncementsToCSV(): Promise<string> {
  try {
    const posts = await PostModelPostgres.findAdmin({
      limit: 10000,
      status: 'all',
      sort: 'updated',
    });
    
    const headers = ['id', 'title', 'type', 'category', 'organization', 'status', 'deadline', 'postedAt', 'viewCount'];
    const rows = posts.data.map((post) => [
      post.id,
      `"${post.title.replace(/"/g, '""')}"`,
      post.type,
      post.categories[0]?.name || 'General',
      `"${(post.organization?.name || 'Government of India').replace(/"/g, '""')}"`,
      toLegacyStatus(post.status),
      post.lastDate || post.expiresAt || '',
      new Date(post.publishedAt || post.createdAt).toISOString(),
      post.home.trendingScore || 0,
    ]);
    
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  } catch {
    return '';
  }
}

export const backupService = {
  createBackupMetadata,
  getBackups,
  exportCollectionToJSON,
  exportAnnouncementsToCSV,
};

export default backupService;
