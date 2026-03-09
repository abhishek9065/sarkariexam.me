'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getBookmarks } from '@/lib/api';
import AnnouncementCard from '@/components/AnnouncementCard';

export default function BookmarksPage() {
  const { user, isLoading, setShowAuthModal } = useAuth();
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loadingBookmarks, setLoadingBookmarks] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      setShowAuthModal(true);
      router.push('/');
    }
  }, [user, isLoading, setShowAuthModal, router]);

  useEffect(() => {
    if (user) {
      async function fetchBookmarks() {
        try {
          const res = await getBookmarks();
          if (res?.data) {
            setBookmarks(res.data);
          }
        } catch (e) {
          console.error("Failed to load bookmarks", e);
        } finally {
          setLoadingBookmarks(false);
        }
      }
      fetchBookmarks();
    }
  }, [user]);

  if (isLoading || loadingBookmarks) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem', minHeight: '60vh', display: 'flex', justifyContent: 'center' }}>
        <p className="text-muted">Loading saved items...</p>
      </div>
    );
  }

  if (!user) return null; // Handled by redirect

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', minHeight: '80vh' }}>
      
      <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border-primary)', paddingBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>My Saved Jobs</h1>
        <p className="text-secondary">Announcements you've bookmarked for later.</p>
      </div>

      {bookmarks.length === 0 ? (
        <div className="glass-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>🔖</div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No saved items yet</h3>
          <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>Keep track of interesting jobs by clicking the "Save for later" button on any announcement page.</p>
          <a href="/jobs" className="btn btn-primary">Browse Latest Jobs</a>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
          gap: '1.5rem',
          marginBottom: '3rem'
        }}>
          {bookmarks.map(card => (
            <AnnouncementCard key={card.id} data={card} />
          ))}
        </div>
      )}
      
    </div>
  );
}
