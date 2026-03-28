import Link from 'next/link';
import { Smartphone, Download } from 'lucide-react';
import { homePageLinks } from './homepage/links';

export default function AppDownloadBanner() {
  return (
    <div className="relative mt-12 mb-8 bg-gradient-to-br from-indigo-700 via-blue-800 to-indigo-900 rounded-3xl shadow-2xl border border-indigo-400/20 overflow-hidden text-white flex flex-col sm:flex-row items-center justify-between p-8 sm:p-10 z-10 group">
      {/* Decorative background gradients */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 z-0" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-400/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 z-0" />

      <div className="flex items-center mb-6 sm:mb-0 relative z-10 w-full sm:w-auto">
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white/10 rounded-2xl flex items-center justify-center mr-5 backdrop-blur-md border border-white/20 transform group-hover:scale-105 group-hover:rotate-3 transition-all duration-500 shadow-xl shrink-0">
          <Smartphone className="w-10 h-10 sm:w-12 sm:h-12 text-blue-200" />
        </div>
        <div>
          <h3 className="text-2xl sm:text-3xl font-extrabold mb-1 tracking-tight drop-shadow-md">Sarkari Exams Official App</h3>
          <p className="text-sm sm:text-base text-blue-100 font-medium max-w-sm leading-relaxed opacity-90">Instant job alerts, fast results, and push notifications directly to your phone!</p>
        </div>
      </div>
      
      <Link 
        href={homePageLinks.app} 
        className="relative z-10 bg-white text-indigo-700 hover:bg-blue-50 flex items-center py-4 px-8 rounded-full font-bold text-lg shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] w-full sm:w-auto justify-center"
      >
        <Download className="w-6 h-6 mr-2 animate-bounce" />
        Download Free
      </Link>
    </div>
  );
}
