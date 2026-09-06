import { HeaderSkeleton, ListSkeleton, Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <>
      <HeaderSkeleton />
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-8 w-32" />
      </div>
      <ListSkeleton rows={8} />
    </>
  );
}
