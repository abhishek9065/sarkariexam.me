import { getCollection } from './cosmosdb.js';

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
    const { AnnouncementModelMongo } = await import('../models/announcements.mongo.js');
    const announcements = await AnnouncementModelMongo.findAllAdmin({ limit: 10000, includeInactive: true });
    
    const headers = ['id', 'title', 'type', 'category', 'organization', 'status', 'deadline', 'postedAt', 'viewCount'];
    const rows = announcements.map(a => [
      a.id,
      `"${a.title.replace(/"/g, '""')}"`,
      a.type,
      a.category,
      `"${a.organization.replace(/"/g, '""')}"`,
      a.status,
      a.deadline || '',
      a.postedAt.toISOString(),
      a.viewCount,
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
