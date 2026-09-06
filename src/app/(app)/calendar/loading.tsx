import { HeaderSkeleton, Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <>
      <HeaderSkeleton />
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="overflow-hidden rounded-xl border border-black/10 bg-surface dark:border-white/10">
        <div className="grid grid-cols-7">
          {Array.from({ length: 35 }, (_, i) => (
            <div
              key={i}
              className="min-h-24 border-b border-r border-black/5 p-1.5 dark:border-white/5"
            >
              <Skeleton className="h-3 w-4" />
              {i % 4 === 1 ? <Skeleton className="mt-2 h-3 w-full" /> : null}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
