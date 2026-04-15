import { notFound, redirect } from 'next/navigation';
import { normalizeInternalHref } from '@/app/lib/public-content';
import { getDetail } from '@/lib/content-api';


export default async function LegacyDetailAliasPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  try {
    const { slug } = await params;
    const resolved = await getDetail(slug);
    const canonicalPath = normalizeInternalHref(resolved.canonicalPath);
    if (!canonicalPath) {
      notFound();
    }
    redirect(canonicalPath);
  } catch {
    notFound();
  }
}
