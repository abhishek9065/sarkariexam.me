import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAnnouncementCards } from '@/lib/api';
import AnnouncementCard from '@/components/AnnouncementCard';
import { TYPE_LABELS, TYPE_SLUGS, ContentType } from '@/lib/types';

export const revalidate = 60; // Revalidate every 60 seconds

interface PageProps {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  // Resolve params and searchParams (Next.js 15)
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const rawType = resolvedParams.type;
  
  // Validate type
  const contentType = TYPE_SLUGS[rawType] as ContentType | undefined;
  if (!contentType) {
    notFound();
  }

  const title = TYPE_LABELS[contentType];

  // Parse search params
  const limit = 20;
  const cursor = typeof resolvedSearchParams.cursor === 'string' ? resolvedSearchParams.cursor : undefined;
  const search = typeof resolvedSearchParams.search === 'string' ? resolvedSearchParams.search : undefined;

  let cards: any[] = [];
  let nextCursor: string | undefined;
  let hasError = false;

  try {
    const response = await getAnnouncementCards({ 
      type: contentType,
      limit,
      cursor,
      search
    });
    
    if (response) {
      cards = response.data || [];
      nextCursor = response.nextCursor;
    }
  } catch (error) {
    console.error(`Failed to load category feed for ${contentType}:`, error);
    hasError = true;
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', minHeight: '80vh' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border-primary)', paddingBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{title}</h1>
        <p className="text-secondary">Browse the latest updates for {title.toLowerCase()}.</p>
      </div>

      {/* Main Grid */}
      {hasError ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <h2>Error Loading Data</h2>
          <p className="text-secondary">Please try again later.</p>
        </div>
      ) : cards.length === 0 ? (
        <div className="glass-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No records found</h3>
          <p className="text-secondary">Check back later or try adjusting filters.</p>
        </div>
      ) : (
        <>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
            gap: '1.5rem',
            marginBottom: '3rem'
          }}>
            {cards.map(card => (
              <AnnouncementCard key={card.id} data={card} />
            ))}
          </div>

          {/* Pagination */}
          {nextCursor && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Link 
                href={`/${rawType}?cursor=${nextCursor}${search ? `&search=${search}` : ''}`}
                className="btn btn-secondary"
                style={{ padding: '12px 32px' }}
              >
                Load More
              </Link>
            </div>
          )}
        </>
      )}
      
    </div>
  );
}
