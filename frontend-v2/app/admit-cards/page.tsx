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
  CreditCard,
  Calendar,
  Building2,
  Download,
  Clock,
  MapPin,
  AlertCircle,
  X,
  Filter,
  ChevronDown,
  ExternalLink
} from 'lucide-react';

// Mock admit cards data
const admitCardsData = [
  {
    id: '1',
    title: 'IBPS PO Mains Admit Card 2026',
    organization: 'Institute of Banking Personnel',
    department: 'Banking',
    examDate: '2026-02-28',
    examTime: '09:00 AM',
    venue: 'Online',
    admitCardDate: '2026-02-20',
    lastDate: '2026-02-27',
    status: 'available',
    downloadLink: '#',
    isUrgent: true,
  },
  {
    id: '2',
    title: 'SSC CGL Tier 1 Admit Card 2026',
    organization: 'Staff Selection Commission',
    department: 'SSC',
    examDate: '2026-03-15',
    examTime: '10:00 AM',
    venue: 'As per city choice',
    admitCardDate: '2026-03-05',
    lastDate: '2026-03-14',
    status: 'available',
    downloadLink: '#',
    isUrgent: false,
  },
  {
    id: '3',
    title: 'RRB NTPC Stage 2 Admit Card 2026',
    organization: 'Railway Recruitment Board',
    department: 'Railway',
    examDate: '2026-03-20',
    examTime: '09:30 AM',
    venue: 'Various centers',
    admitCardDate: '2026-03-10',
    lastDate: '2026-03-19',
    status: 'available',
    downloadLink: '#',
    isUrgent: false,
  },
  {
    id: '4',
    title: 'UPSC CSE Mains Admit Card 2026',
    organization: 'Union Public Service Commission',
    department: 'UPSC',
    examDate: '2026-03-22',
    examTime: '09:00 AM',
    venue: 'Delhi only',
    admitCardDate: '2026-03-12',
    lastDate: '2026-03-21',
    status: 'expected',
    expectedDate: '2026-03-12',
    isUrgent: false,
  },
  {
    id: '5',
    title: 'SBI Clerk Mains Admit Card 2026',
    organization: 'State Bank of India',
    department: 'Banking',
    examDate: '2026-03-10',
    examTime: '10:00 AM',
    venue: 'Online',
    admitCardDate: '2026-03-01',
    lastDate: '2026-03-09',
    status: 'available',
    downloadLink: '#',
    isUrgent: true,
  },
  {
    id: '6',
    title: 'SSC CHSL Tier 1 Admit Card 2026',
    organization: 'Staff Selection Commission',
    department: 'SSC',
    examDate: '2026-04-05',
    examTime: '09:00 AM',
    venue: 'As per city choice',
    admitCardDate: '2026-03-25',
    lastDate: '2026-04-04',
    status: 'expected',
    expectedDate: '2026-03-25',
    isUrgent: false,
  },
];

const departments = ['All', 'Banking', 'SSC', 'Railway', 'UPSC', 'Defence'];
const statuses = ['All', 'Available', 'Expected', 'Closed'];

export default function AdmitCardsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [showFilters, setShowFilters] = useState(false);

  const filteredCards = admitCardsData.filter(card => {
    const matchesSearch = searchQuery === '' || 
      card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.organization.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDepartment = selectedDepartment === 'All' || card.department === selectedDepartment;
    const matchesStatus = selectedStatus === 'All' || 
      (selectedStatus === 'Available' && card.status === 'available') ||
      (selectedStatus === 'Expected' && card.status === 'expected') ||
      (selectedStatus === 'Closed' && card.status === 'closed');
    
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedDepartment('All');
    setSelectedStatus('All');
  };

  const hasActiveFilters = searchQuery || selectedDepartment !== 'All' || selectedStatus !== 'All';

  const getDaysLeft = (lastDate: string) => {
    const days = Math.ceil((new Date(lastDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0F172A]">
      {/* Header Section */}
      <section className="bg-gradient-to-br from-purple-600 to-purple-800 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Admit Cards</h1>
            <p className="text-purple-100 text-lg mb-6">
              Download your hall tickets for upcoming government exams
            </p>
            
            {/* Search Bar */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search admit cards by exam name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 pl-12 bg-white/10 border-white/20 text-white placeholder:text-purple-200"
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
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
                <Select value={selectedStatus} onValueChange={(val) => val && setSelectedStatus(val)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <Button variant="ghost" onClick={clearFilters} className="text-purple-600">
                  <X className="w-4 h-4 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Alert Section */}
      <section className="py-6 bg-white dark:bg-[#1E293B] border-b dark:border-white/10">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
            <AlertCircle className="w-8 h-8 text-orange-600 dark:text-orange-400 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-orange-800 dark:text-orange-200">Important Notice</h3>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                Download your admit card at least 2 days before the exam. Carry a valid photo ID along with the admit card.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-6 bg-white dark:bg-[#1E293B] border-b dark:border-white/10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">1,200+</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Cards</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-green-50 dark:bg-green-900/20">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">850+</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Available Now</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">120+</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Expected Soon</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-red-50 dark:bg-red-900/20">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">45</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Closing Today</p>
            </div>
          </div>
        </div>
      </section>

      {/* Admit Cards Section */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <Button className="bg-purple-600 hover:bg-purple-700">
              <CreditCard className="w-4 h-4 mr-2" />
              Available
            </Button>
            <Button variant="outline">
              <Clock className="w-4 h-4 mr-2" />
              Expected
            </Button>
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-600 dark:text-gray-400">
              Showing <span className="font-semibold text-gray-900 dark:text-white">{filteredCards.length}</span> admit cards
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
              <Select defaultValue="exam-date">
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exam-date">Exam Date</SelectItem>
                  <SelectItem value="newest">Newest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cards */}
          <div className="grid md:grid-cols-2 gap-4">
            {filteredCards.map((card) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className={`bg-white dark:bg-[#1E293B] rounded-2xl p-6 border-2 transition-all hover:shadow-lg ${
                  card.isUrgent 
                    ? 'border-red-200 dark:border-red-800 hover:border-red-400' 
                    : 'border-gray-200 dark:border-white/10 hover:border-purple-500/50'
                }`}>
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        card.isUrgent ? 'bg-red-100 dark:bg-red-900/30' : 'bg-purple-100 dark:bg-purple-900/30'
                      }`}>
                        <CreditCard className={`w-6 h-6 ${
                          card.isUrgent ? 'text-red-600 dark:text-red-400' : 'text-purple-600 dark:text-purple-400'
                        }`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                          {card.title}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{card.organization}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {card.isUrgent && (
                        <Badge className="bg-red-500 text-white">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Urgent
                        </Badge>
                      )}
                      <Badge className={`${
                        card.status === 'available' ? 'bg-green-500' : 'bg-orange-500'
                      } text-white`}>
                        {card.status === 'available' ? 'Available' : 'Expected'}
                      </Badge>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div className="text-gray-600 dark:text-gray-400">
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Exam Date</p>
                      <p className="font-medium">{new Date(card.examDate).toLocaleDateString('en-IN')}</p>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Exam Time</p>
                      <p className="font-medium">{card.examTime}</p>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
                        {card.status === 'available' ? 'Admit Card Date' : 'Expected Date'}
                      </p>
                      <p className="font-medium">
                        {new Date(card.status === 'available' ? card.admitCardDate : card.expectedDate!).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Venue</p>
                      <p className="font-medium">{card.venue}</p>
                    </div>
                  </div>

                  {/* Department Badge */}
                  <div className="mb-4">
                    <Badge variant="secondary" className="text-xs">
                      {card.department}
                    </Badge>
                  </div>

                  {/* Days Left Warning */}
                  {card.status === 'available' && getDaysLeft(card.lastDate) <= 3 && (
                    <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <p className="text-sm text-red-700 dark:text-red-300">
                        <AlertCircle className="w-4 h-4 inline mr-1" />
                        Only {getDaysLeft(card.lastDate)} days left to download!
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {card.status === 'available' ? (
                      <Button className={`flex-1 ${
                        card.isUrgent 
                          ? 'bg-red-600 hover:bg-red-700' 
                          : 'bg-purple-600 hover:bg-purple-700'
                      }`}>
                        <Download className="w-4 h-4 mr-2" />
                        Download Now
                      </Button>
                    ) : (
                      <Button variant="outline" className="flex-1">
                        <Clock className="w-4 h-4 mr-2" />
                        Notify Me
                      </Button>
                    )}
                    <Link href={`/admit-cards/${card.id}`} className="flex-shrink-0">
                      <Button variant="outline" size="icon">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredCards.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                <CreditCard className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No admit cards found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">Try adjusting your filters or search terms</p>
              <Button onClick={clearFilters} variant="outline">
                Clear Filters
              </Button>
            </div>
          )}

          {/* Load More */}
          {filteredCards.length > 0 && (
            <div className="text-center mt-8">
              <Button variant="outline" size="lg">
                Load More
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
