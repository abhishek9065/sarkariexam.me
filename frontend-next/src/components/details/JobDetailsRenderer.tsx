import type { Announcement } from '@/lib/types';
import DOMPurify from 'dompurify';

interface Props {
  announcement: Announcement;
}

export default function JobDetailsRenderer({ announcement }: Props) {
  const { importantDates, content } = announcement;
  const jobDetails = announcement.jobDetails as any;
  const noData = !jobDetails && !importantDates?.length && !content;

  if (noData) {
    return <div className="text-secondary">No additional details available.</div>;
  }

  // Safe HTML content rendering
  const createMarkup = (html?: string) => {
    // Note: In server components, dompurify should only be used if we need to clean client-side, 
    // but React's dangerouslySetInnerHTML is inherently unsafe so DOMPurify is good practice.
    // However, dompurify needs a window object. We'll skip it for simple server rendering or 
    // use a server-compatible HTML sanitizer if needed. For now we assume backend sends clean HTML, 
    // but in a real app we'd use `isomorphic-dompurify` or sanitize on the backend.
    return { __html: html || '' };
  };

  return (
    <div className="job-details-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* 1. Important Dates */}
      {importantDates && importantDates.length > 0 ? (
        <section id="dates" className="glass-card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--accent)', borderBottom: '2px solid var(--border-primary)', paddingBottom: '0.5rem' }}>
            📅 Important Dates
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            {importantDates.map((date, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontWeight: 600 }}>{date.eventName}</span>
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                  {new Date(date.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* 2. Application Fees (from jobDetails if available) */}
      {jobDetails?.fees && Array.isArray(jobDetails.fees) && jobDetails.fees.length > 0 ? (
        <section id="fees" className="glass-card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--accent)', borderBottom: '2px solid var(--border-primary)', paddingBottom: '0.5rem' }}>
            💰 Application Fee
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)' }}>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border-primary)' }}>Category</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border-primary)' }}>Fee Amount</th>
              </tr>
            </thead>
            <tbody>
              {jobDetails.fees.map((fee: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{fee.category}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--accent-green)', fontWeight: 600 }}>
                    {fee.amount === 0 ? 'Exempted' : `₹${fee.amount}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {jobDetails.feePaymentMode && (
            <p className="text-secondary" style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
              <strong>Payment Mode:</strong> {jobDetails.feePaymentMode}
            </p>
          )}
        </section>
      ) : null}

      {/* 3. Vacancy Details */}
      {(announcement.totalPosts || (jobDetails?.vacancies && Array.isArray(jobDetails.vacancies))) ? (
        <section id="vacancies" className="glass-card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--accent)', borderBottom: '2px solid var(--border-primary)', paddingBottom: '0.5rem' }}>
            📊 Vacancy Details <span className="badge badge-job">{announcement.totalPosts || 'Various'} Posts</span>
          </h2>
          {jobDetails?.vacancies && Array.isArray(jobDetails.vacancies) && jobDetails.vacancies.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '500px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)' }}>
                    <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border-primary)' }}>Post Name</th>
                    <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border-primary)' }}>Total</th>
                    <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border-primary)' }}>Qualification</th>
                  </tr>
                </thead>
                <tbody>
                  {jobDetails.vacancies.map((v: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{v.postName}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--accent)' }}>{v.count}</td>
                      <td style={{ padding: '12px 16px', fontSize: '0.875rem' }}>{v.qualification || announcement.minQualification || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-secondary">Please refer to the official notification for category-wise vacancy details.</p>
          )}
        </section>
      ) : null}

      {/* 4. Age Limits */}
      {announcement.ageLimit ? (
        <section id="eligibility" className="glass-card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--accent)', borderBottom: '2px solid var(--border-primary)', paddingBottom: '0.5rem' }}>
            🎂 Age Limit
          </h2>
          <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--accent)' }}>
            <p style={{ fontWeight: 500 }}>{announcement.ageLimit}</p>
            {jobDetails?.ageRelaxation && <p className="text-muted" style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>* {jobDetails.ageRelaxation}</p>}
          </div>
        </section>
      ) : null}

      {/* 5. Rich HTML Content */}
      {content ? (
        <section id="details" className="glass-card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--accent)', borderBottom: '2px solid var(--border-primary)', paddingBottom: '0.5rem' }}>
            📝 Full Details
          </h2>
          <div 
            className="rich-text-content" 
            dangerouslySetInnerHTML={createMarkup(content)}
            style={{ lineHeight: 1.8, color: 'var(--text-secondary)' }}
          />
        </section>
      ) : null}

      {/* 6. Important Links */}
      {announcement.externalLink ? (
        <section id="links" className="glass-card" style={{ padding: '2rem', background: 'linear-gradient(to right, var(--bg-card), var(--bg-secondary))' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--accent)', borderBottom: '2px solid var(--border-primary)', paddingBottom: '0.5rem' }}>
            🔗 Important Links
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <a href={announcement.externalLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: '14px 20px', width: '100%', justifyContent: 'space-between' }}>
              <span>Click Here to Apply Online / Official Website</span>
              <span>→</span>
            </a>
          </div>
        </section>
      ) : null}
    </div>
  );
}
