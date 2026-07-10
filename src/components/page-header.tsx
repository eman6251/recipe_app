type PageHeaderProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-8 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Temporary placeholder body for pages whose feature isn't built yet. */
export function ComingSoon({ note }: { note: string }) {
  return (
    <div className="rounded-xl border border-dashed border-black/15 bg-surface/60 p-8 text-center dark:border-white/15">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{note}</p>
    </div>
  );
}
