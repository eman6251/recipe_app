import { InfoTip } from "@/components/info-tip";

type PageHeaderProps = {
  title: string;
  description?: string;
  /** Explains how the page works; shown behind an (i) after the description. */
  info?: React.ReactNode;
  action?: React.ReactNode;
};

export function PageHeader({
  title,
  description,
  info,
  action,
}: PageHeaderProps) {
  return (
    <div className="mb-8 flex items-start justify-between gap-4">
      {/* The walkthrough points at this on pages with no single element that
          stands for the feature. */}
      <div data-tour="page-header">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {description}
            {info ? <InfoTip>{info}</InfoTip> : null}
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
