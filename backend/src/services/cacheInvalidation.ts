import { bumpCacheVersion } from './cacheVersion.js';

export const ANNOUNCEMENT_CACHE_GROUPS = [
  'announcements',
  'trending',
  'search',
  'calendar',
  'categories',
  'organizations',
  'tags',
  'announcement',
] as const;

export async function invalidateCacheGroups(groups: readonly string[]): Promise<void> {
  await Promise.all(groups.map((group) => bumpCacheVersion(group)));
}

export async function invalidateAnnouncementCaches(): Promise<void> {
  await invalidateCacheGroups(ANNOUNCEMENT_CACHE_GROUPS);
}

