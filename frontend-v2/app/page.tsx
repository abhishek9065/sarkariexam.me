'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Briefcase, 
  FileText, 
  CreditCard, 
  Key, 
  BookOpen,
  GraduationCap,
  TrendingUp,
  Clock,
  MapPin,
  Building2,
  ArrowRight,
  Bookmark,
  Bell
} from 'lucide-react';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.1 }
  }
};

const categories = [
  { name: 'Govt Jobs', href: '/jobs', icon: Briefcase, count: '12,500+', color: 'bg-blue-500' },
  { name: 'Results', href: '/results', icon: FileText, count: '850+', color: 'bg-green-500' },
  { name: 'Admit Cards', href: '/admit-cards', icon: CreditCard, count: '1,200+', color: 'bg-purple-500' },
  { name: 'Answer Keys', href: '/answer-keys', icon: Key, count: '600+', color: 'bg-orange-500' },
  { name: 'Syllabus', href: '/syllabus', icon: BookOpen, count: '2,300+', color: 'bg-pink-500' },
  { name: 'Admissions', href: '/admissions', icon: GraduationCap, count: '900+', color: 'bg-teal-500' },
];

const departments = [
  { name: 'Railway', jobs: '2,400+', icon: '🚂', href: '/jobs?department=Railway' },
  { name: 'Banking', jobs: '1,800+', icon: '🏦', href: '/jobs?department=Banking' },
  { name: 'SSC', jobs: '3,200+', icon: '📋', href: '/jobs?department=SSC' },
  { name: 'UPSC', jobs: '450+', icon: '🏛️', href: '/jobs?department=UPSC' },
  { name: 'Defence', jobs: '1,100+', icon: '🎖️', href: '/jobs?department=Defence' },
  { name: 'Teaching', jobs: '2,800+', icon: '🎓', href: '/jobs?department=Teaching' },
  { name: 'Police', jobs: '1,500+', icon: '👮', href: '/jobs?department=Police' },
  { name: 'Medical', jobs: '900+', icon: '🏥', href: '/jobs?department=Medical' },
];

const featuredJobs = [
  {
    id: '1',
    title: 'RRB NTPC Recruitment 2026',
    organization: 'Railway Recruitment Board',
    department: 'Railway',
    location: 'All India',
    posts: 35000,
    lastDate: '2026-04-15',
    type: 'Full Time',
    salary: '₹35,000 - ₹1,50,000',
    isHot: true,
  },
  {
    id: '2',
    title: 'IBPS PO/Clerk 2026',
    organization: 'Institute of Banking Personnel',
    department: 'Banking',
    location: 'All India',
    posts: 12000,
    lastDate: '2026-03-30',
    type: 'Full Time',
    salary: '₹35,000 - ₹65,000',
    isHot: true,
  },
  {
    id: '3',
    title: 'SSC CGL 2026',
    organization: 'Staff Selection Commission',
    department: 'SSC',
    location: 'All India',
    posts: 45000,
    lastDate: '2026-04-30',
    type: 'Full Time',
    salary: '₹44,900 - ₹1,42,400',
    isHot: false,
  },
  {
    id: '4',
    title: 'UPSC Civil Services 2026',
    organization: 'Union Public Service Commission',
    department: 'UPSC',
    location: 'All India',
    posts: 1200,
    lastDate: '2026-02-28',
    type: 'Full Time',
    salary: '₹56,100 - ₹2,50,000',
    isHot: true,
  },
];

const latestUpdates = [
  { type: 'result', title: 'SSC CHSL 2025 Tier 1 Result Declared', date: '2 hours ago', href: '/results/ssc-chsl-2025' },
  { type: 'admit', title: 'IBPS PO Mains Admit Card Released', date: '5 hours ago', href: '/admit-cards/ibps-po-mains' },
  { type: 'job', title: 'UP Police 50,000+ Constable Recruitment', date: '1 day ago', href: '/jobs/up-police-2026' },
  { type: 'answer', title: 'RRB Group D Answer Key 2026', date: '2 days ago', href: '/answer-keys/rrb-group-d-2026' },
];

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  const getDaysLeft = (lastDate: string) => {
    const days = Math.ceil((new Date(lastDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days > 0 ? `${days} days left` : 'Closing soon';
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#334155] text-white py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.4%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')]" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            className="max-w-4xl mx-auto text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div 
              className="flex flex-wrap justify-center gap-3 mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Badge variant="secondary" className="bg-white/10 text-white border-white/20">
                <TrendingUp className="w-3 h-3 mr-1" />
                50,000+ Active Jobs
              </Badge>
              <Badge variant="secondary" className="bg-white/10 text-white border-white/20">
                <Bell className="w-3 h-3 mr-1" />
                Daily Updates
              </Badge>
              <Badge variant="secondary" className="bg-white/10 text-white border-white/20">
                ✓ 100% Free
              </Badge>
            </motion.div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Find Your Dream{' '}
              <span className="text-[#F97316]">Government Job</span>
            </h1>
            
            <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              India&apos;s most trusted platform for Sarkari Naukri. Latest government job notifications, results, admit cards, and exam updates.
            </p>

            <motion.form 
              onSubmit={handleSearch}
              className="max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex gap-2 bg-white/10 backdrop-blur-sm p-2 rounded-2xl border border-white/20">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="search"
                    placeholder="Search jobs, departments, or locations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-12 pl-12 bg-transparent border-0 text-white placeholder:text-gray-400 text-lg"
                  />
                </div>
                <Button 
                  type="submit"
                  className="h-12 px-8 bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold rounded-xl"
                >
                  Search
                </Button>
              </div>
              
              <div className="flex flex-wrap justify-center gap-2 mt-4 text-sm">
                <span className="text-gray-400">Popular:</span>
                {['Railway', 'Banking', 'SSC', 'UPSC', 'Police'].map((term) => (
                  <Link
                    key={term}
                    href={`/search?q=${term}`}
                    className="text-white/70 hover:text-[#F97316] transition-colors"
                  >
                    {term}
                  </Link>
                ))}
              </div>
            </motion.form>
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white" className="dark:fill-[#0F172A]"/>
          </svg>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 bg-white dark:bg-[#0F172A]">
        <div className="container mx-auto px-4">
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {categories.map((category) => (
              <motion.div key={category.name} variants={fadeInUp}>
                <Link href={category.href}>
                  <div className="group flex flex-col items-center p-6 rounded-2xl bg-gray-50 dark:bg-white/5 hover:bg-[#F97316]/10 dark:hover:bg-[#F97316]/20 transition-all duration-300 border border-gray-100 dark:border-white/10 hover:border-[#F97316]/30">
                    <div className={`w-14 h-14 rounded-xl ${category.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                      <category.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{category.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{category.count}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Departments */}
      <section className="py-16 bg-gray-50 dark:bg-[#1E293B]">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Popular Departments</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Browse jobs by government department</p>
            </div>
            <Link href="/jobs" className="text-[#F97316] hover:text-[#EA580C] font-medium flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {departments.map((dept) => (
              <motion.div key={dept.name} variants={fadeInUp}>
                <Link href={dept.href}>
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-white/10 hover:border-[#F97316]/50 hover:shadow-lg transition-all">
                    <span className="text-3xl">{dept.icon}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{dept.name}</h3>
                      <p className="text-sm text-[#F97316]">{dept.jobs}</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Featured Jobs */}
      <section className="py-16 bg-white dark:bg-[#0F172A]">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Featured Jobs</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Latest and most popular government vacancies</p>
            </div>
            <Link href="/jobs" className="text-[#F97316] hover:text-[#EA580C] font-medium flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <motion.div 
            className="grid md:grid-cols-2 gap-6"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {featuredJobs.map((job) => (
              <motion.div 
                key={job.id} 
                variants={fadeInUp}
                className="group"
              >
                <Link href={`/jobs/${job.id}`}>
                  <div className="p-6 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-[#F97316]/50 hover:shadow-xl transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#F97316]/10 flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-[#F97316]" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-[#F97316] transition-colors">
                            {job.title}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{job.organization}</p>
                        </div>
                      </div>
                      {job.isHot && (
                        <Badge className="bg-red-500 text-white">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          Hot
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <MapPin className="w-4 h-4" />
                        {job.location}
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Briefcase className="w-4 h-4" />
                        {job.posts.toLocaleString()} Posts
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Clock className="w-4 h-4" />
                        {getDaysLeft(job.lastDate)}
                      </div>
                      <div className="flex items-center gap-2 text-[#F97316] font-medium">
                        {job.salary}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-white/10">
                      <Badge variant="secondary" className="text-xs">
                        {job.department}
                      </Badge>
                      <Button size="sm" className="bg-[#F97316] hover:bg-[#EA580C]">
                        View Details
                      </Button>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Latest Updates */}
      <section className="py-16 bg-gradient-to-br from-[#F97316]/5 to-[#F97316]/10 dark:from-[#F97316]/10 dark:to-[#F97316]/5">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white text-center mb-8">
              Latest Updates
            </h2>

            <motion.div 
              className="space-y-4"
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              {latestUpdates.map((update, index) => (
                <motion.div key={index} variants={fadeInUp}>
                  <Link href={update.href}>
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-white/10 hover:border-[#F97316]/50 hover:shadow-md transition-all">
                      <Badge 
                        className={`${
                          update.type === 'result' ? 'bg-green-500' :
                          update.type === 'admit' ? 'bg-blue-500' :
                          update.type === 'job' ? 'bg-[#F97316]' :
                          'bg-purple-500'
                        } text-white`}
                      >
                        {update.type === 'result' ? 'Result' :
                         update.type === 'admit' ? 'Admit Card' :
                         update.type === 'job' ? 'New Job' :
                         'Answer Key'}
                      </Badge>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white">{update.title}</h3>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{update.date}</span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>

            <div className="text-center mt-8">
              <Button variant="outline" className="border-[#F97316] text-[#F97316] hover:bg-[#F97316] hover:text-white">
                View All Updates
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-[#0F172A]">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Never Miss a Government Job Opportunity
            </h2>
            <p className="text-gray-400 text-lg mb-8">
              Get instant notifications for new jobs matching your preferences. Join 5M+ subscribers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-[#F97316] hover:bg-[#EA580C] text-white px-8">
                <Bell className="w-5 h-5 mr-2" />
                Get Job Alerts
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 px-8">
                <Bookmark className="w-5 h-5 mr-2" />
                Save Jobs
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

