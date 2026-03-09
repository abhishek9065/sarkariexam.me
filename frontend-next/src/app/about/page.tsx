import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us | SarkariExams.me',
  description: 'Learn about SarkariExams.me, your trusted source for the latest government jobs, results, and admit cards.',
};

export default function AboutPage() {
  return (
    <div className="container" style={{ padding: '3rem 1.5rem', minHeight: '80vh', maxWidth: '800px' }}>
      
      <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>About SarkariExams</h1>
        <div style={{ width: '60px', height: '4px', background: 'var(--accent)', margin: '0 auto', borderRadius: '2px' }}></div>
      </div>

      <div className="glass-card" style={{ padding: '2.5rem', lineHeight: 1.8, fontSize: '1.125rem', color: 'var(--text-secondary)' }}>
        <p style={{ marginBottom: '1.5rem' }}>
          Welcome to <strong style={{ color: 'var(--text-primary)' }}>SarkariExams.me</strong>, your number one source for all things related to Government Jobs (Sarkari Naukri), Results, Admit Cards, and Answer Keys. We're dedicated to giving you the very best of educational and employment information, with a focus on dependability, customer service, and uniqueness.
        </p>

        <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginTop: '2rem', marginBottom: '1rem' }}>Our Mission</h2>
        <p style={{ marginBottom: '1.5rem' }}>
          Our mission is to bridge the gap between job seekers and government opportunities. Finding reliable and up-to-date information about public sector jobs can be overwhelming. We strive to simplify this process by aggregating, verifying, and presenting notifications in a clear, accessible format.
        </p>

        <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginTop: '2rem', marginBottom: '1rem' }}>Disclaimer</h2>
        <div style={{ padding: '1.5rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--accent-red)' }}>
          <p style={{ margin: 0 }}>
            <strong>SarkariExams.me is NOT a government website</strong> and is not affiliated with any government organization. We collect information from various official websites and employment newspapers to provide a centralized hub for job seekers. Always verify the information with official sources before applying.
          </p>
        </div>

        <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginTop: '2rem', marginBottom: '1rem' }}>Contact Us</h2>
        <p>
          We hope you enjoy our services as much as we enjoy offering them to you. If you have any questions or comments, please don't hesitate to <a href="/contact" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>contact us</a>.
        </p>
      </div>
      
    </div>
  );
}
