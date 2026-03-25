import { StaticPageShell } from '@/app/components/StaticPageShell';

export default function Page() {
    return (
        <StaticPageShell
            icon="📣"
            title="Advertise With Us"
            intro="If you want to reach Indian government exam and job seekers through a trust-first product surface, use this page for initial advertising and partnership inquiries."
            eyebrow="Advertise"
        >
            <section>
                <h2>Audience Fit</h2>
                <p>The platform is designed for candidates tracking government jobs, results, admit cards, answer keys, syllabus updates, and admissions. Any partnership should be relevant to that audience.</p>
            </section>

            <section>
                <h2>Accepted Inquiry Types</h2>
                <p>Advertising, sponsorships, learning products, student services, and relevant candidate-support tools may be considered. Misleading, low-trust, or unrelated categories are not accepted.</p>
            </section>

            <section>
                <h2>Contact</h2>
                <p>Send partnership details, campaign goals, timing, and target audience to <a href="mailto:contact@sarkariexams.me">contact@sarkariexams.me</a>.</p>
            </section>
        </StaticPageShell>
    );
}
