import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

import PostModelPostgres from '../models/posts.postgres.js';

const backupStorageDir = process.env.DATA_BACKUP_DIR?.trim()
  ? path.resolve(process.env.DATA_BACKUP_DIR.trim())
  : path.resolve(process.cwd(), '.data', 'backups');

const manifestPath = process.env.DATA_BACKUP_MANIFEST?.trim()
  ? path.resolve(process.env.DATA_BACKUP_MANIFEST.trim())
  : path.join(backupStorageDir, 'manifest.json');

const MAX_BACKUP_RECORDS = 500;

const normalizeCollections = (collections: any[]) =>
  Array.from(new Set((collections || []).map((entry) => String(entry || '').trim()).filter(Boolean)));

const parseBackupStatus = (value: unknown) => {
  if (value === 'completed' || value === 'failed' || value === 'pending') {
    return value;
  }
  return 'pending';
};

const parseBackupRecord = (raw: unknown) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const value = raw as Record<string, unknown>;
  if (typeof value.id !== 'string' || !value.id.trim()) return null;
  if (typeof value.createdAt !== 'string' || !value.createdAt.trim()) return null;

  return {
    id: value.id,
    kind: 'postgres_dump',
    source: 'postgres',
    status: parseBackupStatus(value.status),
    collections: normalizeCollections(Array.isArray(value.collections) ? (value.collections as any[]) : []),
    initiatedBy: typeof value.initiatedBy === 'string' && value.initiatedBy.trim() ? value.initiatedBy : 'system',
    createdAt: value.createdAt,
    completedAt: typeof value.completedAt === 'string' ? value.completedAt : null,
    fileSize: Number.isFinite(Number(value.fileSize)) ? Number(value.fileSize) : 0,
    downloadUrl: typeof value.downloadUrl === 'string' ? value.downloadUrl : null,
    filePath: typeof value.filePath === 'string' ? value.filePath : null,
    checksumSha256: typeof value.checksumSha256 === 'string' ? value.checksumSha256 : null,
    note: typeof value.note === 'string' ? value.note : null,
    error: typeof value.error === 'string' ? value.error : null,
  };
};

const readManifest = async () => {
  try {
    const raw = await fs.readFile(manifestPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(parseBackupRecord)
      .filter((entry) => Boolean(entry))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  } catch {
    return [];
  }
};

const writeManifest = async (records: any[]) => {
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  const safeRecords = records
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, MAX_BACKUP_RECORDS);
  const tmpPath = `${manifestPath}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(safeRecords, null, 2), 'utf8');
  await fs.rename(tmpPath, manifestPath);
};

export const getBackupStorageDir = () => backupStorageDir;

export async function createBackupMetadata(
  collections: any[],
  initiatedBy: string,
  options?: {
    id?: string;
    status?: string;
    filePath?: string | null;
    note?: string | null;
    error?: string | null;
  },
) {
  const records = await readManifest();
  const id = options?.id?.trim() || `backup_${Date.now()}_${randomUUID().slice(0, 8)}`;

  const next = {
    id,
    kind: 'postgres_dump',
    source: 'postgres',
    status: options?.status ?? 'pending',
    collections: normalizeCollections(collections),
    initiatedBy: initiatedBy?.trim() || 'system',
    createdAt: new Date().toISOString(),
    completedAt: options?.status === 'completed' ? new Date().toISOString() : null,
    fileSize: 0,
    downloadUrl: null,
    filePath: options?.filePath ?? null,
    checksumSha256: null,
    note: options?.note ?? null,
    error: options?.error ?? null,
  };

  const deduped = records.filter((record) => record.id !== next.id);
  deduped.unshift(next);
  await writeManifest(deduped);
  return next;
}

export async function updateBackupMetadata(id: string, patch: Record<string, any>) {
  if (!id?.trim()) return null;

  const records = await readManifest();
  const index = records.findIndex((entry) => entry.id === id);
  if (index < 0) return null;

  const current = records[index];
  const next = {
    ...current,
    ...patch,
    collections: patch.collections ? normalizeCollections(patch.collections) : current.collections,
  };

  if (patch.status === 'completed' || patch.status === 'failed') {
    next.completedAt = patch.completedAt ?? new Date().toISOString();
  }

  records[index] = next;
  await writeManifest(records);
  return next;
}

export async function markBackupCompleted(
  id: string,
  details: { filePath: string; fileSize: number; checksumSha256: string },
) {
  return updateBackupMetadata(id, {
    status: 'completed',
    filePath: details.filePath,
    fileSize: Math.max(0, Number(details.fileSize) || 0),
    checksumSha256: details.checksumSha256,
    error: null,
  });
}

export async function markBackupFailed(id: string, error: string) {
  return updateBackupMetadata(id, {
    status: 'failed',
    error: error?.trim() || 'unknown_backup_failure',
  });
}

export async function getBackups(limit = 20) {
  const records = await readManifest();
  return records.slice(0, Math.max(1, limit || 20));
}

export async function getBackupById(id: string) {
  const records = await readManifest();
  return records.find((entry) => entry.id === id) ?? null;
}

export function resolveBackupArtifactPath(value: string) {
  const target = String(value || '').trim();
  if (!target) return '';
  if (path.isAbsolute(target)) return target;
  return path.join(backupStorageDir, target);
}

function toLegacyStatus(status: string) {
  if (status === 'in_review') return 'pending';
  if (status === 'approved') return 'scheduled';
  return status;
}

export async function exportCollectionToJSON(collectionName: string) {
  try {
    const normalized = collectionName.trim().toLowerCase();

    let docs: any[] = [];
    if (normalized === 'posts') {
      const posts = await PostModelPostgres.findAdmin({
        limit: 10000,
        status: 'all',
        sort: 'updated',
      });
      docs = posts.data;
    } else if (normalized === 'post_versions' || normalized === 'postversions') {
      const prismaModule = await import('./postgres/prisma.js');
      const client = (prismaModule as any).prismaApp ?? (prismaModule as any).prisma;
      docs = await client.postVersion.findMany({
        take: 10000,
        orderBy: { createdAt: 'desc' },
      });
    } else if (normalized === 'audit_logs' || normalized === 'auditlogs') {
      const prismaModule = await import('./postgres/prisma.js');
      const client = (prismaModule as any).prismaApp ?? (prismaModule as any).prisma;
      docs = await client.auditLog.findMany({
        take: 10000,
        orderBy: { createdAt: 'desc' },
      });
    } else if (normalized === 'users' || normalized === 'app_users') {
      const prismaModule = await import('./postgres/prisma.js');
      const client = (prismaModule as any).prismaApp ?? (prismaModule as any).prisma;
      docs = await client.userAccountEntry.findMany({
        take: 10000,
        orderBy: { updatedAt: 'desc' },
      });
    } else {
      return null;
    }

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
  updateBackupMetadata,
  markBackupCompleted,
  markBackupFailed,
  getBackups,
  getBackupById,
  getBackupStorageDir,
  resolveBackupArtifactPath,
  exportCollectionToJSON,
  exportAnnouncementsToCSV,
};

export default backupService;
