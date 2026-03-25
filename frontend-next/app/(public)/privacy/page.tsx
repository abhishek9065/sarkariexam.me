import { StaticPageShell } from '@/app/components/StaticPageShell';

export default function Page() {
    return (
        <StaticPageShell
            icon="🔒"
            title="Privacy Policy"
            intro="This page explains the basic types of information the platform handles and how that information is used to operate the site."
            eyebrow="Privacy"
        >
            <section>
                <h2>Information We Collect</h2>
                <p>We collect the minimum information needed to operate the product experience, such as account details for signed-in users and limited usage data that helps improve reliability and usability.</p>
            </section>

            <section>
                <h2>How We Use Data</h2>
                <p>Information is used to deliver core platform features such as authentication, bookmarks, profile utilities, and other account-based actions.</p>
                <p>We also use service data to maintain performance, investigate problems, and improve the public browsing experience.</p>
            </section>

            <section>
                <h2>Cookies and Preferences</h2>
                <p>Essential cookies may be used for authentication and saved preferences. Additional product behavior data may be used to understand how features are being used and where the UX needs improvement.</p>
            </section>

            <section>
                <h2>Third Parties</h2>
                <p>We do not sell personal information. Where outside services are used to run the platform, data handling is limited to what is needed to provide the service securely and reliably.</p>
            </section>
        </StaticPageShell>
    );
}
