'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';

export default function HomepageSearch() {
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(query)}`;
    }
  };

  return (
    <div className="bg-white dark:bg-[#1E293B] rounded shadow border border-gray-300 dark:border-gray-700 p-4 mb-6">
      <form onSubmit={handleSearch} className="flex relative">
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for Latest Jobs, Results, Admit Cards..." 
          className="w-full pl-4 pr-12 py-3 rounded border-2 border-gray-300 dark:border-gray-600 focus:outline-none focus:border-red-600 dark:focus:border-red-500 font-semibold text-gray-800 dark:text-gray-100 dark:bg-gray-800"
        />
        <button 
          type="submit" 
          className="absolute right-0 top-0 bottom-0 px-4 bg-red-600 hover:bg-red-700 text-white rounded-r border-2 border-red-600 hover:border-red-700 transition"
          aria-label="Search"
        >
          <Search size={20} />
        </button>
      </form>
    </div>
  );
}
