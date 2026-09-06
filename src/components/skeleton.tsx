/**
 * Placeholder shapes shown while a page's data is on its way.
 *
 * Every route in this app is server-rendered per request, so a navigation used
 * to leave the *previous* page on screen, frozen, until the new one was fully
 * ready — half a second on a warm home page, longer cold or on cellular, with
 * nothing to show the tap had registered. A skeleton turns that dead time into
 * an answer: the app responded, and here's the shape of what's coming.
 *
 * Shapes rather than a spinner, because they also stop the layout jumping when
 * the real content lands in place of them.
 */

export function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden
      style={style}
      className={`animate-pulse rounded bg-black/[0.07] dark:bg-white/[0.07] ${className}`}
    />
  );
}

/** Title and description block, matching PageHeader's spacing. */
export function HeaderSkeleton() {
  return (
    <div className="mb-8">
      <Skeleton className="h-8 w-48 md:h-9" />
      <Skeleton className="mt-2 h-4 w-72 max-w-full" />
    </div>
  );
}

export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex flex-col overflow-hidden rounded-xl border border-black/10 bg-surface dark:border-white/10"
        >
          <Skeleton className="aspect-[3/2] w-full rounded-none" />
          <div className="flex flex-col gap-2 p-5">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-black/10 bg-surface p-5 dark:border-white/10">
      <div className="flex flex-col gap-3">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 shrink-0" />
            {/* Ragged widths, so it reads as a list of things rather than
                a loading bar with delusions. */}
            <Skeleton
              className="h-4"
              style={{ width: `${45 + ((i * 17) % 40)}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
