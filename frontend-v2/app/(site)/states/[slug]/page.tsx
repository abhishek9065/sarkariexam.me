import Link from 'next/link';

function toLabel(slug: string) {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default async function StateJobsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const stateName = toLabel(slug);

  return (
    <div className="min-h-screen bg-[#f0f2f7]">
      <section className="rounded-2xl bg-[#4e342e] px-6 py-8 text-white shadow-sm">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/75">State Jobs</p>
        <h1 className="text-3xl font-extrabold">{stateName} Government Jobs</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/85">
          State-specific notices, recruitment forms, admit cards, and result updates for {stateName}.
        </p>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="bg-[#283593] px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white">
            Featured {stateName} Updates
          </div>
          <div className="divide-y divide-gray-100">
            {[
              `${stateName} Police Recruitment`,
              `${stateName} Teacher Vacancy`,
              `${stateName} Clerk / Assistant Posts`,
              `${stateName} Board Result & Notices`,
            ].map((item, index) => (
              <div key={item} className="flex items-start justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-[13px] font-semibold text-gray-800">{item}</p>
                  <p className="mt-1 text-[11px] text-gray-500">
                    Dedicated state listing page is active and ready for full data wiring.
                  </p>
                </div>
                <span className="shrink-0 text-[11px] font-medium text-gray-400">{24 - index} Mar 2026</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="bg-[#ad1457] px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white">
              Quick Access
            </div>
            <div className="grid gap-2 p-4">
              <Link href="/states" className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-[#e65100]">
                All States
              </Link>
              <Link href="/jobs" className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-[#e65100]">
                National Jobs
              </Link>
              <Link href="/" className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-[#e65100]">
                Homepage
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
