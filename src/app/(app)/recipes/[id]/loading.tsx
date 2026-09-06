import { Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <>
      <Skeleton className="mb-6 aspect-[16/9] w-full rounded-xl" />
      <Skeleton className="h-9 w-3/4 max-w-xl" />
      <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
      <Skeleton className="mt-2 h-4 w-2/3 max-w-xl" />

      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_1.5fr]">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="h-4" style={{ width: `${60 + ((i * 13) % 35)}%` }} />
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
