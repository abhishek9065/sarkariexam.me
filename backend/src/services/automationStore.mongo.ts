import type { Collection } from 'mongodb';

import { getCollection } from './cosmosdb.js';

export interface LegacyLinkRecordDoc {
  _id: unknown;
  url?: string;
  announcementId?: string;
  status?: string;
  updatedAt?: Date;
  lastCheckedAt?: Date;
}

export interface LegacyLinkHealthEventDoc {
  url: string;
  linkId: string;
  announcementId?: string;
  status: 'ok' | 'broken';
  checkedAt: Date;
  checkedBy: string;
}

function getLegacyCollectionSafe<T>(name: string): Collection<T> | null {
  try {
    return getCollection<T>(name);
  } catch {
    return null;
  }
}

// Transitional compatibility boundary:
// automation jobs still persist link-health operational data in Mongo/Cosmos.
// Keep direct collection names out of the scheduler service so the remaining
// legacy storage seam stays explicit and easy to replace later.
export function getLegacyLinkRecordsCollection() {
  return getLegacyCollectionSafe<LegacyLinkRecordDoc>('link_records');
}

export function getLegacyLinkHealthEventsCollection() {
  return getLegacyCollectionSafe<LegacyLinkHealthEventDoc>('link_health_events');
}
