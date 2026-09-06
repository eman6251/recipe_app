import { CardGridSkeleton, HeaderSkeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <>
      <HeaderSkeleton />
      <CardGridSkeleton />
    </>
  );
}
