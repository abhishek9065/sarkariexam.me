import { useNavigate, useParams } from 'react-router-dom';

const pages = {
  about: {
    title: 'About Us',
    content: `
        <h3>Welcome to SarkariExams.me</h3>
        <p>SarkariExams.me is India's leading platform for government job notifications, exam results, admit cards, and application forms.</p>
        
        <h4>Our Mission</h4>
        <p>To provide accurate, timely, and comprehensive information about government employment opportunities to millions of job seekers across India.</p>
        
        <h4>What We Offer</h4>
        <ul>
          <li>Latest Government Job Notifications</li>
          <li>Exam Results & Answer Keys</li>
          <li>Admit Card Downloads</li>
          <li>Admission Updates</li>
          <li>Syllabus & Exam Patterns</li>
        </ul>
        
        <h4>Why Choose Us</h4>
        <ul>
          <li>✅ 100% Verified Information</li>
          <li>✅ Real-time Updates</li>
          <li>✅ User-friendly Interface</li>
          <li>✅ No Registration Required</li>
          <li>✅ Free to Use</li>
        </ul>
      `
  },
  contact: {
    title: 'Contact Us',
    content: `
        <h3>Get in Touch</h3>
        <p>We'd love to hear from you! For any queries, suggestions, or feedback, please reach out to us.</p>
        
        <div class="contact-info">
          <p><strong>📧 Email:</strong> contact@sarkariresult.com</p>
          <p><strong>📱 WhatsApp:</strong> +91-XXXXXXXXXX</p>
          <p><strong>📍 Address:</strong> New Delhi, India</p>
        </div>
        
        <h4>Follow Us</h4>
        <p>
          <a href="#">Telegram</a> | 
          <a href="#">WhatsApp</a> | 
          <a href="#">Facebook</a> | 
          <a href="#">Twitter</a>
        </p>
        
        <h4>Feedback Form</h4>
        <p>For detailed queries or job posting requests, please email us with your complete details.</p>
      `
  },
  privacy: {
    title: 'Privacy Policy',
    content: `
        <h3>Privacy Policy</h3>
        <p><strong>Last Updated:</strong> December 2024</p>
        
        <h4>Information We Collect</h4>
        <p>We may collect the following types of information:</p>
        <ul>
          <li>Browser type and version</li>
          <li>Pages visited and time spent</li>
          <li>Referring website</li>
          <li>IP address (anonymized)</li>
        </ul>
        
        <h4>How We Use Information</h4>
        <ul>
          <li>Improve website functionality</li>
          <li>Analyze traffic patterns</li>
          <li>Provide relevant content</li>
        </ul>
        
        <h4>Cookies</h4>
        <p>We use cookies to enhance user experience. You can disable cookies in your browser settings.</p>
        
        <h4>Third-party Services</h4>
        <p>We may use third-party services like Google Analytics and advertising networks.</p>
        
        <h4>Contact</h4>
        <p>For privacy concerns, email us at privacy@sarkariresult.com</p>
      `
  },
  disclaimer: {
    title: 'Disclaimer',
    content: `
        <h3>Disclaimer</h3>
        
        <h4>Information Accuracy</h4>
        <p>While we strive to provide accurate and up-to-date information, we make no warranties about the completeness, reliability, or accuracy of the information on this website.</p>
        
        <h4>Official Sources</h4>
        <p>All information is collected from official government websites and notifications. Users are advised to verify information from official sources before taking any action.</p>
        
        <h4>External Links</h4>
        <p>This website contains links to external websites. We are not responsible for the content or privacy practices of these sites.</p>
        
        <h4>No Guarantee</h4>
        <p>We do not guarantee any job offers, results, or admission. The final authority rests with the respective recruiting organizations.</p>
        
        <h4>Liability</h4>
        <p>We shall not be held liable for any loss or damage arising from the use of information on this website.</p>
        
        <h4>Updates</h4>
        <p>This disclaimer may be updated from time to time. Please check regularly for updates.</p>
      `
  }
};

interface StaticPageProps {
  page?: 'about' | 'contact' | 'privacy' | 'disclaimer';
}

export function StaticPage({ page: pageProp }: StaticPageProps) {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();

  // Use prop if provided, otherwise fallback to URL param
  const pageType = pageProp || type;
  // Default to about if type is invalid or not found in pages
  const pageKey = (pageType && pageType in pages) ? pageType as keyof typeof pages : 'about';
  const page = pages[pageKey];

  return (
    <div className="static-page">
      <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
      <h1 className="page-title">{page.title}</h1>
      <div className="static-content" dangerouslySetInnerHTML={{ __html: page.content }} />
    </div>
  );
}

export default StaticPage;
