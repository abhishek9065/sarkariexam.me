'use client';

import { ArrowRight, Award, FileText, Search, TrendingUp, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { homePageLinks } from './links';

const stats = [
  { icon: FileText, label: 'Active Jobs', value: '9,200+', color: 'text-blue-600', bg: 'bg-blue-50' },
  { icon: Users, label: 'Candidates', value: '14L+', color: 'text-purple-600', bg: 'bg-purple-50' },
  { icon: TrendingUp, label: 'Results Today', value: '38', color: 'text-green-600', bg: 'bg-green-50' },
  { icon: Award, label: 'Exams Tracked', value: '500+', color: 'text-orange-600', bg: 'bg-orange-50' },
];

const trendingSearches = ['SSC CGL', 'Railway Group D', 'UPSC CSE', 'IBPS PO', 'Bihar Police'];

export function HomePageHero() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuery = query.trim();
    router.push(trimmedQuery ? `${homePageLinks.jobs}?search=${encodeURIComponent(trimmedQuery)}` : homePageLinks.jobs);
  }

  return (
    <section className="bg-gradient-to-b from-blue-50 via-white to-white py-5">
      <div className="mx-auto max-w-6xl px-3">
        <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
          <div className="h-1 bg-gradient-to-r from-[#1a237e] via-[#e65100] to-[#1a237e]" />
          <div className="px-5 py-5">
            <div className="mb-4 text-center">
              <h1 className="mb-1 text-[20px] font-extrabold text-gray-900">
                SarkariExams<span className="text-[#e65100]">.me</span> — Sarkari Results &amp; Latest Online Form 2026
              </h1>
              <p className="text-[13px] text-gray-500">
                Instant updates on Sarkari Result, Sarkari Exam, Admit Card, Answer Key, Syllabus &amp; much more —
                updated every 5 minutes.
              </p>
            </div>

            <form
              onSubmit={handleSearchSubmit}
              className="mx-auto mb-4 flex max-w-xl items-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-sm transition-shadow hover:shadow-md"
            >
              <Search size={16} className="ml-3.5 shrink-0 text-gray-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search Jobs, Results, Admit Card, Exam..."
                className="flex-1 bg-transparent px-3 py-3 text-[13px] text-gray-700 outline-none placeholder:text-gray-400"
              />
              <button
                type="submit"
                className="flex shrink-0 items-center gap-1.5 bg-gradient-to-r from-[#e65100] to-[#bf360c] px-5 py-3 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
              >
                Search <ArrowRight size={14} />
              </button>
            </form>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-400">
                <TrendingUp size={12} className="text-orange-400" />
                TRENDING:
              </span>
              {trendingSearches.map((searchTerm) => (
                <button
                  key={searchTerm}
                  type="button"
                  onClick={() => setQuery(searchTerm)}
                  className="rounded-full border border-orange-100 bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-700 transition-colors hover:bg-orange-100"
                >
                  {searchTerm}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 bg-gray-50 px-5 py-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="flex items-center gap-2.5">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${stat.bg}`}>
                    <stat.icon size={15} className={stat.color} />
                  </div>
                  <div>
                    <div className="text-[14px] font-extrabold text-gray-900">{stat.value}</div>
                    <div className="text-[10px] font-medium text-gray-400">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
