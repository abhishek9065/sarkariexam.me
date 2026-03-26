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
  FileText,
  Calendar,
  ExternalLink,
  Download,
  CheckCircle2,
  X,
  Filter,
  ChevronDown
} from 'lucide-react';

// Mock results data
const resultsData = [
  {
    id: '1',
    title: 'SSC CHSL 2025 Tier 1 Result',
    organization: 'Staff Selection Commission',
    department: 'SSC',
    examDate: '2025-08-15',
    resultDate: '2026-02-20',
    totalCandidates: 450000,
    qualified: 45000,
    status: 'declared',
    downloadLink: '#',
    isNew: true,
  },
  {
    id: '2',
    title: 'IBPS PO Prelims 2026',
    organization: 'Institute of Banking Personnel',
    department: 'Banking',
    examDate: '2025-10-12',
    resultDate: '2026-02-18',
    totalCandidates: 850000,
    qualified: 85000,
    status: 'declared',
    downloadLink: '#',
    isNew: true,
  },
  {
    id: '3',
    title: 'RRB NTPC 2025 Stage 1',
    organization: 'Railway Recruitment Board',
    department: 'Railway',
    examDate: '2025-06-20',
    resultDate: '2026-02-15',
    totalCandidates: 1200000,
    qualified: 120000,
    status: 'declared',
    downloadLink: '#',
    isNew: false,
  },
  {
    id: '4',
    title: 'UPSC CSE Prelims 2025',
    organization: 'Union Public Service Commission',
    department: 'UPSC',
    examDate: '2025-05-26',
    resultDate: '2026-02-10',
    totalCandidates: 1300000,
    qualified: 13000,
    status: 'declared',
    downloadLink: '#',
    isNew: false,
  },
  {
    id: '5',
    title: 'SBI Clerk 2026 Prelims',
    organization: 'State Bank of India',
    department: 'Banking',
    examDate: '2026-01-12',
    resultDate: '2026-02-25',
    totalCandidates: 950000,
    qualified: 95000,
    status: 'expected',
    expectedDate: '2026-02-28',
    isNew: true,
  },
  {
    id: '6',
    title: 'SSC CGL 2025 Tier 1',
    organization: 'Staff Selection Commission',
    department: 'SSC',
    examDate: '2025-09-15',
    resultDate: '2026-03-05',
    totalCandidates: 2500000,
    qualified: 125000,
    status: 'expected',
    expectedDate: '2026-03-10',
    isNew: false,
  },
];

const departments = ['All', 'SSC', 'Banking', 'Railway', 'UPSC', 'Defence', 'Teaching'];
const months = ['All Time', 'Last 7 Days', 'Last 30 Days', 'Last 3 Months', '2026', '2025'];

export default function ResultsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [selectedMonth, setSelectedMonth] = useState<string>('All Time');
  const [showFilters, setShowFilters] = useState(false);

  const filteredResults = resultsData.filter(result => {
    const matchesSearch = searchQuery === '' || 
      result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.organization.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDepartment = selectedDepartment === 'All' || result.department === selectedDepartment;
    
    return matchesSearch && matchesDepartment;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedDepartment('All');
    setSelectedMonth('All Time');
  };

  const hasActiveFilters = searchQuery || selectedDepartment !== 'All' || selectedMonth !== 'All Time';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0F172A]">
      {/* Header Section */}
      <section className="bg-gradient-to-br from-green-600 to-green-800 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Exam Results</h1>
            <p className="text-green-100 text-lg mb-6">
              Check latest government exam results, merit lists, and cut-off marks
            </p>
            
            {/* Search Bar */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search results by exam name or organization..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 pl-12 bg-white/10 border-white/20 text-white placeholder:text-green-200"
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
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Time Period:</span>
                <Select value={selectedMonth} onValueChange={(val) => val && setSelectedMonth(val)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map(month => (
                      <SelectItem key={month} value={month}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <Button variant="ghost" onClick={clearFilters} className="text-green-600">
                  <X className="w-4 h-4 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Stats Section */}
      <section className="py-6 bg-white dark:bg-[#1E293B] border-b dark:border-white/10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-xl bg-green-50 dark:bg-green-900/20">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">850+</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Results Declared</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">15M+</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Candidates</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">120+</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Organizations</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20">
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">45</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Expected Soon</p>
            </div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          {/* Section Tabs */}
          <div className="flex gap-2 mb-6">
            <Button className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Declared
            </Button>
            <Button variant="outline">
              <Calendar className="w-4 h-4 mr-2" />
              Expected
            </Button>
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-600 dark:text-gray-400">
              Showing <span className="font-semibold text-gray-900 dark:text-white">{filteredResults.length}</span> results
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
              <Select defaultValue="newest">
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results Cards */}
          <div className="space-y-4">
            {filteredResults.map((result) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-gray-200 dark:border-white/10 hover:border-green-500/50 hover:shadow-lg transition-all">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    {/* Left - Result Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                              {result.title}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{result.organization}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {result.isNew && (
                            <Badge className="bg-green-500 text-white">New</Badge>
                          )}
                          <Badge className={`${result.status === 'declared' ? 'bg-green-500' : 'bg-orange-500'} text-white`}>
                            {result.status === 'declared' ? 'Declared' : 'Expected'}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                        <div className="text-gray-600 dark:text-gray-400">
                          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Exam Date</p>
                          <p className="font-medium">{new Date(result.examDate).toLocaleDateString('en-IN')}</p>
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">
                          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
                            {result.status === 'declared' ? 'Result Date' : 'Expected Date'}
                          </p>
                          <p className="font-medium">
                            {new Date(result.status === 'declared' ? result.resultDate : result.expectedDate!).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">
                          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Appeared</p>
                          <p className="font-medium">{result.totalCandidates.toLocaleString()}</p>
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">
                          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Qualified</p>
                          <p className="font-medium text-green-600 dark:text-green-400">{result.qualified.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {result.department}
                        </Badge>
                      </div>
                    </div>

                    {/* Right - Actions */}
                    <div className="flex flex-col items-end gap-3 lg:border-l lg:border-gray-200 lg:dark:border-white/10 lg:pl-6">
                      <Button className="bg-green-600 hover:bg-green-700">
                        <Download className="w-4 h-4 mr-2" />
                        {result.status === 'declared' ? 'Download Result' : 'Check Status'}
                      </Button>
                      <Link href={`/results/${result.id}`}>
                        <Button variant="outline" className="w-full">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredResults.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No results found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">Try adjusting your filters or search terms</p>
              <Button onClick={clearFilters} variant="outline">
                Clear Filters
              </Button>
            </div>
          )}

          {/* Load More */}
          {filteredResults.length > 0 && (
            <div className="text-center mt-8">
              <Button variant="outline" size="lg">
                Load More Results
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
