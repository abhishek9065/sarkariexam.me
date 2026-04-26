import { buildDetailFaqItems } from './detail-faq';
import type { AnnouncementItem, CategoryPageMeta, PortalListEntry, StatePageMeta } from './public-content';
import { siteConfig } from '@/lib/seo';

type Breadcrumb = { href: string; label: string };

const asAbsoluteUrl = (path: string) => new URL(path || '/', siteConfig.url).toString();

function cleanText(value?: string) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function asIsoDate(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteConfig.url,
    sameAs: [siteConfig.links.twitter, siteConfig.links.facebook].filter(Boolean),
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: siteConfig.url,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteConfig.url}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbJsonLd(items: Breadcrumb[]) {
  const normalized = items.filter((item) => item.label && item.href);
  if (normalized.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: normalized.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: asAbsoluteUrl(item.href),
    })),
  };
}

export function collectionJsonLd(meta: CategoryPageMeta | StatePageMeta, entries: PortalListEntry[]) {
  const canonicalPath = 'canonicalPath' in meta ? meta.canonicalPath : '/';
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: meta.title,
      description: meta.description,
      url: asAbsoluteUrl(canonicalPath),
      isPartOf: {
        '@type': 'WebSite',
        name: siteConfig.name,
        url: siteConfig.url,
      },
    },
    entries.length
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          itemListElement: entries.slice(0, 30).map((entry, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: asAbsoluteUrl(entry.href),
            name: entry.title,
          })),
        }
      : null,
  ].filter(Boolean);
}

export function announcementJsonLd(item: AnnouncementItem, canonicalPath: string, breadcrumbs: Breadcrumb[]) {
  const published = asIsoDate(item.publishedAt);
  const updated = asIsoDate(item.updatedAt);
  const graph: unknown[] = [
    breadcrumbJsonLd(breadcrumbs),
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: item.title,
      description: cleanText(item.summary || item.shortInfo),
      url: asAbsoluteUrl(canonicalPath),
      datePublished: published,
      dateModified: updated ?? published,
      author: {
        '@type': 'Organization',
        name: siteConfig.name,
        url: siteConfig.url,
      },
      publisher: {
        '@type': 'Organization',
        name: siteConfig.name,
        url: siteConfig.url,
      },
      mainEntityOfPage: asAbsoluteUrl(canonicalPath),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: buildDetailFaqItems(item).map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    },
    item.section === 'jobs' ? jobPostingJsonLd(item, canonicalPath) : null,
  ].filter(Boolean);

  return graph;
}

function jobPostingJsonLd(item: AnnouncementItem, canonicalPath: string) {
  const datePosted = asIsoDate(item.publishedAt);
  const validThrough = asIsoDate(item.detail.summaryMeta.lastDate);
  const description = cleanText([item.summary, item.shortInfo, item.keyPoints.join(' ')].filter(Boolean).join(' '));

  if (!datePosted || !validThrough || !description) {
    return null;
  }

  const location = cleanText(item.detail.summaryMeta.location);
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: item.title,
    description,
    datePosted,
    validThrough,
    employmentType: 'FULL_TIME',
    hiringOrganization: {
      '@type': 'Organization',
      name: item.org || 'Government of India',
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'IN',
        ...(location && location.toLowerCase() !== 'india' ? { addressRegion: location } : {}),
      },
    },
    url: asAbsoluteUrl(canonicalPath),
  };
}
