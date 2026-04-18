import type { Collection } from 'mongodb';

import type { AnalyticsEventType } from './analytics.js';
import { getCollection } from './cosmosdb.js';

export interface LegacyAnalyticsEventDoc {
  type: AnalyticsEventType;
  createdAt: Date;
  announcementId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface LegacyAnalyticsRollupDoc {
  date: string;
  viewCount: number;
  listingViews: number;
  cardClicks: number;
  categoryClicks: number;
  filterApplies: number;
  searchCount: number;
  bookmarkAdds: number;
  bookmarkRemoves: number;
  registrations: number;
  subscriptionsVerified: number;
  subscriptionsUnsubscribed: number;
  savedSearches: number;
  digestPreviews: number;
  digestClicks: number;
  deepLinkClicks: number;
  alertsViewed: number;
  pushSubscribeAttempts: number;
  pushSubscribeSuccesses: number;
  pushSubscribeFailures: number;
  announcementCount: number;
  updatedAt: Date;
}

function getLegacyCollectionSafe<T>(name: string): Collection<T> | null {
  try {
    return getCollection<T>(name);
  } catch {
    return null;
  }
}

// Transitional compatibility boundary:
// analytics events and rollups still persist in Mongo/Cosmos until the analytics
// subsystem is rebuilt. New analytics domain logic should not reach into
// collection names directly outside this adapter.
export function getLegacyAnalyticsEventsCollection() {
  return getLegacyCollectionSafe<LegacyAnalyticsEventDoc>('analytics_events');
}

export function getLegacyAnalyticsRollupsCollection() {
  return getLegacyCollectionSafe<LegacyAnalyticsRollupDoc>('analytics_rollups');
}
