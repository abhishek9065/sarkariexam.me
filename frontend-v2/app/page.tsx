'use client';

import Link from 'next/link';
import { motion, Variants } from 'framer-motion';
import QuickLinks from './components/QuickLinks';
import SocialJoinBanners from './components/SocialJoinBanners';
import HomepageSearch from './components/HomepageSearch';
import AppDownloadBanner from './components/AppDownloadBanner';

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
  const columnVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.15,
        duration: 0.6,
        ease: "easeOut"
      }
    }),
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } }
  };

  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-[#090D14] font-sans pb-10 overflow-hidden">
      
      {/* 2026 Premium Animated Background Elements */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-blue-100/50 to-transparent dark:from-blue-900/10 dark:to-transparent pointer-events-none" />
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400/20 dark:bg-blue-600/10 blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute top-[10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-red-400/20 dark:bg-red-600/10 blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
      <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[40%] rounded-full bg-emerald-400/10 dark:bg-emerald-600/5 blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-2 sm:px-4 max-w-[1200px] relative z-10 pt-6">
        
        {/* Marquee / Important Notice - Premium Glass Style */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-red-600 to-red-800 text-white font-bold py-2.5 px-4 rounded-xl mb-6 shadow-lg shadow-red-900/20 border border-red-500/30 flex items-center overflow-hidden relative backdrop-blur-md"
        >
          <span className="whitespace-nowrap mr-4 bg-yellow-400 text-black px-3 py-1 rounded-md text-xs sm:text-sm animate-pulse z-10 shadow-sm font-black tracking-wide">
            LATEST
          </span>
          <div className="flex-1 overflow-hidden">
            <div className="whitespace-nowrap inline-block animate-marquee hover:[animation-play-state:paused] font-semibold text-sm sm:text-base py-1">
              SSC CGL 2025 Online Form Last Date is 30 April 2025. || Railway NTPC 2025 Official Notification Released. Apply Now! || UP Police Constable Result Declared! || Check UP Board 10th & 12th Results Soon!
              <span className="mx-8 text-red-300">||</span>
              SSC CGL 2025 Online Form Last Date is 30 April 2025. || Railway NTPC 2025 Official Notification Released. Apply Now! || UP Police Constable Result Declared! || Check UP Board 10th & 12th Results Soon!
            </div>
          </div>
        </motion.div>

        <HomepageSearch />
        <QuickLinks />
        <SocialJoinBanners />

        {/* 3 Columns Layout (Result | Admit Card | Latest Jobs) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mt-8">
          
          {/* Column 1: Result */}
          <motion.div 
            custom={0}
            initial="hidden"
            animate="visible"
            variants={columnVariants}
            className="group bg-white/80 dark:bg-[#1E293B]/60 backdrop-blur-xl rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-red-500/10 border border-white/60 dark:border-white/10 overflow-hidden flex flex-col transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="bg-gradient-to-r from-[#B91C1C] to-[#991B1B] text-white text-center py-3.5 font-bold text-xl uppercase tracking-wider relative overflow-hidden">
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              Result
            </div>
            <ul className="flex-1 px-3 py-2 space-y-1 text-[15px] font-semibold">
              {results.map((item, index) => (
                <motion.li variants={itemVariants} key={index} className="border-b border-gray-100 dark:border-white/5 last:border-0">
                  <Link href={item.href} className="block py-2.5 px-3 text-blue-700 dark:text-blue-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-50/50 dark:hover:bg-white/5 rounded-lg transition-all duration-200">
                    <span className="relative inline-block hover:translate-x-1 hover:-translate-y-px transition-transform duration-200">{item.title}</span>
                  </Link>
                </motion.li>
              ))}
            </ul>
            <div className="bg-gray-50/80 dark:bg-gray-800/80 text-center py-3 border-t border-gray-200/60 dark:border-gray-700/60 transition-colors group-hover:bg-red-50 dark:group-hover:bg-red-900/20">
              <Link href="/results" className="text-sm font-bold text-[#B91C1C] dark:text-red-400 hover:underline uppercase flex items-center justify-center gap-1">
                View More <span className="text-lg leading-none">&raquo;</span>
              </Link>
            </div>
          </motion.div>

          {/* Column 2: Admit Card */}
          <motion.div 
            custom={1}
            initial="hidden"
            animate="visible"
            variants={columnVariants}
            className="group bg-white/80 dark:bg-[#1E293B]/60 backdrop-blur-xl rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-emerald-500/10 border border-white/60 dark:border-white/10 overflow-hidden flex flex-col transition-all duration-300 transform hover:-translate-y-1"
          >
             <div className="bg-gradient-to-r from-[#047857] to-[#064E3B] text-white text-center py-3.5 font-bold text-xl uppercase tracking-wider relative overflow-hidden">
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              Admit Card
            </div>
            <ul className="flex-1 px-3 py-2 space-y-1 text-[15px] font-semibold">
              {admitCards.map((item, index) => (
                <motion.li variants={itemVariants} key={index} className="border-b border-gray-100 dark:border-white/5 last:border-0">
                  <Link href={item.href} className="block py-2.5 px-3 text-blue-700 dark:text-blue-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-50/50 dark:hover:bg-white/5 rounded-lg transition-all duration-200">
                     <span className="relative inline-block hover:translate-x-1 hover:-translate-y-px transition-transform duration-200">{item.title}</span>
                  </Link>
                </motion.li>
              ))}
            </ul>
            <div className="bg-gray-50/80 dark:bg-gray-800/80 text-center py-3 border-t border-gray-200/60 dark:border-gray-700/60 transition-colors group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20">
              <Link href="/admit-cards" className="text-sm font-bold text-[#047857] dark:text-emerald-400 hover:underline uppercase flex items-center justify-center gap-1">
                View More <span className="text-lg leading-none">&raquo;</span>
              </Link>
            </div>
          </motion.div>

          {/* Column 3: Latest Jobs */}
          <motion.div 
            custom={2}
            initial="hidden"
            animate="visible"
            variants={columnVariants}
            className="group bg-white/80 dark:bg-[#1E293B]/60 backdrop-blur-xl rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-blue-500/10 border border-white/60 dark:border-white/10 overflow-hidden flex flex-col transition-all duration-300 transform hover:-translate-y-1"
          >
             <div className="bg-gradient-to-r from-[#1D4ED8] to-[#1E3A8A] text-white text-center py-3.5 font-bold text-xl uppercase tracking-wider relative overflow-hidden">
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              Latest Jobs
            </div>
            <ul className="flex-1 px-3 py-2 space-y-1 text-[15px] font-semibold">
              {latestJobs.map((item, index) => (
                <motion.li variants={itemVariants} key={index} className="border-b border-gray-100 dark:border-white/5 last:border-0">
                  <Link href={item.href} className="block py-2.5 px-3 text-blue-700 dark:text-blue-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-50/50 dark:hover:bg-white/5 rounded-lg transition-all duration-200">
                     <span className="relative inline-block hover:translate-x-1 hover:-translate-y-px transition-transform duration-200">{item.title}</span>
                  </Link>
                </motion.li>
              ))}
            </ul>
             <div className="bg-gray-50/80 dark:bg-gray-800/80 text-center py-3 border-t border-gray-200/60 dark:border-gray-700/60 transition-colors group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20">
              <Link href="/jobs" className="text-sm font-bold text-[#1D4ED8] dark:text-blue-400 hover:underline uppercase flex items-center justify-center gap-1">
                View More <span className="text-lg leading-none">&raquo;</span>
              </Link>
            </div>
          </motion.div>

        </div>
        
        {/* Additional Grid (Answer Key, Syllabus, Admission, etc.) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-5 mt-8"
        >
          {/* Answer Key */}
          <div className="group bg-white/80 dark:bg-[#1E293B]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-white/10 overflow-hidden transform transition duration-300 hover:shadow-xl hover:-translate-y-1">
            <div className="bg-gradient-to-r from-[#D97706] to-[#92400E] text-white text-center py-2.5 font-bold text-[17px] uppercase tracking-wider relative">
               <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
               Answer Key
            </div>
            <div className="p-5 text-center flex flex-col items-center justify-center min-h-[110px]">
              <Link href="/answer-keys" className="text-[15px] font-bold text-blue-700 dark:text-blue-400 hover:text-red-600 dark:hover:text-red-400 hover:underline transition-all">SSC CGL Tier 1 Answer Key</Link>
              <Link href="/answer-keys" className="text-[13px] font-bold text-gray-500 dark:text-gray-400 hover:text-orange-600 mt-3 inline-block transition-colors border border-gray-200 dark:border-gray-700 px-3 py-1 rounded-full">View All</Link>
            </div>
          </div>

          {/* Syllabus */}
          <div className="group bg-white/80 dark:bg-[#1E293B]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-white/10 overflow-hidden transform transition duration-300 hover:shadow-xl hover:-translate-y-1">
            <div className="bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] text-white text-center py-2.5 font-bold text-[17px] uppercase tracking-wider relative">
               <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
               Syllabus
            </div>
            <div className="p-5 text-center flex flex-col items-center justify-center min-h-[110px]">
              <Link href="/syllabus" className="text-[15px] font-bold text-blue-700 dark:text-blue-400 hover:text-red-600 dark:hover:text-red-400 hover:underline transition-all">UP Police Constable Syllabus</Link>
              <Link href="/syllabus" className="text-[13px] font-bold text-gray-500 dark:text-gray-400 hover:text-purple-600 mt-3 inline-block transition-colors border border-gray-200 dark:border-gray-700 px-3 py-1 rounded-full">View All</Link>
            </div>
          </div>

          {/* Admission */}
          <div className="group bg-white/80 dark:bg-[#1E293B]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-white/10 overflow-hidden transform transition duration-300 hover:shadow-xl hover:-translate-y-1">
            <div className="bg-gradient-to-r from-[#0891B2] to-[#164E63] text-white text-center py-2.5 font-bold text-[17px] uppercase tracking-wider relative">
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              Admission
            </div>
             <div className="p-5 text-center flex flex-col items-center justify-center min-h-[110px]">
              <Link href="/admissions" className="text-[15px] font-bold text-blue-700 dark:text-blue-400 hover:text-red-600 dark:hover:text-red-400 hover:underline transition-all">NTA CUET UG 2025 Online Form</Link>
              <Link href="/admissions" className="text-[13px] font-bold text-gray-500 dark:text-gray-400 hover:text-cyan-600 mt-3 inline-block transition-colors border border-gray-200 dark:border-gray-700 px-3 py-1 rounded-full">View All</Link>
            </div>
          </div>

          {/* Certificate Form */}
          <div className="group bg-white/80 dark:bg-[#1E293B]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-white/10 overflow-hidden transform transition duration-300 hover:shadow-xl hover:-translate-y-1">
            <div className="bg-gradient-to-r from-[#BE185D] to-[#831843] text-white text-center py-2.5 font-bold text-[17px] uppercase tracking-wider relative">
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              Certificate Form
            </div>
             <div className="p-5 text-center flex flex-col items-center justify-center min-h-[110px]">
              <Link href="/certificates" className="text-[15px] font-bold text-blue-700 dark:text-blue-400 hover:text-red-600 dark:hover:text-red-400 hover:underline transition-all">PAN Card / Aadhar / Voter ID</Link>
              <Link href="/certificates" className="text-[13px] font-bold text-gray-500 dark:text-gray-400 hover:text-pink-600 mt-3 inline-block transition-colors border border-gray-200 dark:border-gray-700 px-3 py-1 rounded-full">View All</Link>
            </div>
          </div>

          {/* Important */}
          <div className="group bg-white/80 dark:bg-[#1E293B]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-white/10 overflow-hidden transform transition duration-300 hover:shadow-xl hover:-translate-y-1">
            <div className="bg-gradient-to-r from-[#4F46E5] to-[#312E81] text-white text-center py-2.5 font-bold text-[17px] uppercase tracking-wider relative">
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              Important
            </div>
            <div className="p-5 text-center flex flex-col items-center justify-center min-h-[110px]">
              <Link href="/important" className="text-[15px] font-bold text-blue-700 dark:text-blue-400 hover:text-red-600 dark:hover:text-red-400 hover:underline transition-all">UP Scholarship 2025 Online</Link>
              <Link href="/important" className="text-[13px] font-bold text-gray-500 dark:text-gray-400 hover:text-indigo-600 mt-3 inline-block transition-colors border border-gray-200 dark:border-gray-700 px-3 py-1 rounded-full">View All</Link>
            </div>
          </div>
        </motion.div>

        <motion.div
           initial={{ opacity: 0, y: 20 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           transition={{ duration: 0.8, delay: 0.3 }}
        >
          <AppDownloadBanner />
        </motion.div>

      </div>
    </div>
  );
}
