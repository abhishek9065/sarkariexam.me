import type { Metadata } from 'next';

import type { AnnouncementItem } from '@/app/lib/public-content';
import { siteConfig } from '@/lib/seo';

const BASE_KEYWORDS = [
  'sarkari result',
  'government jobs',
  'sarkari naukri',
  'latest govt jobs',
  'exam results',
  'admit card',
  'answer key',
  'admissions',
];

const NOINDEX_ROBOTS: NonNullable<Metadata['robots']> = {
  index: false,
  follow: true,
  googleBot: {
    index: false,
    follow: true,
    'max-snippet': 0,
    'max-image-preview': 'none',
    'max-video-preview': 0,
  },
};

type BuildPageMetadataOptions = {
  title: string;
  description: string;
  canonicalPath?: string;
  keywords?: string[];
  noindex?: boolean;
  type?: 'website' | 'article';
};

type BuildNoIndexMetadataOptions = {
  title?: string;
  description?: string;
  canonicalPath?: string;
  keywords?: string[];
};

const DEFAULT_DESCRIPTION =
  'Trusted government jobs and exam update platform for latest jobs, results, admit cards, answer keys, syllabus, admissions, scholarships, and official notices.';

function normalizeCanonicalPath(value?: string): string {
  if (!value) return '/';

  const cleaned = value.trim();
  if (!cleaned) return '/';

  const withoutHash = cleaned.split('#')[0] || '/';
  const withoutQuery = withoutHash.split('?')[0] || '/';
  const withLeadingSlash = withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;

  if (withLeadingSlash.length > 1 && withLeadingSlash.endsWith('/')) {
    return withLeadingSlash.slice(0, -1);
  }

  return withLeadingSlash;
}

function toAbsoluteUrl(path: string): string {
  return new URL(path, siteConfig.url).toString();
}

function trimDescription(value: string, maxLength = 180): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return DEFAULT_DESCRIPTION;
  if (normalized.length <= maxLength) return normalized;

  const slice = normalized.slice(0, maxLength - 1);
  const cutoff = slice.lastIndexOf(' ');
  if (cutoff > 80) {
    return `${slice.slice(0, cutoff)}...`;
  }

  return `${slice}...`;
}

function dedupeKeywords(keywords: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const keyword of keywords) {
    const trimmed = keyword.trim();
    if (!trimmed) continue;

    const normalized = trimmed.toLowerCase();
    if (seen.has(normalized)) continue;

    seen.add(normalized);
    unique.push(trimmed);
  }

  return unique;
}

export function buildPageMetadata(options: BuildPageMetadataOptions): Metadata {
  const canonicalPath = normalizeCanonicalPath(options.canonicalPath);
  const canonicalUrl = toAbsoluteUrl(canonicalPath);
  const description = trimDescription(options.description);
  const keywords = dedupeKeywords([...BASE_KEYWORDS, ...(options.keywords ?? [])]);
  const imageUrl = siteConfig.ogImage;

  return {
    title: options.title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    keywords,
    openGraph: {
      type: options.type ?? 'website',
      url: canonicalUrl,
      title: options.title,
      description,
      siteName: siteConfig.name,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: siteConfig.name,
        },
      ],
      locale: 'en_IN',
    },
    twitter: {
      card: 'summary_large_image',
      title: options.title,
      description,
      images: [imageUrl],
      creator: '@sarkariexams',
      site: '@sarkariexams',
    },
    ...(options.noindex ? { robots: NOINDEX_ROBOTS } : {}),
  };
}

export function buildNoIndexMetadata(options: BuildNoIndexMetadataOptions = {}): Metadata {
  return buildPageMetadata({
    title: options.title ?? siteConfig.name,
    description: options.description ?? DEFAULT_DESCRIPTION,
    canonicalPath: options.canonicalPath,
    keywords: options.keywords,
    noindex: true,
  });
}

export function buildAnnouncementMetadata(
  item: AnnouncementItem,
  canonicalPath: string,
  options: { noindex?: boolean } = {},
): Metadata {
  const sectionLabel = item.section.replace('-', ' ');
  const deadline = item.detail.summaryMeta.lastDate;
  const hasDeadline = Boolean(deadline && deadline !== 'Check notice' && deadline !== 'Check official notice');
  const description = hasDeadline
    ? `${item.summary} Last date: ${deadline}.`
    : item.summary || item.shortInfo;

  return buildPageMetadata({
    title: item.title,
    description,
    canonicalPath,
    type: 'article',
    noindex: options.noindex,
    keywords: [
      item.org,
      sectionLabel,
      ...(item.keywords ?? []),
    ],
  });
}
