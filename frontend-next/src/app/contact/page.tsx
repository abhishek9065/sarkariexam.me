import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us | SarkariExams.me',
  description: 'Get in touch with the SarkariExams team for support, feedback, or business inquiries.',
};

export default function ContactPage() {
  return (
    <div className="container" style={{ padding: '3rem 1.5rem', minHeight: '80vh', maxWidth: '800px' }}>
      
      <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Contact Us</h1>
        <div style={{ width: '60px', height: '4px', background: 'var(--accent)', margin: '0 auto', borderRadius: '2px' }}></div>
      </div>

      <div className="glass-card" style={{ padding: '2.5rem' }}>
        <p className="text-secondary" style={{ marginBottom: '2rem', textAlign: 'center', fontSize: '1.125rem' }}>
          Have a question or feedback? We'd love to hear from you. Fill out the form below and our team will get back to you within 24-48 hours.
        </p>

        <form style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>Full Name *</label>
              <input type="text" required placeholder="John Doe" style={{
                width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', background: 'var(--bg-primary)', color: 'var(--text-primary)'
              }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>Email Address *</label>
              <input type="email" required placeholder="john@example.com" style={{
                width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', background: 'var(--bg-primary)', color: 'var(--text-primary)'
              }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>Subject *</label>
            <input type="text" required placeholder="How can we help?" style={{
              width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', background: 'var(--bg-primary)', color: 'var(--text-primary)'
            }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>Message *</label>
            <textarea required rows={5} placeholder="Write your message here..." style={{
              width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', background: 'var(--bg-primary)', color: 'var(--text-primary)', resize: 'vertical'
            }}></textarea>
          </div>

          <button type="submit" className="btn btn-primary" style={{ padding: '14px', fontSize: '1rem', marginTop: '1rem' }}>
            Send Message
          </button>
        </form>

        <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border-primary)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', textAlign: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Email Support</h3>
            <p style={{ fontWeight: 500 }}>support@sarkariexams.me</p>
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Business Inquiries</h3>
            <p style={{ fontWeight: 500 }}>business@sarkariexams.me</p>
          </div>
        </div>

      </div>
    </div>
  );
}
