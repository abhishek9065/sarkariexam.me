import Link from 'next/link';

const admitCards = [
  {
    id: 'ibps-po-mains',
    title: 'IBPS PO Mains Admit Card 2026',
    organization: 'Institute of Banking Personnel',
    examDate: '28 February 2026',
    status: 'Available',
  },
  {
    id: 'ssc-cgl-tier-1',
    title: 'SSC CGL Tier I Admit Card 2026',
    organization: 'Staff Selection Commission',
    examDate: '15 March 2026',
    status: 'Available',
  },
  {
    id: 'rrb-ntpc-stage-2',
    title: 'RRB NTPC Stage II Admit Card 2026',
    organization: 'Railway Recruitment Board',
    examDate: '20 March 2026',
    status: 'Available',
  },
  {
    id: 'upsc-cse-mains',
    title: 'UPSC CSE Mains Admit Card 2026',
    organization: 'Union Public Service Commission',
    examDate: '22 March 2026',
    status: 'Expected',
  },
  {
    id: 'sbi-clerk-mains',
    title: 'SBI Clerk Mains Admit Card 2026',
    organization: 'State Bank of India',
    examDate: '10 March 2026',
    status: 'Available',
  },
  {
    id: 'ssc-chsl-tier-1',
    title: 'SSC CHSL Tier I Admit Card 2026',
    organization: 'Staff Selection Commission',
    examDate: '05 April 2026',
    status: 'Expected',
  },
];

export default function AdmitCardsPage() {
  return (
    <div className="min-h-screen bg-[#f0f2f7]">
      <section className="rounded-2xl bg-gradient-to-br from-[#6a1b9a] to-[#4a148c] px-6 py-8 text-white shadow-sm">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/75">Admit Card</p>
        <h1 className="text-3xl font-extrabold">Latest Admit Cards</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/85">
          Download exam hall tickets, city slips, and e-admit cards for major government recruitment and entrance exams.
        </p>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="bg-[#6a1b9a] px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white">
            Current Admit Cards
          </div>
          <div className="divide-y divide-gray-100">
            {admitCards.map((card) => (
              <Link
                key={card.id}
                href={`/admit-cards/${card.id}`}
                className="flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-orange-50"
              >
                <div>
                  <p className="text-[13px] font-semibold text-gray-800">{card.title}</p>
                  <p className="mt-1 text-[11px] text-gray-500">{card.organization}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[11px] font-semibold text-gray-500">{card.examDate}</p>
                  <span
                    className={`mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                      card.status === 'Available' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {card.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="bg-[#37474f] px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white">
              Important Notice
            </div>
            <div className="space-y-3 p-4 text-sm leading-7 text-gray-600">
              <p>Download the admit card in advance and verify your reporting time, center, and instructions.</p>
              <p>Carry a printed admit card with a valid photo ID on the exam day.</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="bg-[#283593] px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white">
              Quick Access
            </div>
            <div className="grid gap-2 p-4">
              <Link href="/jobs" className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-[#e65100]">
                Latest Jobs
              </Link>
              <Link href="/results" className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-[#e65100]">
                Latest Results
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
