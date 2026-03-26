'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
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

// Mock job data
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

// Related jobs
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
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'current':
        return <Clock4 className="w-6 h-6 text-[#F97316]" />;
      default:
        return <Circle className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'current':
        return 'bg-[#F97316]';
      default:
        return 'bg-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0F172A]">
      {/* Breadcrumb */}
      <div className="bg-white dark:bg-[#1E293B] border-b dark:border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Link href="/" className="hover:text-[#F97316]">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <Link href="/jobs" className="hover:text-[#F97316]">Jobs</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 dark:text-white font-medium">{jobData.title}</span>
          </div>
        </div>
      </div>

      {/* Header Section */}
      <section className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white py-8">
        <div className="container mx-auto px-4">
          <Link href="/jobs" className="inline-flex items-center text-gray-400 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Jobs
          </Link>
          
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-16 h-16 rounded-2xl bg-[#F97316]/20 flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-[#F97316]" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold">{jobData.title}</h1>
                  <p className="text-gray-400">{jobData.organization}</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge className="bg-[#F97316]">{jobData.department}</Badge>
                <Badge variant="outline" className="border-white/20 text-white">
                  <MapPin className="w-3 h-3 mr-1" />
                  {jobData.location}
                </Badge>
                <Badge variant="outline" className="border-white/20 text-white">
                  <Briefcase className="w-3 h-3 mr-1" />
                  {jobData.posts.toLocaleString()} Posts
                </Badge>
                {jobData.isHot && (
                  <Badge className="bg-red-500">Hot Job</Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Posted: {new Date(jobData.notificationDate).toLocaleDateString('en-IN')}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {getDaysLeft(jobData.applicationEnd) > 0 
                    ? `${getDaysLeft(jobData.applicationEnd)} days left` 
                    : 'Closing soon'}
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => setIsBookmarked(!isBookmarked)}
                className={`border-white/20 ${isBookmarked ? 'text-[#F97316]' : 'text-white'}`}
              >
                <Bookmark className={`w-5 h-5 mr-2 ${isBookmarked ? 'fill-current' : ''}`} />
                {isBookmarked ? 'Saved' : 'Save'}
              </Button>
              <Button variant="outline" size="lg" className="border-white/20 text-white">
                <Share2 className="w-5 h-5 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="lg" className="border-white/20 text-white">
                <Bell className="w-5 h-5 mr-2" />
                Alert
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Main Info */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full justify-start mb-6 bg-white dark:bg-[#1E293B] p-1 rounded-xl">
                  <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
                  <TabsTrigger value="eligibility" className="rounded-lg">Eligibility</TabsTrigger>
                  <TabsTrigger value="how-to-apply" className="rounded-lg">How to Apply</TabsTrigger>
                  <TabsTrigger value="timeline" className="rounded-lg">Timeline</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-0">
                  <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-gray-200 dark:border-white/10">
                    <h2 className="text-xl font-semibold mb-4">About this Job</h2>
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">{jobData.description}</p>
                    </div>
                    
                    <div className="mt-6 grid md:grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Posts</p>
                        <p className="text-2xl font-bold text-[#F97316]">{jobData.posts.toLocaleString()}</p>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Job Type</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{jobData.type}</p>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Salary Range</p>
                        <p className="text-2xl font-bold text-green-600">{jobData.salary}</p>
                        <p className="text-xs text-gray-500">{jobData.salaryDetails}</p>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Application Fee</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{jobData.applicationFee}</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="eligibility" className="mt-0">
                  <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-gray-200 dark:border-white/10">
                    <h2 className="text-xl font-semibold mb-4">Eligibility Criteria</h2>
                    <div className="space-y-4">
                      {jobData.eligibility.map((item, index) => (
                        <div key={index} className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                          <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{item.category}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{item.details}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="how-to-apply" className="mt-0">
                  <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-gray-200 dark:border-white/10">
                    <h2 className="text-xl font-semibold mb-4">How to Apply</h2>
                    <div className="space-y-3">
                      {jobData.howToApply.map((step, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#F97316]/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-semibold text-[#F97316]">{index + 1}</span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 pt-1">{step}</p>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                      <p className="text-sm text-orange-800 dark:text-orange-200">
                        <AlertCircle className="w-4 h-4 inline mr-1" />
                        <strong>Important:</strong> Keep your registration number and password safe. Take a screenshot of the confirmation page after submitting the application.
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="timeline" className="mt-0">
                  <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-gray-200 dark:border-white/10">
                    <h2 className="text-xl font-semibold mb-6">Important Dates Timeline</h2>
                    
                    {/* Visual Timeline */}
                    <div className="relative">
                      {/* Timeline Line */}
                      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-white/10" />
                      
                      <div className="space-y-6">
                        {timelineEvents.map((event, index) => (
                          <motion.div 
                            key={event.type}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="relative flex gap-4"
                          >
                            {/* Timeline Dot */}
                            <div className={`w-12 h-12 rounded-full ${getStatusColor(event.status)} flex items-center justify-center flex-shrink-0 z-10`}>
                              {getStatusIcon(event.status)}
                            </div>
                            
                            {/* Event Card */}
                            <div className={`flex-1 p-4 rounded-xl border ${
                              event.status === 'current' 
                                ? 'border-[#F97316] bg-[#F97316]/5' 
                                : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5'
                            }`}>
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div>
                                  <h3 className="font-semibold text-gray-900 dark:text-white">{event.title}</h3>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">{event.description}</p>
                                </div>
                                <div className="text-right">
                                  <p className={`font-semibold ${
                                    event.status === 'current' ? 'text-[#F97316]' : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {new Date(event.date).toLocaleDateString('en-IN', { 
                                      day: 'numeric', 
                                      month: 'short', 
                                      year: 'numeric' 
                                    })}
                                  </p>
                                  {event.isDeadline && getDaysLeft(event.date) > 0 && (
                                    <p className="text-xs text-red-500">
                                      {getDaysLeft(event.date)} days left
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              {event.action && event.status === 'current' && (
                                <Button 
                                  className="mt-3 bg-[#F97316] hover:bg-[#EA580C]"
                                  size="sm"
                                >
                                  {event.action.label}
                                  <ExternalLink className="w-4 h-4 ml-1" />
                                </Button>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Documents Required */}
              <div className="mt-6 bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-gray-200 dark:border-white/10">
                <h2 className="text-xl font-semibold mb-4">Documents Required</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {jobData.documents.map((doc, index) => (
                    <div key={index} className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <FileText className="w-4 h-4 text-[#F97316]" />
                      <span>{doc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Apply Card */}
              <div className="bg-gradient-to-br from-[#F97316] to-[#EA580C] rounded-2xl p-6 text-white">
                <h3 className="text-lg font-semibold mb-2">Ready to Apply?</h3>
                <p className="text-white/80 text-sm mb-4">
                  {getDaysLeft(jobData.applicationEnd) > 0 
                    ? `Application closes in ${getDaysLeft(jobData.applicationEnd)} days`
                    : 'Application closing soon!'}
                </p>
                <Button className="w-full bg-white text-[#F97316] hover:bg-white/90">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Apply Online
                </Button>
              </div>

              {/* Important Links */}
              <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-gray-200 dark:border-white/10">
                <h3 className="font-semibold mb-4">Important Links</h3>
                <div className="space-y-2">
                  {jobData.importantLinks.map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                        link.isPrimary 
                          ? 'bg-[#F97316]/10 text-[#F97316] hover:bg-[#F97316]/20' 
                          : 'bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10'
                      }`}
                    >
                      <span className="font-medium">{link.name}</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              </div>

              {/* Selection Process */}
              <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-gray-200 dark:border-white/10">
                <h3 className="font-semibold mb-4">Selection Process</h3>
                <div className="space-y-3">
                  {jobData.selectionProcess.map((step, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-sm font-semibold">
                        {index + 1}
                      </div>
                      <span className="text-gray-600 dark:text-gray-400">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Related Jobs */}
              <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-gray-200 dark:border-white/10">
                <h3 className="font-semibold mb-4">Similar Jobs</h3>
                <div className="space-y-3">
                  {relatedJobs.map((job) => (
                    <Link key={job.id} href={`/jobs/${job.id}`}>
                      <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{job.title}</p>
                        <p className="text-xs text-gray-500">{job.organization}</p>
                        <p className="text-xs text-[#F97316] mt-1">{job.posts.toLocaleString()} Posts</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
