export interface RawAttributionInput {
  source?: string | null;
  utmSource?: string | null;
  medium?: string | null;
  utmMedium?: string | null;
  campaign?: string | null;
  utmCampaign?: string | null;
  content?: string | null;
  utmContent?: string | null;
  term?: string | null;
  utmTerm?: string | null;
  variant?: string | null;
  ab?: string | null;
  digest?: string | null;
  frequency?: string | null;
  ref?: string | null;
}

export interface NormalizedAttribution {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
  variant: string | null;
  digestType: string | null;
  ref: string | null;
  sourceClass: 'in_app' | 'direct' | 'unknown';
  isDigest: boolean;
}

const IN_APP_SOURCES = new Set([
  'home',
  'category',
  'search_overlay',
  'bookmarks',
  'profile',
  'admin',
  'section_table',
  'related',
  'recommendations',
  'tracker',
]);

const DIRECT_SOURCES = new Set([
  'direct',
  'seo',
  'social',
  'email',
  'push',
  'digest',
  'referral',
]);

const SOURCE_ALIASES: Record<string, string> = {
  'search-overlay': 'search_overlay',
  searchoverlay: 'search_overlay',
  search: 'search_overlay',
  sectiontable: 'section_table',
  section: 'section_table',
  bookmark: 'bookmarks',
  bookmark_page: 'bookmarks',
  homepage: 'home',
  listing: 'category',
  category_page: 'category',
  categoryquery: 'category',
  overlay_submit: 'search_overlay',
  profile_page: 'profile',
  recs: 'recommendations',
  recommend: 'recommendations',
  tracker_page: 'tracker',
  organic: 'seo',
  google: 'seo',
  bing: 'seo',
  facebook: 'social',
  instagram: 'social',
  x: 'social',
  twitter: 'social',
  whatsapp: 'social',
  telegram: 'social',
  newsletter: 'email',
  mail: 'email',
  notification: 'push',
  notification_prompt: 'push',
  push_prompt: 'push',
  app: 'push',
  header_trending: 'home',
  '(direct)': 'direct',
  none: 'direct',
};

const SOURCE_PREFIX_ALIASES: Array<{ prefix: string; canonical: string }> = [
  { prefix: 'home_', canonical: 'home' },
  { prefix: 'category_', canonical: 'category' },
  { prefix: 'bookmarks_', canonical: 'bookmarks' },
  { prefix: 'profile_', canonical: 'profile' },
  { prefix: 'detail_', canonical: 'related' },
];

const MEDIUM_ALIASES: Record<string, string> = {
  organic: 'organic',
  seo: 'organic',
  social: 'social',
  email: 'email',
  newsletter: 'email',
  push: 'push',
  referral: 'referral',
  cpc: 'paid',
  ppc: 'paid',
  paid: 'paid',
  internal: 'internal',
  inapp: 'internal',
};

const DIGEST_TYPE_ALIASES: Record<string, string> = {
  instant: 'instant',
  daily: 'daily',
  weekly: 'weekly',
};

const VARIANT_ALIASES: Record<string, string> = {
  a: 'a',
  b: 'b',
  control: 'control',
  variant: 'variant',
};

const trimOrNull = (value?: string | null): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normalizeToken = (value?: string | null, maxLength = 64): string | null => {
  const trimmed = trimOrNull(value);
  if (!trimmed) return null;
  const sanitized = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '');
  if (!sanitized) return null;
  return sanitized.slice(0, maxLength);
};

const normalizeFreeText = (value?: string | null, maxLength = 120): string | null => {
  const trimmed = trimOrNull(value);
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
};

const normalizeCampaign = (value?: string | null): string | null => {
  const token = normalizeToken(value, 80);
  if (!token) return null;
  return token;
};

const normalizeSource = (value?: string | null): string | null => {
  const token = normalizeToken(value);
  if (!token) return null;
  const mappedAlias = SOURCE_ALIASES[token];
  const mappedByPrefix = SOURCE_PREFIX_ALIASES.find((entry) => token.startsWith(entry.prefix))?.canonical;
  const mapped = mappedAlias ?? mappedByPrefix ?? token;
  if (IN_APP_SOURCES.has(mapped) || DIRECT_SOURCES.has(mapped)) {
    return mapped;
  }
  return 'unknown';
};

const normalizeMedium = (value?: string | null): string | null => {
  const token = normalizeToken(value);
  if (!token) return null;
  return MEDIUM_ALIASES[token] ?? 'unknown';
};

const normalizeDigestType = (value?: string | null): string | null => {
  const token = normalizeToken(value);
  if (!token) return null;
  return DIGEST_TYPE_ALIASES[token] ?? 'unknown';
};

const normalizeVariant = (value?: string | null): string | null => {
  const token = normalizeToken(value);
  if (!token) return null;
  return VARIANT_ALIASES[token] ?? 'unknown';
};

const inferDigestSource = (source: string | null, campaign: string | null, digestType: string | null): string | null => {
  if (source) return source;
  const campaignToken = normalizeToken(campaign);
  if (digestType || campaignToken?.includes('digest')) {
    return 'digest';
  }
  return source;
};

export function classifySource(source: string | null): 'in_app' | 'direct' | 'unknown' {
  if (!source) return 'unknown';
  if (IN_APP_SOURCES.has(source)) return 'in_app';
  if (DIRECT_SOURCES.has(source)) return 'direct';
  return 'unknown';
}

export function isInAppSource(source: string | null): boolean {
  return classifySource(source) === 'in_app';
}

export function isDirectSource(source: string | null): boolean {
  return classifySource(source) === 'direct';
}

export function normalizeAttribution(input: RawAttributionInput): NormalizedAttribution {
  const sourceRaw = input.utmSource ?? input.source;
  const mediumRaw = input.utmMedium ?? input.medium;
  const campaignRaw = input.utmCampaign ?? input.campaign;
  const contentRaw = input.utmContent ?? input.content;
  const termRaw = input.utmTerm ?? input.term;
  const variantRaw = input.variant ?? input.ab;
  const digestTypeRaw = input.digest ?? input.frequency;

  const campaign = normalizeCampaign(campaignRaw);
  const digestType = normalizeDigestType(digestTypeRaw);
  const normalizedSource = inferDigestSource(normalizeSource(sourceRaw), campaign, digestType);
  const sourceClass = classifySource(normalizedSource);

  return {
    source: normalizedSource,
    medium: normalizeMedium(mediumRaw),
    campaign,
    content: normalizeFreeText(contentRaw, 120),
    term: normalizeFreeText(termRaw, 120),
    variant: normalizeVariant(variantRaw),
    digestType,
    ref: normalizeToken(input.ref, 80),
    sourceClass,
    isDigest: normalizedSource === 'digest' || Boolean(digestType),
  };
}
