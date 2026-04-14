import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function uniqueStrings(values: unknown, max = 128) {
  if (!Array.isArray(values)) return [];

  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter(Boolean)
        .slice(0, max),
    ),
  );
}

function noStoreJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export async function POST(request: NextRequest) {
  const token = process.env.REVALIDATE_TOKEN;
  if (!token) {
    return noStoreJson({ error: 'REVALIDATE_TOKEN is not configured' }, 503);
  }

  const suppliedToken =
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ||
    request.headers.get('x-revalidate-token')?.trim() ||
    '';

  if (suppliedToken !== token) {
    return noStoreJson({ error: 'Unauthorized' }, 401);
  }

  let body: { paths?: unknown; tags?: unknown } = {};
  try {
    body = (await request.json()) as { paths?: unknown; tags?: unknown };
  } catch {
    return noStoreJson({ error: 'Invalid JSON body' }, 400);
  }

  const paths = uniqueStrings(body.paths).filter((path) => path.startsWith('/'));
  const tags = uniqueStrings(body.tags);

  for (const path of paths) {
    revalidatePath(path);
  }
  for (const tag of tags) {
    revalidateTag(tag, 'max');
  }

  return noStoreJson({
    ok: true,
    revalidatedAt: new Date().toISOString(),
    paths,
    tags,
  });
}
