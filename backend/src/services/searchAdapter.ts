import type { PostType } from '../content/types.js';

export interface ContentSearchQuery {
  search?: string;
  type?: PostType;
  category?: string;
  state?: string;
  organization?: string;
  qualification?: string;
}

export interface ContentSearchAdapter {
  name: string;
  supportsAdvancedRanking: boolean;
  normalize(query: ContentSearchQuery): ContentSearchQuery;
}

function normalizeSegment(value?: string) {
  return value?.trim().replace(/\s+/g, ' ');
}

// Transitional Postgres-backed search adapter.
// Ranking is still lightweight, but query normalization is now aligned with the
// Prisma/Postgres content read path rather than the old Mongo regex mindset.
export const postgresTokenSearchAdapter: ContentSearchAdapter = {
  name: 'postgres-tokenized',
  supportsAdvancedRanking: false,
  normalize(query) {
    return {
      search: normalizeSegment(query.search),
      type: query.type,
      category: normalizeSegment(query.category),
      state: normalizeSegment(query.state),
      organization: normalizeSegment(query.organization),
      qualification: normalizeSegment(query.qualification),
    };
  },
};

// Compatibility alias for older imports that still expect the old adapter name.
export const mongoRegexSearchAdapter = postgresTokenSearchAdapter;

export default postgresTokenSearchAdapter;
