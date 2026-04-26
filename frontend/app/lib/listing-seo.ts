import type { Metadata } from 'next';
import type { CategoryPageMeta } from './public-content';
import { buildPageMetadata } from './metadata';

type ListingSearchParams = Record<string, string | string[] | undefined>;

export function hasListingFilters(searchParams: ListingSearchParams = {}) {
  return Object.entries(searchParams).some(([key, value]) => {
    if (key === 'page') return false;
    if (Array.isArray(value)) return value.some((item) => item.trim());
    return Boolean(value?.trim());
  });
}

export function buildListingMetadata(options: {
  meta: CategoryPageMeta;
  title: string;
  description: string;
  keywords: string[];
  searchParams?: ListingSearchParams;
}): Metadata {
  return buildPageMetadata({
    title: options.title,
    description: options.description,
    canonicalPath: options.meta.canonicalPath,
    keywords: options.keywords,
    noindex: hasListingFilters(options.searchParams),
  });
}
