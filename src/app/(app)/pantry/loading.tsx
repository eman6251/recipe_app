import { HeaderSkeleton, ListSkeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <>
      <HeaderSkeleton />
      <ListSkeleton rows={8} />
    </>
  );
}
