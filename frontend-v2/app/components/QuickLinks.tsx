'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

const links = [
  { title: 'SSC CGL 2025 Apply Online', href: '/jobs/ssc-cgl', gradient: 'from-[#EF4444] to-[#B91C1C]' },
  { title: 'UP Police Constable Result Declared', href: '/results/up-police', gradient: 'from-[#3B82F6] to-[#1D4ED8]' },
  { title: 'Railway NTPC Form 2025', href: '/jobs/rrb-ntpc', gradient: 'from-[#10B981] to-[#047857]' },
  { title: 'UPSC IAS / IFS Admit Card 2025', href: '/admit-cards/upsc', gradient: 'from-[#F59E0B] to-[#D97706]' },
  { title: 'Bihar BPSC Teacher Exam Date', href: '/admit-cards/bpsc', gradient: 'from-[#EF4444] to-[#B91C1C]' },
  { title: 'CTET 2025 Answer Key / Result', href: '/results/ctet', gradient: 'from-[#3B82F6] to-[#1D4ED8]' },
  { title: 'Navy Agniveer SSR Recruitment 2025', href: '/jobs/navy', gradient: 'from-[#10B981] to-[#047857]' },
  { title: 'Army TES 52 Entry Online Form', href: '/jobs/army-tes', gradient: 'from-[#8B5CF6] to-[#6D28D9]' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 10 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 300 } }
};

export default function QuickLinks() {
  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8"
    >
      {links.map((link, index) => (
        <motion.div variants={itemVariants} key={index}>
          <Link 
            href={link.href}
            className={`bg-gradient-to-br ${link.gradient} text-white font-bold text-[13px] sm:text-[15px] p-3 text-center rounded-xl shadow-lg hover:shadow-2xl hover:scale-[1.03] active:scale-[0.98] items-center flex justify-center min-h-[60px] sm:min-h-[70px] transition-all duration-300 border border-white/20 relative overflow-hidden group`}
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
            <span className="relative z-10 drop-shadow-md">{link.title}</span>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}
