'use client';

import Link from 'next/link';

// Dummy data for the 3 main columns mimicking the Sarkari Result layout
const results = [
  { title: 'SSC GD Constable Final Result 2025', href: '/results/ssc-gd' },
  { title: 'UP Police Constable Result 2025', href: '/results/up-police' },
  { title: 'CTET 2025 Answer Key / Result', href: '/results/ctet' },
  { title: 'BPSC RO / ARO Pre Result 2025', href: '/results/bpsc' },
  { title: 'IBPS PO Mains Result 2025', href: '/results/ibps' },
  { title: 'NTA UGC NET Result 2025', href: '/results/net' },
  { title: 'Railway RRB ALP Result 2025', href: '/results/rrb-alp' },
  { title: 'SBI Clerk Final Result 2025', href: '/results/sbi-clerk' },
  { title: 'Navy Agniveer SSR Result 2025', href: '/results/navy' },
  { title: 'Airforce Intake 01/2026 Result', href: '/results/airforce' },
];

const admitCards = [
  { title: 'Railway RPF Constable Admit Card 2025', href: '/admit-cards/rpf' },
  { title: 'SSC CHSL Tier 1 Admit Card 2025', href: '/admit-cards/ssc-chsl' },
  { title: 'UPSC Civil Services Pre Admit Card', href: '/admit-cards/upsc' },
  { title: 'Bihar BPSC Teacher Admit Card', href: '/admit-cards/bpsc' },
  { title: 'CRPF Sub Inspector Admit Card', href: '/admit-cards/crpf' },
  { title: 'DSSSB Various Post Admit Card', href: '/admit-cards/dsssb' },
  { title: 'UPPSC Prelims Admit Card 2025', href: '/admit-cards/uppsc' },
  { title: 'Coast Guard Navik Admit Card', href: '/admit-cards/coast-guard' },
  { title: 'MP Police SI Admit Card 2025', href: '/admit-cards/mp-police' },
  { title: 'FCI Navik / Yantrik Admit Card', href: '/admit-cards/fci' },
];

const latestJobs = [
  { title: 'SSC CGL Online Form 2025', href: '/jobs/ssc-cgl' },
  { title: 'Railway NTPC Online Form 2025', href: '/jobs/rrb-ntpc' },
  { title: 'UPSSSC RO / ARO Apply Online', href: '/jobs/upsssc' },
  { title: 'Bihar Police Constable Form 2025', href: '/jobs/bihar-police' },
  { title: 'Post Office GDS Recruitment 2025', href: '/jobs/post-office' },
  { title: 'SBI PO Online Form 2025', href: '/jobs/sbi-po' },
  { title: 'Airforce Agniveer Vayu Intake 02/2026', href: '/jobs/airforce' },
  { title: 'Army Technical Entry Scheme TES', href: '/jobs/army-tes' },
  { title: 'LIC Assistant Apply Online 2025', href: '/jobs/lic' },
  { title: 'UPPSC Assistant Town Planner', href: '/jobs/uppsc-planner' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F0F0F0] dark:bg-[#0F172A] py-6 font-sans">
      <div className="container mx-auto px-2 sm:px-4 max-w-[1200px]">
        
        {/* Marquee / Important Notice */}
        <div className="bg-[#B91C1C] text-white font-bold py-2 px-4 rounded mb-6 shadow border border-[#991B1B] flex items-center">
          <span className="whitespace-nowrap mr-4 bg-yellow-400 text-black px-2 py-0.5 rounded text-sm animate-pulse">LATEST</span>
          <marquee className="text-sm sm:text-base font-semibold" behavior="scroll" direction="left" scrollamount="6">
            SSC CGL 2025 Online Form Last Date is 30 April 2025. || Railway NTPC 2025 Official Notification Released. Apply Now! || UP Police Constable Result Declared! || Check UP Board 10th & 12th Results Soon!
          </marquee>
        </div>

        {/* 3 Columns Layout (Result | Admit Card | Latest Jobs) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4">
          
          {/* Column 1: Result */}
          <div className="bg-white dark:bg-[#1E293B] rounded shadow border border-gray-300 dark:border-gray-700 overflow-hidden flex flex-col">
            <div className="bg-[#B91C1C] text-white text-center py-2.5 font-bold text-xl uppercase tracking-wider border-b-4 border-[#7F1D1D]">
              Result
            </div>
            <ul className="flex-1 p-1 space-y-0 text-[15px] font-bold">
              {results.map((item, index) => (
                <li key={index} className="border-b border-gray-200 dark:border-gray-800 last:border-0 leading-tight">
                  <Link href={item.href} className="block py-2 px-2 text-[#0000EE] dark:text-[#60A5FA] hover:text-[#FF0000] dark:hover:text-[#FCA5A5] hover:underline">
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="bg-gray-100 dark:bg-gray-800 text-center py-2 border-t border-gray-300 dark:border-gray-700">
              <Link href="/results" className="text-sm font-bold text-[#B91C1C] dark:text-red-400 hover:underline uppercase">
                View More
              </Link>
            </div>
          </div>

          {/* Column 2: Admit Card */}
          <div className="bg-white dark:bg-[#1E293B] rounded shadow border border-gray-300 dark:border-gray-700 overflow-hidden flex flex-col">
            <div className="bg-[#047857] text-white text-center py-2.5 font-bold text-xl uppercase tracking-wider border-b-4 border-[#064E3B]">
              Admit Card
            </div>
            <ul className="flex-1 p-1 space-y-0 text-[15px] font-bold">
              {admitCards.map((item, index) => (
                <li key={index} className="border-b border-gray-200 dark:border-gray-800 last:border-0 leading-tight">
                  <Link href={item.href} className="block py-2 px-2 text-[#0000EE] dark:text-[#60A5FA] hover:text-[#FF0000] dark:hover:text-[#FCA5A5] hover:underline">
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="bg-gray-100 dark:bg-gray-800 text-center py-2 border-t border-gray-300 dark:border-gray-700">
              <Link href="/admit-cards" className="text-sm font-bold text-[#047857] dark:text-emerald-400 hover:underline uppercase">
                View More
              </Link>
            </div>
          </div>

          {/* Column 3: Latest Jobs */}
          <div className="bg-white dark:bg-[#1E293B] rounded shadow border border-gray-300 dark:border-gray-700 overflow-hidden flex flex-col">
            <div className="bg-[#1D4ED8] text-white text-center py-2.5 font-bold text-xl uppercase tracking-wider border-b-4 border-[#1E3A8A]">
              Latest Jobs
            </div>
            <ul className="flex-1 p-1 space-y-0 text-[15px] font-bold">
              {latestJobs.map((item, index) => (
                <li key={index} className="border-b border-gray-200 dark:border-gray-800 last:border-0 leading-tight">
                  <Link href={item.href} className="block py-2 px-2 text-[#0000EE] dark:text-[#60A5FA] hover:text-[#FF0000] dark:hover:text-[#FCA5A5] hover:underline">
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="bg-gray-100 dark:bg-gray-800 text-center py-2 border-t border-gray-300 dark:border-gray-700">
              <Link href="/jobs" className="text-sm font-bold text-[#1D4ED8] dark:text-blue-400 hover:underline uppercase">
                View More
              </Link>
            </div>
          </div>

        </div>
        
        {/* Additional Grid (Answer Key, Syllabus, Admission) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4 mt-6">
          <div className="bg-white dark:bg-[#1E293B] rounded shadow border border-gray-300 dark:border-gray-700 overflow-hidden">
            <div className="bg-[#D97706] text-white text-center py-2 font-bold text-lg uppercase tracking-wider border-b-4 border-[#92400E]">Answer Key</div>
            <div className="p-4 text-center">
              <Link href="/answer-keys" className="text-[15px] font-bold text-[#0000EE] dark:text-blue-400 hover:text-red-600 hover:underline">SSC CGL Tier 1 Answer Key</Link>
              <br/>
              <Link href="/answer-keys" className="text-[13px] font-bold text-gray-600 dark:text-gray-400 hover:underline mt-2 inline-block">View All Answer Keys</Link>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1E293B] rounded shadow border border-gray-300 dark:border-gray-700 overflow-hidden">
            <div className="bg-[#7C3AED] text-white text-center py-2 font-bold text-lg uppercase tracking-wider border-b-4 border-[#5B21B6]">Syllabus</div>
            <div className="p-4 text-center">
              <Link href="/syllabus" className="text-[15px] font-bold text-[#0000EE] dark:text-blue-400 hover:text-red-600 hover:underline">UP Police Constable Syllabus</Link>
              <br/>
              <Link href="/syllabus" className="text-[13px] font-bold text-gray-600 dark:text-gray-400 hover:underline mt-2 inline-block">View All Syllabus</Link>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1E293B] rounded shadow border border-gray-300 dark:border-gray-700 overflow-hidden">
            <div className="bg-[#0891B2] text-white text-center py-2 font-bold text-lg uppercase tracking-wider border-b-4 border-[#164E63]">Admission</div>
            <div className="p-4 text-center">
              <Link href="/admissions" className="text-[15px] font-bold text-[#0000EE] dark:text-blue-400 hover:text-red-600 hover:underline">NTA CUET UG 2025 Online Form</Link>
              <br/>
              <Link href="/admissions" className="text-[13px] font-bold text-gray-600 dark:text-gray-400 hover:underline mt-2 inline-block">View All Admissions</Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
