import Link from 'next/link';
import { getHomepageFeed } from '@/lib/api';
import AnnouncementCard from '@/components/AnnouncementCard';

// Opt in to dynamic rendering since feed changes often, or set a revalidate time
export const revalidate = 60;

export default async function HomePage() {
  // Fetch data on the server
  let feedData = null;
  let hasError = false;

  try {
    const response = await getHomepageFeed();
    feedData = response?.data;
  } catch (error) {
    console.error("Failed to load homepage feed:", error);
    hasError = true;
  }

  return (
    <div>
      {/* Hero Section */}
      <section style={{ 
        position: 'relative', 
        padding: '6rem 0 4rem', 
        background: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)',
        overflow: 'hidden',
        textAlign: 'center'
      }}>
        <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '400px', height: '400px', background: 'var(--accent-light)', borderRadius: '50%', filter: 'blur(80px)', zIndex: 0 }}></div>
        <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '400px', height: '400px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '50%', filter: 'blur(80px)', zIndex: 0 }}></div>

        <div className="container" style={{ position: 'relative', zIndex: 1, maxWidth: '800px' }}>
          <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', letterSpacing: '-1px', marginBottom: '1.5rem' }}>
            Your Dream <span style={{ color: 'var(--accent)' }}>Government Job</span> Starts Here
          </h1>
          <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '2.5rem', lineHeight: 1.6 }}>
            The fastest, most reliable source for Sarkari Results, Admit Cards, and Latest Jobs across India.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/jobs" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '1rem' }}>
              Browse Latest Jobs
            </Link>
            <Link href="/results" className="btn btn-secondary" style={{ padding: '12px 24px', fontSize: '1rem' }}>
              Check Results
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <section className="container" style={{ padding: '3rem 1.5rem', marginTop: '-2rem', position: 'relative', zIndex: 10 }}>
        
        {hasError ? (
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
            <h2>Temporary Error</h2>
            <p className="text-secondary">We couldn't load the latest updates. The backend might be starting up from sleep. Please refresh in a moment.</p>
          </div>
        ) : !feedData ? (
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="skeleton" style={{ height: '40px', width: '200px', margin: '0 auto 1rem' }}></div>
            <div className="skeleton" style={{ height: '20px', width: '300px', margin: '0 auto' }}></div>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '2rem',
            alignItems: 'start'
          }}>
            
            {/* Column 1: Jobs */}
            <div className="feed-column">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '2px solid var(--accent)', paddingBottom: '0.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', color: 'var(--accent)' }}>Latest Jobs</h2>
                <Link href="/jobs" style={{ fontSize: '0.875rem', fontWeight: 600 }}>View All →</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {feedData.sections?.job?.slice(0, 8).map(job => (
                  <AnnouncementCard key={job.id} data={job} />
                )) || <p className="text-muted">No jobs available</p>}
              </div>
            </div>

            {/* Column 2: Results */}
            <div className="feed-column">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '2px solid #0f9d58', paddingBottom: '0.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', color: '#0f9d58' }}>Results</h2>
                <Link href="/results" style={{ fontSize: '0.875rem', color: '#0f9d58', fontWeight: 600 }}>View All →</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {feedData.sections?.result?.slice(0, 8).map(result => (
                  <AnnouncementCard key={result.id} data={result} />
                )) || <p className="text-muted">No results available</p>}
              </div>
            </div>

            {/* Column 3: Admit Cards */}
            <div className="feed-column">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '2px solid #f97316', paddingBottom: '0.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', color: '#f97316' }}>Admit Cards</h2>
                <Link href="/admit-card" style={{ fontSize: '0.875rem', color: '#f97316', fontWeight: 600 }}>View All →</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {feedData.sections?.['admit-card']?.slice(0, 8).map(card => (
                  <AnnouncementCard key={card.id} data={card} />
                )) || <p className="text-muted">No admit cards available</p>}
              </div>
            </div>

          </div>
        )}

      </section>
    </div>
  );
}
