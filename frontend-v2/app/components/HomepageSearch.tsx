'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { buildSearchPath } from '@/app/lib/public-content';

export default function HomepageSearch() {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      window.location.href = buildSearchPath(query);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={`bg-white/80 dark:bg-[#1E293B]/80 backdrop-blur-2xl rounded-2xl shadow-lg border transition-colors duration-300 p-4 mb-8 ${isFocused ? 'border-blue-400 dark:border-blue-500 shadow-blue-500/10' : 'border-white/50 dark:border-white/10'}`}
    >
      <form onSubmit={handleSearch} className="flex relative">
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Search for Latest Jobs, Results, Admit Cards..." 
          className="w-full pl-6 pr-14 py-4 rounded-xl border-2 border-transparent bg-gray-50/50 dark:bg-gray-900/50 focus:bg-white dark:focus:bg-gray-800 transition-all duration-300 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 font-semibold text-gray-800 dark:text-gray-100 shadow-inner"
        />
        <button 
          type="submit" 
          className="absolute right-2 top-2 bottom-2 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg shadow-md hover:shadow-lg hover:shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center"
          aria-label="Search"
        >
          <Search size={22} className="stroke-[2.5]" />
        </button>
      </form>
    </motion.div>
  );
}
