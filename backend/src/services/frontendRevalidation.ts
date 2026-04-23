import { config } from '../config.js';
import type { PostRecord, TaxonomyRef } from '../content/types.js';
import { publicSectionMap } from '../content/types.js';
import logger from '../utils/logger.js';

interface FrontendRevalidationResult {
  enabled: boolean;
  attempted: boolean;
  ok: boolean;
  status?: number;
  paths: string[];
  tags: string[];
  skippedReason?: string;
}

function sanitizeSegment(value?: string) {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function addTaxonomyTags(tags: Set<string>, prefix: string, refs: TaxonomyRef[] = []) {
  for (const ref of refs) {
    const slug = sanitizeSegment(ref.slug || ref.name);
    if (!slug) continue;
    tags.add(`${prefix}:${slug}`);
  }
}

function addLegacyAliasPaths(paths: Set<string>, post: PostRecord) {
  const aliases = [post.slug, ...(post.legacySlugs || [])]
    .map((value) => sanitizeSegment(value))
    .filter(Boolean);

  for (const alias of aliases) {
    if (post.type === 'job') paths.add(`/job/${alias}`);
    if (post.type === 'result') paths.add(`/result/${alias}`);
    if (post.type === 'admit-card') paths.add(`/admit-card/${alias}`);
    paths.add(`/detail/${alias}`);
  }
}

function buildPaths(post: PostRecord) {
  const paths = new Set<string>();
  const section = publicSectionMap[post.type];
  const canonicalPath = post.seo.canonicalPath?.trim() || `/${section}/${post.slug}`;

  paths.add('/');
  paths.add('/archive');
  paths.add(`/${section}`);
  paths.add(canonicalPath);

  if (post.organization?.slug || post.organization?.name) {
    paths.add(`/organizations/${sanitizeSegment(post.organization.slug || post.organization.name)}`);
  }

  for (const state of post.states || []) {
    const slug = sanitizeSegment(state.slug || state.name);
    if (slug) {
      paths.add(`/states/${slug}`);
    }
  }

  addLegacyAliasPaths(paths, post);
  return Array.from(paths);
}

function buildTags(post: PostRecord) {
  const tags = new Set<string>([
    'content',
    'content:homepage',
    'content:listings',
    'content:posts',
    'content:detail',
    'content:archive',
    'content:taxonomies',
    `content:type:${sanitizeSegment(post.type)}`,
    `content:post:${sanitizeSegment(post.slug)}`,
  ]);

  if (post.organization?.slug || post.organization?.name) {
    tags.add('content:taxonomies:organizations');
    tags.add(`content:organization:${sanitizeSegment(post.organization.slug || post.organization.name)}`);
  }

  if ((post.states || []).length > 0) {
    tags.add('content:taxonomies:states');
  }
  if ((post.categories || []).length > 0) {
    tags.add('content:taxonomies:categories');
  }
  if (post.institution?.slug || post.institution?.name) {
    tags.add('content:taxonomies:institutions');
    tags.add(`content:institution:${sanitizeSegment(post.institution.slug || post.institution.name)}`);
  }
  if (post.exam?.slug || post.exam?.name) {
    tags.add('content:taxonomies:exams');
    tags.add(`content:exam:${sanitizeSegment(post.exam.slug || post.exam.name)}`);
  }

  addTaxonomyTags(tags, 'content:state', post.states);
  addTaxonomyTags(tags, 'content:category', post.categories);
  addTaxonomyTags(tags, 'content:qualification', post.qualifications);

  return Array.from(tags);
}

export async function triggerFrontendRevalidation(post: PostRecord): Promise<FrontendRevalidationResult> {
  if (!config.frontendRevalidateUrl) {
    return {
      enabled: false,
      attempted: false,
      ok: false,
      paths: [],
      tags: [],
      skippedReason: 'Frontend revalidation URL is not configured',
    };
  }

  if (!config.frontendRevalidateToken) {
    return {
      enabled: false,
      attempted: false,
      ok: false,
      paths: [],
      tags: [],
      skippedReason: 'FRONTEND_REVALIDATE_TOKEN is not configured',
    };
  }

  const paths = buildPaths(post);
  const tags = buildTags(post);

  try {
    const response = await fetch(config.frontendRevalidateUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.frontendRevalidateToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paths, tags }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      logger.warn(
        {
          status: response.status,
          body,
          paths,
          tags,
        },
        '[Revalidation] Frontend revalidation request failed',
      );
    }

    return {
      enabled: true,
      attempted: true,
      ok: response.ok,
      status: response.status,
      paths,
      tags,
    };
  } catch (error) {
    logger.error({ err: error, paths, tags }, '[Revalidation] Frontend revalidation request crashed');
    return {
      enabled: true,
      attempted: true,
      ok: false,
      paths,
      tags,
    };
  }
}
