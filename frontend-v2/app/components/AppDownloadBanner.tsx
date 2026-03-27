import Link from 'next/link';
import { Smartphone, Download } from 'lucide-react';

export default function AppDownloadBanner() {
  return (
    <div className="mt-8 mb-6 bg-gradient-to-r from-[#B91C1C] to-[#7F1D1D] rounded-lg shadow-xl border border-[#991B1B] overflow-hidden text-white flex flex-col sm:flex-row items-center justify-between p-6 px-8">
      <div className="flex items-center mb-4 sm:mb-0">
        <Smartphone className="w-16 h-16 mr-4 opacity-90" />
        <div>
          <h3 className="text-xl sm:text-2xl font-bold mb-1">Download Sarkari Exams Official App</h3>
          <p className="text-sm sm:text-base text-red-100 font-medium">Get instant job alerts, results, and admit cards notifications!</p>
        </div>
      </div>
      
      <Link 
        href="/app" 
        className="bg-white text-[#B91C1C] hover:bg-gray-100 flex items-center py-3 px-6 rounded-full font-bold shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        <Download className="w-5 h-5 mr-2" />
        Download Now
      </Link>
    </div>
  );
}
