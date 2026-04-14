import { notFound, redirect } from 'next/navigation';
import { loadDetailPage } from '@/lib/content-page';


export default async function ResultAliasPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  try {
    const { slug } = await params;
    const resolved = await loadDetailPage('results', slug);
    redirect(resolved.canonicalPath);
  } catch {
    notFound();
  }
}
