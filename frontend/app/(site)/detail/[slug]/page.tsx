import { notFound, redirect } from 'next/navigation';
import { getDetail } from '@/lib/content-api';


export default async function LegacyDetailAliasPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  try {
    const { slug } = await params;
    const resolved = await getDetail(slug);
    redirect(resolved.canonicalPath);
  } catch {
    notFound();
  }
}
