import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#f0f2f7] dark:bg-[#070819]">
      <div className="h-[104px] bg-[linear-gradient(120deg,#060d2e_0%,#0d1b6e_30%,#1a237e_60%,#0a3880_100%)]" />
      <div className="h-9 border-b border-gray-200 bg-white dark:border-white/10 dark:bg-[#0d1321]" />

      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#0b1437_0%,#0a1230_55%,#0b1024_100%)]">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="mb-5 flex gap-2">
            <Skeleton className="h-6 w-36 rounded-full bg-white/15" />
            <Skeleton className="h-6 w-28 rounded-full bg-white/10" />
            <Skeleton className="h-6 w-32 rounded-full bg-white/10" />
          </div>
          <div className="grid items-center gap-6 lg:grid-cols-[1fr_300px]">
            <div>
              <Skeleton className="h-20 max-w-xl rounded-2xl bg-white/15" />
              <Skeleton className="mt-4 h-12 max-w-lg rounded-xl bg-white/10" />
              <div className="mt-7 flex gap-2">
                <Skeleton className="h-14 flex-1 rounded-2xl bg-white/15" />
                <Skeleton className="h-14 w-28 rounded-2xl bg-amber-300/60" />
              </div>
              <div className="mt-4 flex gap-2">
                {[...Array(5)].map((_, index) => (
                  <Skeleton key={index} className="h-7 w-20 rounded-full bg-white/10" />
                ))}
              </div>
            </div>
            <div className="hidden grid-cols-2 gap-2 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10 lg:grid">
              {[...Array(4)].map((_, index) => (
                <Skeleton key={index} className="h-14 rounded-xl bg-white/10" />
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="border-b border-gray-200 bg-white dark:border-white/10 dark:bg-[#0c1120]">
        <div className="mx-auto grid max-w-6xl grid-cols-4 gap-2 px-4 py-4 sm:grid-cols-8">
          {[...Array(8)].map((_, index) => (
            <div key={index} className="flex flex-col items-center gap-2">
              <Skeleton className="h-11 w-11 rounded-2xl" />
              <Skeleton className="h-3 w-16 rounded-full" />
              <Skeleton className="h-3 w-8 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <Skeleton className="h-5 w-36 rounded-full" />
        <Skeleton className="mt-2 h-7 w-72 rounded-xl" />
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {[...Array(3)].map((_, index) => (
            <Skeleton key={index} className="h-52 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
