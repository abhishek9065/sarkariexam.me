'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  Filter,
  MapPin,
  Building2,
  Clock,
  Bookmark,
  X,
  ChevronDown,
  Briefcase,
  TrendingUp,
  Calendar
} from 'lucide-react';

// Mock job data
const jobsData = [
  {
    id: '1',
    title: 'RRB NTPC Recruitment 2026',
    organization: 'Railway Recruitment Board',
    department: 'Railway',
    location: 'All India',
    state: 'All States',
    posts: 35000,
    lastDate: '2026-04-15',
    postedDate: '2026-02-01',
    type: 'Full Time',
    salary: '₹35,000 - ₹1,50,000',
    qualification: '10th, 12th, Graduate',
    ageLimit: '18-33 years',
    isHot: true,
    isNew: true,
  },
  {
    id: '2',
    title: 'IBPS PO/Clerk 2026',
    organization: 'Institute of Banking Personnel',
    department: 'Banking',
    location: 'All India',
    state: 'All States',
    posts: 12000,
    lastDate: '2026-03-30',
    postedDate: '2026-02-05',
    type: 'Full Time',
    salary: '₹35,000 - ₹65,000',
    qualification: 'Graduate',
    ageLimit: '20-30 years',
    isHot: true,
    isNew: true,
  },
  {
    id: '3',
    title: 'SSC CGL 2026',
    organization: 'Staff Selection Commission',
    department: 'SSC',
    location: 'All India',
    state: 'All States',
    posts: 45000,
    lastDate: '2026-04-30',
    postedDate: '2026-01-28',
    type: 'Full Time',
    salary: '₹44,900 - ₹1,42,400',
    qualification: 'Graduate',
    ageLimit: '18-32 years',
    isHot: false,
    isNew: false,
  },
  {
    id: '4',
    title: 'UPSC Civil Services 2026',
    organization: 'Union Public Service Commission',
    department: 'UPSC',
    location: 'All India',
    state: 'All States',
    posts: 1200,
    lastDate: '2026-02-28',
    postedDate: '2026-01-15',
    type: 'Full Time',
    salary: '₹56,100 - ₹2,50,000',
    qualification: 'Graduate',
    ageLimit: '21-32 years',
    isHot: true,
    isNew: false,
  },
  {
    id: '5',
    title: 'UP Police Constable 50,000+ Posts',
    organization: 'Uttar Pradesh Police',
    department: 'Police',
    location: 'Uttar Pradesh',
    state: 'Uttar Pradesh',
    posts: 50000,
    lastDate: '2026-03-15',
    postedDate: '2026-02-08',
    type: 'Full Time',
    salary: '₹25,000 - ₹45,000',
    qualification: '10th, 12th',
    ageLimit: '18-25 years',
    isHot: true,
    isNew: true,
  },
  {
    id: '6',
    title: 'BSNL Junior Engineer',
    organization: 'Bharat Sanchar Nigam Limited',
    department: 'Telecom',
    location: 'All India',
    state: 'All States',
    posts: 3000,
    lastDate: '2026-03-20',
    postedDate: '2026-02-03',
    type: 'Full Time',
    salary: '₹35,000 - ₹55,000',
    qualification: 'Diploma, Graduate',
    ageLimit: '18-30 years',
    isHot: false,
    isNew: true,
  },
];

const departments = [
  'All', 'Railway', 'Banking', 'SSC', 'UPSC', 'Defence', 'Teaching', 'Medical', 'Police', 'State Govt'
];

const states = [
  'All States', 'Uttar Pradesh', 'Bihar', 'Madhya Pradesh', 'Rajasthan', 'Maharashtra', 'Gujarat', 'Karnataka', 'Tamil Nadu', 'West Bengal'
];

const qualifications = [
  'All', '10th', '12th', 'Diploma', 'ITI', 'Graduate', 'Post Graduate'
];

export default function JobsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [selectedState, setSelectedState] = useState<string>('All States');
  const [selectedQualification, setSelectedQualification] = useState<string>('All');
  const [showFilters, setShowFilters] = useState(false);

  const getDaysLeft = (lastDate: string) => {
    const days = Math.ceil((new Date(lastDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days > 0 ? `${days} days left` : 'Closing soon';
  };

  const filteredJobs = jobsData.filter(job => {
    const matchesSearch = searchQuery === '' || 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.department.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDepartment = selectedDepartment === 'All' || job.department === selectedDepartment;
    const matchesState = selectedState === 'All States' || job.state === selectedState;
    const matchesQualification = selectedQualification === 'All' || job.qualification.includes(selectedQualification);
    
    return matchesSearch && matchesDepartment && matchesState && matchesQualification;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedDepartment('All');
    setSelectedState('All States');
    setSelectedQualification('All');
  };

  const hasActiveFilters = searchQuery || selectedDepartment !== 'All' || selectedState !== 'All States' || selectedQualification !== 'All';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0F172A]">
      {/* Header Section */}
      <section className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Government Jobs</h1>
            <p className="text-gray-300 text-lg mb-6">
              Find latest Sarkari Naukri from central and state government departments
            </p>
            
            {/* Search Bar */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search jobs by title, department, or organization..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 pl-12 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                />
              </div>
              <Button 
                variant="outline" 
                className="h-12 px-4 border-white/20 text-white hover:bg-white/10"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-5 h-5 mr-2" />
                Filters
                <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Filters Section */}
      {showFilters && (
        <section className="bg-white dark:bg-[#1E293B] border-b dark:border-white/10 py-4">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Department:</span>
                <Select value={selectedDepartment} onValueChange={(val) => val && setSelectedDepartment(val)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">State:</span>
                <Select value={selectedState} onValueChange={(val) => val && setSelectedState(val)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Qualification:</span>
                <Select value={selectedQualification} onValueChange={(val) => val && setSelectedQualification(val)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {qualifications.map(qual => (
                      <SelectItem key={qual} value={qual}>{qual}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <Button variant="ghost" onClick={clearFilters} className="text-[#F97316]">
                  <X className="w-4 h-4 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Results Section */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          {/* Results Count */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-600 dark:text-gray-400">
              Showing <span className="font-semibold text-gray-900 dark:text-white">{filteredJobs.length}</span> jobs
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
              <Select defaultValue="newest">
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="deadline">Deadline</SelectItem>
                  <SelectItem value="salary">Salary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Job Cards */}
          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Link href={`/jobs/${job.id}`}>
                  <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-gray-200 dark:border-white/10 hover:border-[#F97316]/50 hover:shadow-lg transition-all group">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                      {/* Left - Job Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-[#F97316]/10 flex items-center justify-center">
                              <Building2 className="w-6 h-6 text-[#F97316]" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg text-gray-900 dark:text-white group-hover:text-[#F97316] transition-colors">
                                {job.title}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{job.organization}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {job.isNew && (
                              <Badge className="bg-green-500 text-white">New</Badge>
                            )}
                            {job.isHot && (
                              <Badge className="bg-red-500 text-white">
                                <TrendingUp className="w-3 h-3 mr-1" />
                                Hot
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-4 mb-4 text-sm">
                          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            <MapPin className="w-4 h-4" />
                            {job.location}
                          </div>
                          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            <Briefcase className="w-4 h-4" />
                            {job.posts.toLocaleString()} Posts
                          </div>
                          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            <Clock className="w-4 h-4" />
                            {getDaysLeft(job.lastDate)}
                          </div>
                          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            <Calendar className="w-4 h-4" />
                            Posted {new Date(job.postedDate).toLocaleDateString('en-IN')}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {job.department}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {job.qualification}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Age: {job.ageLimit}
                          </Badge>
                        </div>
                      </div>

                      {/* Right - Actions */}
                      <div className="flex flex-col items-end gap-3 lg:border-l lg:border-gray-200 lg:dark:border-white/10 lg:pl-6">
                        <div className="text-right">
                          <p className="text-lg font-semibold text-[#F97316]">{job.salary}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">per month</p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="icon">
                            <Bookmark className="w-4 h-4" />
                          </Button>
                          <Button className="bg-[#F97316] hover:bg-[#EA580C]">
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {filteredJobs.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No jobs found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">Try adjusting your filters or search terms</p>
              <Button onClick={clearFilters} variant="outline">
                Clear Filters
              </Button>
            </div>
          )}

          {/* Load More */}
          {filteredJobs.length > 0 && (
            <div className="text-center mt-8">
              <Button variant="outline" size="lg">
                Load More Jobs
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
