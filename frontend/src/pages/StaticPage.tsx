import React from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';

type PageType = 'about' | 'contact' | 'privacy' | 'disclaimer' | 'advertise';

const CONTENT: Record<PageType, { title: string; icon: string; body: React.ReactNode }> = {
    about: {
        title: 'About Us',
        icon: 'ℹ️',
        body: (
            <>
                <p>
                    <strong>SarkariExams.me</strong> is an independent information platform for government jobs,
                    results, admit cards, answer keys, syllabus updates, and admission notices.
                    We collect updates from official departments and publish them in a structured, searchable format.
                </p>
                <h2>Our Mission</h2>
                <p>
                    To make exam and recruitment updates easier to track by providing a fast, clear, and reliable
                    portal for students and job aspirants across India.
                </p>
                <h2>Editorial Standards</h2>
                <ul>
                    <li>Source-first publishing from official notifications and government portals</li>
                    <li>Timestamped updates and quick correction workflow when errors are reported</li>
                    <li>Clear tagging by exam type, organization, and region for faster navigation</li>
                </ul>
                <h2>What We Offer</h2>
                <ul>
                    <li><strong>Latest Job Notifications</strong> — Central & State government vacancies</li>
                    <li><strong>Exam Results</strong> — Instant updates for all major exams</li>
                    <li><strong>Admit Cards</strong> — Download links as soon as they're available</li>
                    <li><strong>Answer Keys</strong> — Official and unofficial answer keys</li>
                    <li><strong>Syllabus</strong> — Complete exam syllabi and patterns</li>
                    <li><strong>Admissions</strong> — University and college admission notices</li>
                </ul>
                <h2>Important Note</h2>
                <p>
                    SarkariExams.me is not a government website.
                    Users should always verify eligibility, dates, fees, and final instructions
                    directly from the official notification before applying.
                </p>
            </>
        ),
    },
    contact: {
        title: 'Contact Us',
        icon: '📧',
        body: (
            <>
                <p>
                    Have questions, feedback, or found an error in our listings? We'd love to hear from you.
                </p>
                <div className="contact-grid">
                    <div className="card contact-card">
                        <h3>📧 Email</h3>
                        <p>For general inquiries and support:</p>
                        <a href="mailto:support@sarkariexams.me" className="contact-link">support@sarkariexams.me</a>
                    </div>
                    <div className="card contact-card">
                        <h3>🐛 Report an Issue</h3>
                        <p>Found incorrect information or a broken link?</p>
                        <a href="mailto:corrections@sarkariexams.me" className="contact-link">corrections@sarkariexams.me</a>
                    </div>
                    <div className="card contact-card">
                        <h3>🤝 Partnerships</h3>
                        <p>Interested in collaboration?</p>
                        <a href="mailto:partners@sarkariexams.me" className="contact-link">partners@sarkariexams.me</a>
                    </div>
                </div>
                <p className="text-muted" style={{ marginTop: 24 }}>
                    We typically respond within 24–48 hours.
                </p>
            </>
        ),
    },
    privacy: {
        title: 'Privacy Policy',
        icon: '🔒',
        body: (
            <>
                <p><em>Last updated: February 2026</em></p>
                <h2>Information We Collect</h2>
                <p>We collect information you provide directly: email address, name, and preferences when you create an account. We also collect usage data like pages visited and search queries to improve our service.</p>
                <h2>How We Use Your Information</h2>
                <ul>
                    <li>To provide and improve our services</li>
                    <li>To send notifications about saved jobs and exam updates</li>
                    <li>To personalize your experience based on preferences</li>
                    <li>To analyze usage patterns and improve performance</li>
                </ul>
                <h2>Data Security</h2>
                <p>We use industry-standard security measures including encrypted connections (HTTPS), secure password hashing, and regular security audits to protect your data.</p>
                <h2>Cookies</h2>
                <p>We use essential cookies for authentication and theme preferences. No third-party tracking cookies are used.</p>
                <h2>Your Rights</h2>
                <p>You can access, modify, or delete your account data at any time from your profile settings. Contact us to request a full data export or deletion.</p>
            </>
        ),
    },
    disclaimer: {
        title: 'Disclaimer',
        icon: '⚠️',
        body: (
            <>
                <p>
                    The information provided on SarkariExams is for general informational purposes only.
                    While we strive to keep the information up-to-date and accurate, we make no representations
                    or warranties of any kind about the completeness, accuracy, reliability, or availability
                    of any information on this website.
                </p>
                <h2>Official Sources</h2>
                <p>
                    All job notifications, results, and other content are sourced from official government
                    websites. <strong>Always verify information from the official notification PDF</strong> before
                    making any decisions or submitting applications.
                </p>
                <h2>External Links</h2>
                <p>
                    This site contains links to external government websites. We have no control over the
                    content or availability of those sites and are not responsible for their content.
                </p>
                <h2>No Guarantee</h2>
                <p>
                    We do not guarantee the accuracy of any dates, eligibility criteria, or other details
                    posted on this platform. The official recruitment notification is the final authority.
                </p>
            </>
        ),
    },
    advertise: {
        title: 'Advertise With Us',
        icon: '📣',
        body: (
            <>
                <p>
                    Reach active government exam and job-seeking audiences through placements across homepage,
                    category listings, and high-traffic update pages.
                </p>
                <h2>Available Inventory</h2>
                <ul>
                    <li>Homepage spotlight placements</li>
                    <li>Category page banner placements</li>
                    <li>Newsletter and digest sponsorship slots</li>
                    <li>Campaign-specific promoted update cards</li>
                </ul>
                <h2>Media Kit & Contact</h2>
                <p>
                    For pricing, traffic snapshots, and package options, contact:
                    <br />
                    <a href="mailto:contact@sarkariexams.me" className="contact-link">contact@sarkariexams.me</a>
                </p>
                <p className="text-muted">
                    We review requests within 2 business days and share a tailored plan based on campaign goals.
                </p>
            </>
        ),
    },
};

export function StaticPage({ type }: { type: PageType }) {
    const page = CONTENT[type];

    return (
        <Layout>
            <article className="static-page animate-fade-in">
                <div className="static-header">
                    <span className="static-icon">{page.icon}</span>
                    <div>
                        <h1>{page.title}</h1>
                        <p className="text-muted">SarkariExams information center</p>
                    </div>
                </div>

                <nav className="static-quick-links">
                    <Link to="/jobs">Latest Jobs</Link>
                    <Link to="/results">Results</Link>
                    <Link to="/admit-card">Admit Card</Link>
                    <Link to="/contact">Contact</Link>
                    <Link to="/advertise">Advertise</Link>
                </nav>

                <div className="static-content">
                    {page.body}
                </div>
            </article>
        </Layout>
    );
}
