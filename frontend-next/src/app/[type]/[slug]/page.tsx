import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getAnnouncementBySlug } from '@/lib/api';
import { ContentType, TYPE_COLORS, TYPE_CTA } from '@/lib/types';
import JobDetailsRenderer from '@/components/details/JobDetailsRenderer';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ type: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  try {
    const res = await getAnnouncementBySlug(resolvedParams.type as ContentType, resolvedParams.slug);
    if (!res?.data) return {};
    
    return {
      title: `${res.data.title} | SarkariExams.me`,
      description: res.data.content?.substring(0, 160).replace(/<[^>]*>?/gm, '') || `Details for ${res.data.title}`,
      openGraph: {
        title: res.data.title,
        description: `Latest details for ${res.data.organization} - ${res.data.title}`,
      }
    };
  } catch {
    return {};
  }
}

export default async function DetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { type, slug } = resolvedParams;

  let announcement = null;
  try {
    const res = await getAnnouncementBySlug(type as ContentType, slug);
    announcement = res?.data;
  } catch (error) {
    console.error(`Failed to load details for ${slug}:`, error);
  }

  if (!announcement) {
    notFound();
  }

  const accentColor = TYPE_COLORS[announcement.type] || '#0891b2';
  const ctaText = TYPE_CTA[announcement.type] || 'View Official Details';

  // Generate JSON-LD schema
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: announcement.title,
    description: announcement.content?.replace(/<[^>]*>?/gm, '') || announcement.title,
    datePosted: announcement.postedAt,
    validThrough: announcement.deadline || undefined,
    employmentType: 'FULL_TIME',
    hiringOrganization: {
      '@type': 'Organization',
      name: announcement.organization,
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: announcement.location || 'India',
        addressCountry: 'IN',
      },
    },
    baseSalary: announcement.salaryMin ? {
      '@type': 'MonetaryAmount',
      currency: 'INR',
      value: {
        '@type': 'QuantitativeValue',
        minValue: announcement.salaryMin,
        maxValue: announcement.salaryMax,
        unitText: 'MONTH'
      }
    } : undefined
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      {/* 1. Breadcrumb */}
      <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
        Home &raquo; <span style={{ textTransform: 'capitalize' }}>{type.replace('-', ' ')}</span> &raquo; {announcement.title.substring(0, 30)}...
      </div>

      <div className="container" style={{ paddingBottom: '4rem', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '2rem', alignItems: 'start' }}>
        
        {/* Main Content Column */}
        <div style={{ width: '100%', minWidth: 0 }}>
          
          {/* 2. Hero Header */}
          <header className="glass-card" style={{ padding: '2.5rem 2rem', borderTop: `6px solid ${accentColor}`, marginBottom: '2rem' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
              <span className={`badge badge-${announcement.type}`}>{announcement.type.replace('-', ' ')}</span>
              {announcement.status === 'published' && <span className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>Active</span>}
            </div>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem', lineHeight: 1.3 }}>{announcement.title}</h1>
            <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '1.5rem' }}>
              {announcement.organization}
            </p>
            
            {/* Quick Summary Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Last Date</p>
                <p style={{ fontWeight: 600 }}>{announcement.deadline ? new Date(announcement.deadline).toLocaleDateString() : 'Not Specified'}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Total Posts</p>
                <p style={{ fontWeight: 600, color: 'var(--accent)' }}>{announcement.totalPosts || 'Various'}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Location</p>
                <p style={{ fontWeight: 600 }}>{announcement.location || 'All India'}</p>
              </div>
            </div>
          </header>

          <JobDetailsRenderer announcement={announcement} />
        </div>

        {/* 3. Sticky Sidebar (Desktop Only) */}
        <aside className="hide-mobile" style={{ position: 'sticky', top: 'calc(var(--header-height) + 2rem)' }}>
          <div className="glass-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-primary)', paddingBottom: '0.75rem' }}>Action Center</h3>
            {announcement.externalLink ? (
              <a href={announcement.externalLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ width: '100%', marginBottom: '1rem', padding: '12px', background: `linear-gradient(135deg, ${accentColor}, #0f172a)` }}>
                {ctaText}
              </a>
            ) : (
              <button disabled className="btn btn-secondary" style={{ width: '100%', marginBottom: '1rem', cursor: 'not-allowed' }}>
                Link Not Available
              </button>
            )}
            <button className="btn btn-secondary" style={{ width: '100%' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
              Save for later
            </button>
          </div>

          <div className="glass-card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Tags</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {announcement.tags?.map(tag => (
                <span key={tag.id} style={{ padding: '4px 10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {tag.name}
                </span>
              ))}
              {(!announcement.tags || announcement.tags.length === 0) && (
                <span className="text-muted" style={{ fontSize: '0.875rem' }}>No tags available</span>
              )}
            </div>
          </div>
        </aside>

      </div>

      {/* 4. Sticky Mobile CTA Bar */}
      <div className="hide-desktop" style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom) + 52px)', /* Above BottomNav */
        left: 0,
        right: 0,
        background: 'var(--bg-card)',
        padding: '12px 16px',
        borderTop: '1px solid var(--border-primary)',
        boxShadow: '0 -4px 12px rgba(0,0,0,0.08)',
        zIndex: 90,
        display: 'flex',
        gap: '12px'
      }}>
        {announcement.externalLink && (
          <a href={announcement.externalLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ flex: 1, padding: '10px', background: `linear-gradient(135deg, ${accentColor}, #0f172a)` }}>
            {ctaText}
          </a>
        )}
        <button className="btn btn-secondary" style={{ padding: '10px 14px' }} aria-label="Save">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
        </button>
      </div>

      {/* Global Style Override for detail page specific HTML tables */}
      <style dangerouslySetInnerHTML={{__html: `
        .rich-text-content table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }
        .rich-text-content th, .rich-text-content td { border: 1px solid var(--border-primary); padding: 8px 12px; }
        .rich-text-content th { background: var(--bg-secondary); }
        .rich-text-content ul, .rich-text-content ol { padding-left: 1.5rem; margin-bottom: 1rem; }
        .rich-text-content a { color: var(--accent); text-decoration: underline; }
      `}} />
    </>
  );
}
