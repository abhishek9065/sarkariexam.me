import Link from 'next/link';
import type { AnnouncementCard as AnnouncementCardType } from '@/lib/types';
import { TYPE_COLORS } from '@/lib/types';

interface Props {
  data: AnnouncementCardType;
}

export default function AnnouncementCard({ data }: Props) {
  const accentColor = TYPE_COLORS[data.type] || '#0891b2';
  
  // Format date
  let formattedDate = 'Recent';
  if (data.deadline) {
    const d = new Date(data.deadline);
    if (!isNaN(d.getTime())) {
      formattedDate = `Last Date: ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
  }

  return (
    <Link href={`/${data.type}/${data.slug}`} className="glass-card" style={{ 
      display: 'block', 
      padding: '1.25rem', 
      textDecoration: 'none', 
      color: 'inherit',
      borderLeft: `4px solid ${accentColor}`,
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4, margin: 0 }}>
          {data.title}
        </h3>
      </div>
      
      {data.organization && (
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem', fontWeight: 500 }}>
          {data.organization}
        </p>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
        <span className={`badge badge-${data.type}`} style={{ fontSize: '10px' }}>
          {data.type.replace('-', ' ')}
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          {formattedDate}
        </span>
      </div>
    </Link>
  );
}
