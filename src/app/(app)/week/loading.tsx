import { HeaderSkeleton, ListSkeleton, Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <>
      <HeaderSkeleton />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="rounded-xl border border-black/10 bg-surface p-4 dark:border-white/10"
          >
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-2 h-6 w-20" />
          </div>
        ))}
      </div>
      <ListSkeleton rows={5} />
    </>
  );
}
