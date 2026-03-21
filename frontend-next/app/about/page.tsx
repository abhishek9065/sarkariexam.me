import { StaticPageShell } from '@/app/components/StaticPageShell';

export default function Page() {
    return (
        <StaticPageShell
            icon="🏛️"
            title="About SarkariExams.me"
            intro="SarkariExams.me is built to make government jobs, results, admit cards, and exam notifications easier to track from one clear public platform."
            eyebrow="About"
        >
            <section className="public-static-section">
                <h2>What We Do</h2>
                <p>We organize important public updates into a browsing experience that is faster to scan, easier to search, and simpler to revisit than scattered notification pages.</p>
                <p>The goal is direct: help aspirants find official notices, deadlines, and linked resources without unnecessary friction.</p>
            </section>

            <section className="public-static-section">
                <h2>Our Mission</h2>
                <p>We aim to provide timely and readable access to government job opportunities, result releases, admit cards, answer keys, syllabus updates, and admission notices across India.</p>
                <p>Millions of candidates rely on clear, structured information to plan their next step. This platform is designed around that need.</p>
            </section>

            <section className="public-static-section">
                <h2>Important Note</h2>
                <p>SarkariExams.me is not affiliated with any government body. We aggregate and organize information from public and official sources.</p>
                <p>Before applying, paying fees, or downloading any document, always verify the latest information on the official website linked with the announcement.</p>
            </section>
        </StaticPageShell>
    );
}
