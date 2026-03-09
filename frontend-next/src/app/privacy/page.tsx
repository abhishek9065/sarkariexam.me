import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | SarkariExams.me',
  description: 'Privacy Policy for SarkariExams.me. Learn how we collect, use, and protect your data.',
};

export default function PrivacyPage() {
  return (
    <div className="container" style={{ padding: '3rem 1.5rem', minHeight: '80vh', maxWidth: '800px' }}>
      
      <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Privacy Policy</h1>
        <p className="text-secondary">Last Updated: October 2026</p>
      </div>

      <div className="glass-card" style={{ padding: '2.5rem', lineHeight: 1.8, color: 'var(--text-secondary)' }}>
        <p style={{ marginBottom: '2rem' }}>
          At SarkariExams.me, accessible from https://sarkariexams.me, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by SarkariExams.me and how we use it.
        </p>

        <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginTop: '2rem', marginBottom: '1rem' }}>Information We Collect</h2>
        <p style={{ marginBottom: '1.5rem' }}>
          The personal information that you are asked to provide, and the reasons why you are asked to provide it, will be made clear to you at the point we ask you to provide your personal information.
          If you contact us directly, we may receive additional information about you such as your name, email address, phone number, the contents of the message and/or attachments you may send us, and any other information you may choose to provide.
          When you register for an Account, we may ask for your contact information, including items such as name, company name, address, email address, and telephone number.
        </p>

        <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginTop: '2rem', marginBottom: '1rem' }}>How We Use Your Information</h2>
        <ul style={{ marginBottom: '1.5rem', paddingLeft: '1.5rem' }}>
          <li>Provide, operate, and maintain our website</li>
          <li>Improve, personalize, and expand our website</li>
          <li>Understand and analyze how you use our website</li>
          <li>Develop new products, services, features, and functionality</li>
          <li>Communicate with you, either directly or through one of our partners, including for customer service, to provide you with updates and other information relating to the website, and for marketing and promotional purposes</li>
          <li>Send you emails</li>
          <li>Find and prevent fraud</li>
        </ul>

        <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginTop: '2rem', marginBottom: '1rem' }}>Log Files</h2>
        <p style={{ marginBottom: '1.5rem' }}>
          SarkariExams.me follows a standard procedure of using log files. These files log visitors when they visit websites. All hosting companies do this and a part of hosting services' analytics. The information collected by log files include internet protocol (IP) addresses, browser type, Internet Service Provider (ISP), date and time stamp, referring/exit pages, and possibly the number of clicks.
        </p>

        <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginTop: '2rem', marginBottom: '1rem' }}>Cookies and Web Beacons</h2>
        <p style={{ marginBottom: '1.5rem' }}>
          Like any other website, SarkariExams.me uses "cookies". These cookies are used to store information including visitors' preferences, and the pages on the website that the visitor accessed or visited. The information is used to optimize the users' experience by customizing our web page content based on visitors' browser type and/or other information.
        </p>

      </div>
      
    </div>
  );
}
