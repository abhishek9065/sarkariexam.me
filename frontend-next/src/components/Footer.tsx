'use client';

import Link from 'next/link';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-primary)', padding: '4rem 0 2rem 0', marginTop: '4rem' }}>
      <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
        
        <div>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>SarkariExams.me</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Your trusted source for the latest government jobs, results, admit cards, and educational updates across India.
          </p>
        </div>

        <div>
          <h4 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Quick Links</h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li><Link href="/jobs" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Latest Jobs</Link></li>
            <li><Link href="/results" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Results</Link></li>
            <li><Link href="/admit-card" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Admit Cards</Link></li>
            <li><Link href="/syllabus" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Syllabus</Link></li>
          </ul>
        </div>

        <div>
          <h4 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Information</h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li><Link href="/about" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>About Us</Link></li>
            <li><Link href="/contact" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Contact Us</Link></li>
            <li><Link href="/privacy" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Privacy Policy</Link></li>
            <li><Link href="/disclaimer" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Disclaimer</Link></li>
          </ul>
        </div>

      </div>
      
      <div className="container" style={{ borderTop: '1px solid var(--border-primary)', paddingTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          © {year} SarkariExams.me. All rights reserved.
        </p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '500px', textAlign: 'right' }}>
          Disclaimer: We are an informational portal and not affiliated with any government organization. All information is gathered from official sources but should be verified independently.
        </p>
      </div>
    </footer>
  );
}
