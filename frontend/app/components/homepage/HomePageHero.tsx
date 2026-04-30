'use client';

import { ArrowRight, Award, FileText, Search, TrendingUp, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { buildJobsPath } from '@/app/lib/public-content';

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
    router.push(buildJobsPath({ search: trimmedQuery || undefined }));
  }

  return (
    <section className="bg-[radial-gradient(circle_at_top,rgba(26,35,126,0.08),transparent_42%),linear-gradient(180deg,#eff4ff_0%,#ffffff_60%)] py-6 sm:py-7">
      <div className="mx-auto max-w-6xl px-3">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
            <div className="h-1 bg-gradient-to-r from-[#1a237e] via-[#e65100] to-[#1a237e]" />
            <div className="px-5 py-5 sm:px-6 sm:py-6">
              <div className="mb-5 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-bold tracking-[0.12em] text-blue-700">
                  VERIFIED UPDATES
                </span>
                <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-[10px] font-bold tracking-[0.12em] text-[#bf360c]">
                  UPDATED EVERY 5 MINUTES
                </span>
              </div>

              <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:max-w-none lg:text-left">
                <h1 className="text-[24px] font-black tracking-[-0.03em] text-gray-950 sm:text-[30px] lg:text-[34px]">
                  SarkariExam<span className="text-[#e65100]">.me</span> for Sarkari Results, Online Forms, Admit Cards &amp; Alerts
                </h1>
                <p className="mt-2 text-[13px] leading-7 text-gray-600 sm:text-[14px]">
                  One place for verified exam updates, deadline reminders, result notices and official links. Search the
                  update you need and jump straight to the right page.
                </p>
              </div>

              <form
                onSubmit={handleSearchSubmit}
                className="mx-auto mt-5 flex max-w-2xl items-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-sm transition-shadow hover:shadow-md lg:mx-0"
              >
                <Search size={16} className="ml-4 shrink-0 text-gray-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search jobs, results, admit cards, exams..."
                  className="flex-1 bg-transparent px-3 py-3.5 text-[13px] text-gray-700 outline-none placeholder:text-gray-400"
                />
                <button
                  type="submit"
                  className="flex shrink-0 items-center gap-1.5 bg-gradient-to-r from-[#e65100] to-[#bf360c] px-5 py-3.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
                >
                  Search <ArrowRight size={14} />
                </button>
              </form>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                <span className="flex items-center gap-1 text-[11px] font-semibold tracking-[0.12em] text-gray-400">
                  <TrendingUp size={12} className="text-orange-400" />
                  TRENDING:
                </span>
                {trendingSearches.map((searchTerm) => (
                  <button
                    key={searchTerm}
                    type="button"
                    onClick={() => setQuery(searchTerm)}
                    className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-[11px] font-semibold text-orange-700 transition-colors hover:bg-orange-100"
                  >
                    {searchTerm}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-[#1a237e]/10 bg-[linear-gradient(160deg,#1a237e_0%,#24337f_48%,#0f172a_100%)] p-5 text-white shadow-[0_18px_42px_rgba(15,23,42,0.16)] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold tracking-[0.16em] text-blue-200">LIVE DASHBOARD</p>
                <p className="mt-1 text-[18px] font-extrabold tracking-[-0.03em] text-white">Fast updates, clear next steps</p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/10 px-3 py-2 text-right">
                <div className="text-[9px] font-bold tracking-[0.12em] text-blue-200">TODAY</div>
                <div className="text-[16px] font-black text-white">2026</div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/12 bg-white/8 p-3 shadow-[0_8px_20px_rgba(15,23,42,0.12)] backdrop-blur-sm">
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/12 ${stat.color}`}>
                      <stat.icon size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[16px] font-extrabold leading-none text-white">{stat.value}</div>
                      <div className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-blue-200">{stat.label}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-blue-100">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                What users do next
              </div>
              <div className="mt-3 space-y-2 text-[12px] leading-6 text-blue-100/90">
                <p>• Search by exam name, state, or organization.</p>
                <p>• Open the latest update and verify the official link.</p>
                <p>• Save alerts so deadline changes reach you faster.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
