import { StaticPageShell } from '@/app/components/StaticPageShell';

export default function Page() {
    return (
        <StaticPageShell
            icon="⚠️"
            title="Disclaimer"
            intro="SarkariExams.me is an independent information platform. Users should always verify the latest details from the official source before applying, paying fees, downloading admit cards, or acting on results."
            eyebrow="Disclaimer"
        >
            <section>
                <h2>Independent Platform</h2>
                <p>We are not a government department, commission, board, or recruiting body. We organize publicly available information to make it easier to scan and compare.</p>
            </section>

            <section>
                <h2>Official Verification Required</h2>
                <p>Dates, eligibility, vacancy counts, fees, and links may change after publication. Before taking action, confirm the latest version of the notice on the official website.</p>
            </section>

            <section>
                <h2>No Fee Collection</h2>
                <p>SarkariExams.me does not collect application fees for recruitment or admissions. Payments should only be made on the relevant official portal.</p>
            </section>
        </StaticPageShell>
    );
}
