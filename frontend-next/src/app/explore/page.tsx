'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAnnouncementCards, getTrendingSearches } from '@/lib/api';
import AnnouncementCard from '@/components/AnnouncementCard';

function ExploreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [search, setSearch] = useState(initialQuery);
  const [results, setResults] = useState<any[]>([]);
  const [trending, setTrending] = useState<{ query: string; count: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(!!initialQuery);

  useEffect(() => {
    // Load trending searches on mount
    getTrendingSearches().then(res => {
      if (res?.data) setTrending(res.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  const performSearch = async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await getAnnouncementCards({ search: query, limit: 30 });
      if (res?.data) {
        setResults(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/explore?q=${encodeURIComponent(search.trim())}`);
      performSearch(search);
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', minHeight: '80vh' }}>
      
      <div style={{ marginBottom: '3rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto 3rem auto' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', background: 'linear-gradient(135deg, var(--text-primary), var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Explore SarkariExams
        </h1>
        <p className="text-secondary" style={{ marginBottom: '2rem' }}>
          Search across thousands of government jobs, results, and admit cards instantly.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', position: 'relative' }}>
          <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for SSC, UPSC, results..." 
            style={{
              flex: 1, 
              padding: '16px 16px 16px 48px', 
              borderRadius: 'var(--radius-full)', 
              border: '2px solid var(--border-primary)', 
              background: 'var(--bg-card)', 
              color: 'var(--text-primary)',
              fontSize: '1rem',
              outline: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }} 
          />
          <button type="submit" className="btn btn-primary" style={{ borderRadius: 'var(--radius-full)', padding: '0 24px' }}>
            Search
          </button>
        </form>

        {!hasSearched && trending.length > 0 && (
          <div style={{ marginTop: '2rem', textAlign: 'left' }}>
            <p className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trending Searches</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {trending.map((t, i) => (
                <button 
                  key={i}
                  onClick={() => {
                    setSearch(t.query);
                    router.push(`/explore?q=${encodeURIComponent(t.query)}`);
                  }}
                  className="badge" 
                  style={{ cursor: 'pointer', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', padding: '8px 16px', color: 'var(--text-primary)', transition: 'all 0.2s ease' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', display: 'inline-block' }}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                  {t.query}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {hasSearched && (
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-primary)' }}>
            Search Results {loading ? '...' : <span className="text-muted" style={{ fontSize: '1rem', fontWeight: 400 }}>({results.length} found)</span>}
          </h2>

          {loading ? (
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="glass-card" style={{ height: '140px', animation: 'pulse 2s infinite' }}></div>
              ))}
             </div>
          ) : results.length === 0 ? (
            <div className="glass-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>🔍</div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No results found</h3>
              <p className="text-secondary">Try adjusting your search terms or checking for typos.</p>
            </div>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
              gap: '1.5rem',
              marginBottom: '3rem'
            }}>
              {results.map(card => (
                <AnnouncementCard key={card.id} data={card} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={
      <div className="container" style={{ padding: '4rem 1.5rem', minHeight: '80vh', textAlign: 'center' }}>
        <div className="glass-card" style={{ height: '140px', animation: 'pulse 2s infinite', maxWidth: '600px', margin: '0 auto' }}></div>
      </div>
    }>
      <ExploreContent />
    </Suspense>
  );
}
