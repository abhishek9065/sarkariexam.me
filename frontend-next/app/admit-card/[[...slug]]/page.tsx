import { DetailPage } from '@/app/components/DetailPageClient';

export function generateStaticParams() {
  return [{ slug: [] }];
}

export default function Page() {
  return <DetailPage type="admit-card" />;
}
