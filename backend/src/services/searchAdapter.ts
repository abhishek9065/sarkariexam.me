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

export const mongoRegexSearchAdapter: ContentSearchAdapter = {
  name: 'mongo-regex',
  supportsAdvancedRanking: false,
  normalize(query) {
    return {
      search: query.search?.trim(),
      type: query.type,
      category: query.category?.trim(),
      state: query.state?.trim(),
      organization: query.organization?.trim(),
      qualification: query.qualification?.trim(),
    };
  },
};

export default mongoRegexSearchAdapter;
