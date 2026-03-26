import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0F172A]">
      {/* Header Skeleton */}
      <div className="h-16 bg-white dark:bg-[#1E293B] border-b dark:border-white/10" />
      
      {/* Hero Section Skeleton */}
      <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Skeleton className="h-8 w-64 mx-auto mb-6 bg-white/20" />
            <Skeleton className="h-16 w-full max-w-2xl mx-auto mb-4 bg-white/20" />
            <Skeleton className="h-6 w-96 mx-auto mb-8 bg-white/10" />
            <Skeleton className="h-14 w-full max-w-2xl mx-auto bg-white/20" />
          </div>
        </div>
      </div>

      {/* Categories Skeleton */}
      <div className="py-12 bg-white dark:bg-[#0F172A]">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>

      {/* Departments Skeleton */}
      <div className="py-16 bg-gray-50 dark:bg-[#1E293B]">
        <div className="container mx-auto px-4">
          <Skeleton className="h-8 w-64 mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        </div>
      </div>

      {/* Featured Jobs Skeleton */}
      <div className="py-16 bg-white dark:bg-[#0F172A]">
        <div className="container mx-auto px-4">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
