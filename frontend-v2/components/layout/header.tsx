'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Menu,
  Moon,
  Sun,
  Briefcase,
  FileText,
  CreditCard,
  Key,
  BookOpen,
  GraduationCap,
  ChevronDown,
  Bookmark,
  User,
} from 'lucide-react';

const categories = [
  { name: 'Jobs', href: '/jobs', icon: Briefcase, description: 'Latest government job openings' },
  { name: 'Results', href: '/results', icon: FileText, description: 'Exam results and merit lists' },
  { name: 'Admit Cards', href: '/admit-cards', icon: CreditCard, description: 'Download hall tickets' },
  { name: 'Answer Keys', href: '/answer-keys', icon: Key, description: 'Official answer keys' },
  { name: 'Syllabus', href: '/syllabus', icon: BookOpen, description: 'Exam syllabus and pattern' },
  { name: 'Admissions', href: '/admissions', icon: GraduationCap, description: 'Admission notifications' },
];

const departments = [
  'Railway', 'Banking', 'SSC', 'UPSC', 'Defence', 'Teaching', 'Medical', 'Engineering', 'State Govt'
];

export function Header() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#0F172A] to-[#1E293B]">
              <span className="text-lg font-bold text-white">S</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-lg font-bold text-[#0F172A] dark:text-white">Sarkari</span>
              <span className="text-lg font-bold text-[#F97316]">Exams</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="ghost" className="flex items-center gap-1">
                  Categories
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {categories.map((category) => (
                  <DropdownMenuItem key={category.name}>
                    <Link href={category.href} className="flex items-start gap-3 py-3 w-full">
                      <category.icon className="h-5 w-5 text-[#F97316] mt-0.5" />
                      <div>
                        <p className="font-medium">{category.name}</p>
                        <p className="text-xs text-muted-foreground">{category.description}</p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="ghost" className="flex items-center gap-1">
                  Departments
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {departments.map((dept) => (
                  <DropdownMenuItem key={dept}>
                    <Link href={`/jobs?department=${encodeURIComponent(dept)}`} className="w-full">
                      {dept}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Link href="/states">
              <Button variant="ghost">States</Button>
            </Link>
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <AnimatePresence>
              {isSearchOpen ? (
                <motion.form
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 280, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleSearch}
                  className="hidden md:flex items-center gap-2"
                >
                  <Input
                    type="search"
                    placeholder="Search jobs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9"
                    autoFocus
                  />
                  <Button type="submit" size="sm" className="h-9 bg-[#F97316] hover:bg-[#EA580C]">
                    <Search className="h-4 w-4" />
                  </Button>
                </motion.form>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSearchOpen(true)}
                  className="hidden md:flex"
                >
                  <Search className="h-5 w-5" />
                </Button>
              )}
            </AnimatePresence>

            {/* Dark Mode Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="hidden sm:flex"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>

            {/* Bookmarks */}
            <Link href="/bookmarks" className="hidden sm:flex">
              <Button variant="ghost" size="icon">
                <Bookmark className="h-5 w-5" />
              </Button>
            </Link>

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#0F172A] to-[#1E293B]">
                      <span className="text-sm font-bold text-white">S</span>
                    </div>
                    <span>SarkariExams</span>
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6 flex flex-col gap-4">
                  {/* Mobile Search */}
                  <form onSubmit={handleSearch} className="flex gap-2">
                    <Input
                      type="search"
                      placeholder="Search jobs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Button type="submit" className="bg-[#F97316] hover:bg-[#EA580C]">
                      <Search className="h-4 w-4" />
                    </Button>
                  </form>

                  {/* Mobile Nav Links */}
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-muted-foreground">Categories</p>
                    {categories.map((category) => (
                      <Link
                        key={category.name}
                        href={category.href}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent"
                      >
                        <category.icon className="h-5 w-5 text-[#F97316]" />
                        {category.name}
                      </Link>
                    ))}
                  </div>

                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-muted-foreground">Account</p>
                    <Link
                      href="/bookmarks"
                      className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent"
                    >
                      <Bookmark className="h-5 w-5" />
                      Saved Jobs
                    </Link>
                    <Link
                      href="/profile"
                      className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent"
                    >
                      <User className="h-5 w-5" />
                      Profile
                    </Link>
                    <button
                      onClick={toggleTheme}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent text-left"
                    >
                      {resolvedTheme === 'dark' ? (
                        <>
                          <Sun className="h-5 w-5" />
                          Light Mode
                        </>
                      ) : (
                        <>
                          <Moon className="h-5 w-5" />
                          Dark Mode
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
