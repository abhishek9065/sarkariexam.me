'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, 
  MapPin, 
  Briefcase, 
  Calendar, 
  Clock,
  Bookmark,
  Share2,
  Bell,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowLeft,
  ExternalLink,
  ChevronRight,
  CheckCircle,
  Circle,
  Clock4
} from 'lucide-react';

// Mock job data (preserved exactly)
const jobData = {
  id: '1',
  title: 'RRB NTPC Recruitment 2026',
  organization: 'Railway Recruitment Board',
  department: 'Railway',
  location: 'All India',
  posts: 35000,
  type: 'Full Time',
  salary: '₹35,000 - ₹1,50,000',
  salaryDetails: 'Level 2-6 as per 7th CPC',
  qualification: '10th, 12th, Graduate',
  ageLimit: '18-33 years',
  ageRelaxation: 'OBC: 3 years, SC/ST: 5 years, PWD: 10 years',
  applicationFee: '₹500 (General/OBC), ₹250 (SC/ST/PWD/Women)',
  selectionProcess: ['CBT Stage 1', 'CBT Stage 2', 'Typing Test (if applicable)', 'Document Verification', 'Medical Examination'],
  notificationDate: '2026-02-01',
  applicationStart: '2026-02-15',
  applicationEnd: '2026-04-15',
  examDate: '2026-06-15',
  admitCardDate: '2026-06-05',
  resultDate: '2026-08-20',
  description: `Railway Recruitment Board (RRB) has announced a massive recruitment drive for Non-Technical Popular Categories (NTPC) posts. This is a golden opportunity for candidates aspiring to work in Indian Railways.

The recruitment includes various posts such as:
- Commercial Apprentice (CA)
- Traffic Apprentice (TA)
- Goods Guard
- Junior Clerk cum Typist
- Accounts Clerk cum Typist
- Senior Clerk cum Typist
- Station Master (SM)
- Junior Account Assistant cum Typist (JAA)
- Senior Time Keeper`,
  eligibility: [
    { category: 'Educational Qualification', details: '10th, 12th, or Graduate from recognized board/university' },
    { category: 'Age Limit', details: '18-33 years as on 01.01.2026' },
    { category: 'Age Relaxation', details: 'As per government norms - OBC: 3 years, SC/ST: 5 years, PWD: 10 years' },
    { category: 'Nationality', details: 'Indian citizen or subjects of Nepal/Bhutan or Tibetan refugee' },
  ],
  howToApply: [
    'Visit the official RRB website',
    'Click on the NTPC 2026 recruitment link',
    'Register with your email and mobile number',
    'Fill in the application form with accurate details',
    'Upload scanned documents (photo, signature, certificates)',
    'Pay the application fee online',
    'Submit the application and take a printout',
  ],
  importantLinks: [
    { name: 'Apply Online', url: '#', isPrimary: true },
    { name: 'Official Notification', url: '#', isPrimary: false },
    { name: 'Syllabus PDF', url: '#', isPrimary: false },
    { name: 'Previous Year Papers', url: '#', isPrimary: false },
  ],
  documents: [
    '10th/12th/Graduation Marksheet',
    'Category Certificate (if applicable)',
    'PWD Certificate (if applicable)',
    'Recent Passport Size Photo',
    'Scanned Signature',
    'Valid ID Proof (Aadhaar/PAN/Voter ID)',
  ],
  isHot: true,
  isActive: true,
};

// Timeline events
const timelineEvents = [
  {
    type: 'notification',
    title: 'Notification Released',
    date: jobData.notificationDate,
    status: 'completed',
    description: 'Official notification published',
  },
  {
    type: 'application_start',
    title: 'Application Starts',
    date: jobData.applicationStart,
    status: 'completed',
    description: 'Online application portal opens',
    action: { label: 'Apply Now', href: '#' },
  },
  {
    type: 'application_end',
    title: 'Last Date to Apply',
    date: jobData.applicationEnd,
    status: 'current',
    description: 'Application portal closes',
    isDeadline: true,
  },
  {
    type: 'admit_card',
    title: 'Admit Card Release',
    date: jobData.admitCardDate,
    status: 'upcoming',
    description: 'Download hall ticket',
  },
  {
    type: 'exam',
    title: 'Exam Date',
    date: jobData.examDate,
    status: 'upcoming',
    description: 'CBT Stage 1 Examination',
  },
  {
    type: 'result',
    title: 'Result Declaration',
    date: jobData.resultDate,
    status: 'upcoming',
    description: 'Stage 1 results announced',
  },
];

const relatedJobs = [
  {
    id: '2',
    title: 'RRB Group D 2026',
    organization: 'Railway Recruitment Board',
    posts: 50000,
    lastDate: '2026-03-30',
  },
  {
    id: '3',
    title: 'SSC CGL 2026',
    organization: 'Staff Selection Commission',
    posts: 45000,
    lastDate: '2026-04-30',
  },
];

const NOW_TIMESTAMP = Date.now();
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export default function JobDetailPage() {
  const [isBookmarked, setIsBookmarked] = useState(false);

  const getDaysLeft = (date: string) => {
    const days = Math.ceil((new Date(date).getTime() - NOW_TIMESTAMP) / MS_PER_DAY);
    return days;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-emerald-500" />;
      case 'current':
        return <Clock4 className="w-6 h-6 text-[#F97316] drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" />;
      default:
        return <Circle className="w-6 h-6 text-gray-400 opacity-50" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30';
      case 'current':
        return 'bg-orange-500/20 text-[#F97316] border border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.3)] animate-pulse';
      default:
        return 'bg-gray-200/50 dark:bg-gray-800/50 text-gray-400 border border-transparent';
    }
  };

  return (
    <div className="relative min-h-screen bg-gray-50/50 dark:bg-[#090D14] font-sans pb-16 overflow-hidden">
      
      {/* 2026 Premium Animated Background Elements */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-orange-100/40 to-transparent dark:from-orange-900/10 dark:to-transparent pointer-events-none z-0" />
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-orange-400/20 dark:bg-orange-600/10 blur-[130px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute top-[30%] left-[-10%] w-[35%] h-[35%] rounded-full bg-blue-400/10 dark:bg-blue-600/10 blur-[130px] pointer-events-none" />

      {/* Breadcrumb Layer */}
      <div className="relative z-20 bg-white/60 dark:bg-[#0F172A]/60 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/5 sticky top-0">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 font-medium">
            <Link href="/" className="hover:text-[#F97316] transition-colors">Home</Link>
            <ChevronRight className="w-4 h-4 opacity-50" />
            <Link href="/jobs" className="hover:text-[#F97316] transition-colors">Jobs</Link>
            <ChevronRight className="w-4 h-4 opacity-50" />
            <span className="text-gray-900 dark:text-white truncate max-w-[150px] sm:max-w-none">{jobData.title}</span>
          </div>
        </div>
      </div>

      {/* Header Section Premium */}
      <section className="relative z-10 pt-10 pb-12 sm:pb-16 px-2 sm:px-4">
        <div className="container mx-auto max-w-[1200px]">
          <Link href="/jobs" className="inline-flex items-center text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 mb-6 font-semibold transition-colors group">
            <ArrowLeft className="w-4 h-4 mr-2 transform group-hover:-translate-x-1 transition-transform" />
            Back to Jobs
          </Link>
          
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.5 }}
               className="flex-1"
            >
              <div className="flex items-center gap-4 sm:gap-6 mb-5">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-orange-100 to-red-50 dark:from-orange-500/20 dark:to-red-500/10 flex items-center justify-center shadow-lg border border-orange-200/50 dark:border-orange-500/20 shrink-0 transform hover:scale-105 hover:rotate-3 transition-all duration-300">
                  <Building2 className="w-8 h-8 sm:w-10 sm:h-10 text-[#F97316]" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2 leading-tight">
                    {jobData.title}
                  </h1>
                  <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 font-medium">{jobData.organization}</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 sm:gap-3 mb-6">
                <Badge className="bg-gradient-to-r from-orange-500 to-[#F97316] text-white px-3 py-1 shadow-md hover:shadow-lg transition-shadow border-0">{jobData.department}</Badge>
                <Badge variant="outline" className="bg-white/50 dark:bg-[#1E293B]/50 backdrop-blur-md border border-gray-300/50 dark:border-white/10 text-gray-800 dark:text-gray-200 px-3 py-1">
                  <MapPin className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                  {jobData.location}
                </Badge>
                <Badge variant="outline" className="bg-white/50 dark:bg-[#1E293B]/50 backdrop-blur-md border border-gray-300/50 dark:border-white/10 text-gray-800 dark:text-gray-200 px-3 py-1">
                  <Briefcase className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                  {jobData.posts.toLocaleString()} Posts
                </Badge>
                {jobData.isHot && (
                  <Badge className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-3 py-1 shadow-[0_0_15px_rgba(225,29,72,0.4)] border-0 animate-pulse">🔥 Hot Job</Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-6 text-[15px] font-medium text-gray-500 dark:text-gray-400 bg-white/40 dark:bg-white/5 backdrop-blur-sm inline-flex px-4 py-2.5 rounded-xl border border-gray-200/50 dark:border-white/5">
                <span className="flex items-center gap-2">
                  <Calendar className="w-4.5 h-4.5 text-blue-500" />
                  Posted: {new Date(jobData.notificationDate).toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'})}
                </span>
                <span className="w-px h-5 bg-gray-300 dark:bg-gray-700 hidden sm:block" />
                <span className="flex items-center gap-2">
                  <Clock className="w-4.5 h-4.5 text-orange-500" />
                  {getDaysLeft(jobData.applicationEnd) > 0 
                    ? <span className="text-gray-900 dark:text-gray-200 font-bold">{getDaysLeft(jobData.applicationEnd)} days left</span> 
                    : <span className="text-red-500 font-bold">Closing soon</span>}
                </span>
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ duration: 0.5, delay: 0.1 }}
               className="flex flex-row flex-wrap sm:flex-nowrap lg:flex-col gap-3 shrink-0"
            >
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => setIsBookmarked(!isBookmarked)}
                className={`bg-white/60 dark:bg-[#1E293B]/60 backdrop-blur-xl border ${isBookmarked ? 'border-orange-500 text-[#F97316] bg-orange-50 dark:bg-orange-500/10 shadow-md' : 'border-gray-300 dark:border-white/10 text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10'} rounded-xl transition-all duration-300 flex-1 sm:flex-auto justify-start px-6 font-semibold`}
              >
                <Bookmark className={`w-5 h-5 mr-3 transition-all duration-300 ${isBookmarked ? 'fill-current scale-110' : ''}`} />
                {isBookmarked ? 'Saved to Profile' : 'Save for Later'}
              </Button>
              <Button variant="outline" size="lg" className="bg-white/60 dark:bg-[#1E293B]/60 backdrop-blur-xl border border-gray-300 dark:border-white/10 text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-all duration-300 flex-1 sm:flex-auto justify-start px-6 font-semibold">
                <Share2 className="w-5 h-5 mr-3 text-blue-500" />
                Share
              </Button>
              <Button variant="outline" size="lg" className="bg-white/60 dark:bg-[#1E293B]/60 backdrop-blur-xl border border-gray-300 dark:border-white/10 text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-all duration-300 flex-1 sm:flex-auto justify-start px-6 font-semibold">
                <Bell className="w-5 h-5 mr-3 text-emerald-500" />
                Get Alert
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="relative z-10 px-2 sm:px-4">
        <div className="container mx-auto max-w-[1200px]">
          <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
            
            {/* Left Column - Main Info */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full justify-start mb-8 bg-white/60 dark:bg-[#1E293B]/60 backdrop-blur-xl p-1.5 rounded-2xl border border-gray-200/50 dark:border-white/5 shadow-sm overflow-x-auto overflow-y-hidden hide-scrollbar">
                  <TabsTrigger value="overview" className="rounded-xl px-4 sm:px-6 py-2.5 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-[#0F172A] data-[state=active]:text-[#F97316] data-[state=active]:shadow-sm transition-all text-sm sm:text-[15px]">Overview</TabsTrigger>
                  <TabsTrigger value="eligibility" className="rounded-xl px-4 sm:px-6 py-2.5 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-[#0F172A] data-[state=active]:text-[#F97316] data-[state=active]:shadow-sm transition-all text-sm sm:text-[15px]">Eligibility</TabsTrigger>
                  <TabsTrigger value="how-to-apply" className="rounded-xl px-4 sm:px-6 py-2.5 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-[#0F172A] data-[state=active]:text-[#F97316] data-[state=active]:shadow-sm transition-all text-sm sm:text-[15px]">How to Apply</TabsTrigger>
                  <TabsTrigger value="timeline" className="rounded-xl px-4 sm:px-6 py-2.5 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-[#0F172A] data-[state=active]:text-[#F97316] data-[state=active]:shadow-sm transition-all text-sm sm:text-[15px]">Timeline</TabsTrigger>
                </TabsList>

                {/* Overvew Content */}
                <TabsContent value="overview" className="mt-0 outline-none">
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ duration: 0.4 }} 
                    className="bg-white/80 dark:bg-[#1E293B]/80 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 border border-white/50 dark:border-white/10 shadow-xl"
                  >
                    <h2 className="text-2xl font-bold mb-5 flex items-center text-gray-900 dark:text-white">
                      <span className="w-2 h-6 rounded-full bg-gradient-to-b from-[#F97316] to-red-600 mr-3 block"/>
                      About this Job
                    </h2>
                    <div className="prose dark:prose-invert max-w-none prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-p:font-medium text-[15px] sm:text-[16px]">
                      <p className="whitespace-pre-line leading-relaxed">{jobData.description}</p>
                    </div>
                    
                    <div className="mt-8 grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6">
                      <div className="p-5 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/40 dark:to-[#1E293B]/40 rounded-2xl border border-gray-100 dark:border-white/5 hover:border-orange-200 dark:hover:border-orange-500/30 transition-colors shadow-sm">
                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center"><Briefcase className="w-4 h-4 mr-1.5 opacity-70"/> Total Posts</p>
                        <p className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600 drop-shadow-sm">{jobData.posts.toLocaleString()}</p>
                      </div>
                      <div className="p-5 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/40 dark:to-[#1E293B]/40 rounded-2xl border border-gray-100 dark:border-white/5 hover:border-blue-200 dark:hover:border-blue-500/30 transition-colors shadow-sm">
                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center"><Building2 className="w-4 h-4 mr-1.5 opacity-70"/> Job Type</p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white drop-shadow-sm">{jobData.type}</p>
                      </div>
                      <div className="p-5 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/40 dark:to-[#1E293B]/40 rounded-2xl border border-gray-100 dark:border-white/5 hover:border-emerald-200 dark:hover:border-emerald-500/30 transition-colors shadow-sm col-span-2 sm:col-span-1">
                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center"><span className="font-sans mr-1.5 opacity-70 font-bold">₹</span> Salary Range</p>
                        <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 drop-shadow-sm">{jobData.salary}</p>
                        <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">{jobData.salaryDetails}</p>
                      </div>
                      <div className="p-5 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/40 dark:to-[#1E293B]/40 rounded-2xl border border-gray-100 dark:border-white/5 hover:border-purple-200 dark:hover:border-purple-500/30 transition-colors shadow-sm col-span-2 sm:col-span-1">
                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center"><FileText className="w-4 h-4 mr-1.5 opacity-70"/> Application Fee</p>
                        <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white drop-shadow-sm">{jobData.applicationFee}</p>
                      </div>
                    </div>
                  </motion.div>
                </TabsContent>

                {/* Eligibility Content */}
                <TabsContent value="eligibility" className="mt-0 outline-none">
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                    className="bg-white/80 dark:bg-[#1E293B]/80 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 border border-white/50 dark:border-white/10 shadow-xl"
                  >
                    <h2 className="text-2xl font-bold mb-5 flex items-center text-gray-900 dark:text-white">
                      <span className="w-2 h-6 rounded-full bg-gradient-to-b from-[#F97316] to-red-600 mr-3 block"/>
                      Eligibility Criteria
                    </h2>
                    <div className="space-y-4">
                      {jobData.eligibility.map((item, index) => (
                        <motion.div 
                          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}
                          key={index} 
                          className="flex items-start gap-4 p-5 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/30 dark:to-[#1E293B]/50 rounded-2xl border border-gray-100 dark:border-white/5 hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5 group"
                        >
                          <div className="bg-emerald-100 dark:bg-emerald-500/20 p-2 rounded-xl group-hover:scale-110 transition-transform">
                            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-lg font-bold text-gray-900 dark:text-white mb-1 tracking-tight">{item.category}</p>
                            <p className="text-[15px] font-medium text-gray-600 dark:text-gray-300">{item.details}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </TabsContent>

                {/* How to Apply Content */}
                <TabsContent value="how-to-apply" className="mt-0 outline-none">
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                    className="bg-white/80 dark:bg-[#1E293B]/80 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 border border-white/50 dark:border-white/10 shadow-xl"
                  >
                    <h2 className="text-2xl font-bold mb-6 flex items-center text-gray-900 dark:text-white">
                      <span className="w-2 h-6 rounded-full bg-gradient-to-b from-[#F97316] to-red-600 mr-3 block"/>
                      How to Apply
                    </h2>
                    <div className="space-y-4">
                      {jobData.howToApply.map((step, index) => (
                        <motion.div 
                          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}
                          key={index} className="flex items-start gap-4 p-2"
                        >
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-100 to-red-50 dark:from-orange-500/20 dark:to-red-500/10 flex items-center justify-center flex-shrink-0 border border-orange-200/50 dark:border-orange-500/20 shadow-sm mt-0.5 shadow-orange-500/10">
                            <span className="text-[16px] font-black text-transparent bg-clip-text bg-gradient-to-b from-orange-600 to-red-600 dark:from-orange-400 dark:to-red-400">{index + 1}</span>
                          </div>
                          <p className="text-[16px] font-medium text-gray-700 dark:text-gray-300 pt-1.5">{step}</p>
                        </motion.div>
                      ))}
                    </div>
                    
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}
                      className="mt-8 p-5 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/10 dark:to-red-900/10 rounded-2xl border-l-4 border-[#F97316] shadow-sm relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                        <AlertCircle className="w-24 h-24" />
                      </div>
                      <p className="text-[15px] font-medium text-orange-900 dark:text-orange-200 relative z-10 leading-relaxed">
                        <AlertCircle className="w-5 h-5 inline mr-2 -mt-1 text-[#F97316]" />
                        <strong className="text-black dark:text-white text-[16px]">Important:</strong> Keep your registration number and password safe. Take a screenshot of the confirmation page after submitting the application.
                      </p>
                    </motion.div>
                  </motion.div>
                </TabsContent>

                {/* Timeline Content */}
                <TabsContent value="timeline" className="mt-0 outline-none">
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                    className="bg-white/80 dark:bg-[#1E293B]/80 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 border border-white/50 dark:border-white/10 shadow-xl"
                  >
                    <h2 className="text-2xl font-bold mb-8 flex items-center text-gray-900 dark:text-white">
                      <span className="w-2 h-6 rounded-full bg-gradient-to-b from-[#F97316] to-red-600 mr-3 block"/>
                      Important Dates Timeline
                    </h2>
                    
                    <div className="relative pl-2 sm:pl-4">
                      {/* Timeline Line with Gradient */}
                      <div className="absolute left-8 sm:left-10 top-4 bottom-4 w-1 bg-gradient-to-b from-emerald-400 via-orange-400 to-gray-200 dark:to-gray-800 rounded-full opacity-50 z-0" />
                      
                      <div className="space-y-8 relative z-10">
                        {timelineEvents.map((event, index) => (
                          <motion.div 
                            key={event.type}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1, duration: 0.5, type: 'spring' }}
                            className="relative flex gap-5 sm:gap-6 group"
                          >
                            {/* Timeline Dot */}
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 z-10 shadow-lg backdrop-blur-md transform transition-transform duration-300 group-hover:scale-110 ${getStatusColor(event.status)}`}>
                              {getStatusIcon(event.status)}
                            </div>
                            
                            {/* Event Card */}
                            <div className={`flex-1 p-5 rounded-2xl border backdrop-blur-md transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg ${
                              event.status === 'current' 
                                ? 'border-[#F97316]/50 bg-gradient-to-r from-orange-50/80 to-white/80 dark:from-orange-500/10 dark:to-[#1E293B]/80 shadow-[0_4px_20px_rgba(249,115,22,0.1)]' 
                                : 'border-gray-200/60 dark:border-white/10 bg-white/60 dark:bg-white/5'
                            }`}>
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div>
                                  <h3 className={`font-bold tracking-tight text-[17px] ${event.status === 'current' ? 'text-gray-900 dark:text-white' : 'text-gray-800 dark:text-gray-200'}`}>{event.title}</h3>
                                  <p className="text-[15px] font-medium text-gray-500 dark:text-gray-400 mt-0.5">{event.description}</p>
                                </div>
                                <div className="text-left sm:text-right">
                                  <p className={`font-black text-[16px] ${
                                    event.status === 'current' ? 'text-[#F97316]' : 'text-gray-700 dark:text-gray-300'
                                  }`}>
                                    {new Date(event.date).toLocaleDateString('en-IN', { 
                                      day: 'numeric', 
                                      month: 'short', 
                                      year: 'numeric' 
                                    })}
                                  </p>
                                  {event.isDeadline && getDaysLeft(event.date) > 0 && (
                                    <Badge variant="outline" className="text-xs text-red-500 border-red-200 bg-red-50 mt-1.5 sm:mt-1 animate-pulse dark:bg-red-500/10 dark:border-red-500/20">
                                      {getDaysLeft(event.date)} days left
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              {event.action && event.status === 'current' && (
                                <Button 
                                  className="mt-4 bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white shadow-lg shadow-orange-500/30 border-0 rounded-xl"
                                  size="sm"
                                >
                                  {event.action.label}
                                  <ExternalLink className="w-4 h-4 ml-2" />
                                </Button>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </TabsContent>
              </Tabs>

              {/* Documents Required */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-8 bg-white/80 dark:bg-[#1E293B]/80 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 border border-white/50 dark:border-white/10 shadow-xl"
              >
                <h2 className="text-2xl font-bold mb-6 flex items-center text-gray-900 dark:text-white">
                   <span className="w-2 h-6 rounded-full bg-gradient-to-b from-[#F97316] to-red-600 mr-3 block"/>
                   Documents Required
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {jobData.documents.map((doc, index) => (
                    <div key={index} className="flex items-center gap-3 bg-gray-50/80 dark:bg-gray-800/40 p-3.5 rounded-xl border border-gray-100 dark:border-white/5 text-[15px] font-medium text-gray-700 dark:text-gray-300 hover:border-orange-200 dark:hover:border-orange-500/30 transition-colors">
                      <div className="bg-orange-100 dark:bg-orange-500/20 p-1.5 rounded-lg shrink-0">
                        <FileText className="w-4.5 h-4.5 text-[#F97316]" />
                      </div>
                      <span>{doc}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6 sm:space-y-8">
              
              {/* Apply Card - Premium */}
              <div className="bg-gradient-to-br from-[#F97316] via-[#EA580C] to-red-600 rounded-3xl p-8 text-white shadow-2xl shadow-orange-500/20 relative overflow-hidden group transform hover:-translate-y-1 transition-all duration-300">
                <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-white/10 blur-2xl rounded-full z-0 group-hover:scale-150 transition-transform duration-700" />
                <h3 className="text-2xl font-extrabold mb-2 relative z-10 tracking-tight">Ready to Apply?</h3>
                <p className="text-white/90 text-[15px] font-medium mb-6 relative z-10">
                  {getDaysLeft(jobData.applicationEnd) > 0 
                    ? `Application closes in ${getDaysLeft(jobData.applicationEnd)} days`
                    : 'Application closing soon!'}
                </p>
                <Button className="w-full bg-white text-orange-600 hover:bg-gray-50 shadow-lg text-[16px] font-bold py-6 rounded-xl relative z-10 transform active:scale-95 transition-all">
                  Apply Online Now
                  <ExternalLink className="w-5 h-5 ml-2" />
                </Button>
              </div>

              {/* Important Links */}
              <div className="bg-white/80 dark:bg-[#1E293B]/80 backdrop-blur-2xl rounded-3xl p-6 sm:p-7 border border-white/50 dark:border-white/10 shadow-xl">
                <h3 className="text-xl font-bold mb-5 text-gray-900 dark:text-white tracking-tight">Important Links</h3>
                <div className="space-y-3">
                  {jobData.importantLinks.map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      className={`flex items-center justify-between p-4 rounded-2xl transition-all duration-300 border ${
                        link.isPrimary 
                          ? 'bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-500/10 dark:to-red-500/10 border-orange-200 dark:border-orange-500/30 hover:border-orange-400 dark:hover:border-orange-500/60 shadow-sm text-orange-700 dark:text-orange-400' 
                          : 'bg-gray-50/80 dark:bg-gray-800/40 border-gray-100 dark:border-white/5 hover:border-blue-200 dark:hover:border-blue-500/30 hover:bg-white dark:hover:bg-[#1E293B] hover:shadow-sm text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span className="font-bold text-[15px]">{link.name}</span>
                      <ExternalLink className={`w-4.5 h-4.5 ${link.isPrimary ? '' : 'opacity-60'}`} />
                    </a>
                  ))}
                </div>
              </div>

              {/* Selection Process */}
              <div className="bg-white/80 dark:bg-[#1E293B]/80 backdrop-blur-2xl rounded-3xl p-6 sm:p-7 border border-white/50 dark:border-white/10 shadow-xl">
                <h3 className="text-xl font-bold mb-5 text-gray-900 dark:text-white tracking-tight">Selection Process</h3>
                <div className="space-y-4">
                  {jobData.selectionProcess.map((step, index) => (
                    <div key={index} className="flex items-center gap-4 group">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-[15px] font-black text-gray-600 dark:text-gray-300 shadow-inner group-hover:from-orange-100 group-hover:to-red-100 dark:group-hover:from-orange-500/30 dark:group-hover:to-red-500/20 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                        {index + 1}
                      </div>
                      <span className="text-[15px] font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Related Jobs */}
              <div className="bg-white/80 dark:bg-[#1E293B]/80 backdrop-blur-2xl rounded-3xl p-6 sm:p-7 border border-white/50 dark:border-white/10 shadow-xl">
                <h3 className="text-xl font-bold mb-5 text-gray-900 dark:text-white tracking-tight">Similar Jobs</h3>
                <div className="space-y-3">
                  {relatedJobs.map((job) => (
                    <Link key={job.id} href={`/jobs/${job.id}`}>
                      <div className="p-4 bg-gray-50/80 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-white/5 hover:border-blue-200 dark:hover:border-blue-400/30 hover:shadow-md transition-all duration-300 group">
                        <p className="font-bold text-gray-900 dark:text-white text-[15px] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight mb-1.5">{job.title}</p>
                        <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400 line-clamp-1">{job.organization}</p>
                        <div className="flex items-center gap-3 mt-2.5">
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 text-xs px-2 py-0 border-0">{job.posts.toLocaleString()} Posts</Badge>
                          <span className="text-xs font-semibold text-gray-400 flex items-center"><Calendar className="w-3 h-3 mr-1"/> Ends {new Date(job.lastDate).toLocaleDateString('en-US', {month: 'short', day:'numeric'})}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Mobile Sticky Apply Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-[#0F172A]/80 backdrop-blur-xl border-t border-gray-200/50 dark:border-white/10 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
        <Button className="w-full bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white shadow-lg text-[16px] font-bold py-6 rounded-xl active:scale-[0.98] transition-all">
          Apply Online Now
          <ExternalLink className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
