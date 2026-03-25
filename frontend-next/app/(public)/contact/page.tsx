import { StaticPageShell } from '@/app/components/StaticPageShell';

export default function Page() {
    return (
        <StaticPageShell
            icon="📬"
            title="Contact Us"
            intro="Reach out for support, corrections, or general questions about the platform. We keep this page simple and direct."
            eyebrow="Contact"
        >
            <section className="public-static-section">
                <h2>Get in Touch</h2>
                <p>If you notice incorrect information, a broken link, or want to send a suggestion, use one of the channels below. We review messages as quickly as possible.</p>
            </section>

            <section className="public-contact-grid">
                <div className="public-contact-card">
                    <h3>General Inquiries</h3>
                    <p>Questions about the site, feature requests, or partnership-related messages.</p>
                    <a href="mailto:contact@sarkariexams.me" className="public-contact-link">contact@sarkariexams.me</a>
                </div>

                <div className="public-contact-card">
                    <h3>Report an Issue</h3>
                    <p>Use this if you see outdated content, incorrect dates, or a page problem that needs correction.</p>
                    <a href="mailto:support@sarkariexams.me" className="public-contact-link">support@sarkariexams.me</a>
                </div>
            </section>

            <section className="public-static-section">
                <h2>Response Window</h2>
                <p>Most messages are typically reviewed within 24 to 48 hours. If the issue is about an active deadline or an official notice link, include the relevant page URL so it can be checked faster.</p>
            </section>
        </StaticPageShell>
    );
}
