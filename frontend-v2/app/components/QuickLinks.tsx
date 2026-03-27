import Link from 'next/link';

const links = [
  { title: 'SSC CGL 2025 Apply Online', href: '/jobs/ssc-cgl', color: 'bg-[#B91C1C] hover:bg-[#991B1B]' },
  { title: 'UP Police Constable Result Declared', href: '/results/up-police', color: 'bg-[#1D4ED8] hover:bg-[#1E3A8A]' },
  { title: 'Railway NTPC Form 2025', href: '/jobs/rrb-ntpc', color: 'bg-[#047857] hover:bg-[#064E3B]' },
  { title: 'UPSC IAS / IFS Admit Card 2025', href: '/admit-cards/upsc', color: 'bg-[#D97706] hover:bg-[#B45309]' },
  { title: 'Bihar BPSC Teacher Phase 4 Exam Date', href: '/admit-cards/bpsc', color: 'bg-[#B91C1C] hover:bg-[#991B1B]' },
  { title: 'CTET 2025 Answer Key / Result', href: '/results/ctet', color: 'bg-[#1D4ED8] hover:bg-[#1E3A8A]' },
  { title: 'Navy Agniveer SSR Recruitment 2025', href: '/jobs/navy', color: 'bg-[#047857] hover:bg-[#064E3B]' },
  { title: 'Army TES 52 Entry Online Form', href: '/jobs/army-tes', color: 'bg-[#D97706] hover:bg-[#B45309]' },
];

export default function QuickLinks() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
      {links.map((link, index) => (
        <Link 
          key={index} 
          href={link.href}
          className={`${link.color} text-white font-bold text-[13px] sm:text-[15px] p-2 text-center rounded shadow items-center flex justify-center min-h-[50px] sm:min-h-[60px] transition-colors border border-black/20`}
        >
          {link.title}
        </Link>
      ))}
    </div>
  );
}
