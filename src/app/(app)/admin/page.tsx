import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site-url";

type AdminUser = {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  recipe_count: number;
};

type AdminUsage = {
  email: string;
  feature: string;
  calls: number;
  input_tokens: number;
  output_tokens: number;
};

const FEATURE_LABELS: Record<string, string> = {
  import: "Recipe import",
  macro_grams: "Macro gram estimates",
  macro_match: "USDA match selection",
  ingredient_alias: "Ingredient merging",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function AdminPage() {
  const supabase = await createClient();

  const [{ data: users }, { data: usage }] = await Promise.all([
    supabase.rpc("admin_list_users"),
    supabase.rpc("admin_ai_usage"),
  ]);

  // The RPC returns nothing to non-admins, so an empty result means either
  // "not an admin" or a broken deploy. 404 rather than an explanatory error,
  // so the page's existence isn't advertised.
  if (!users || users.length === 0) notFound();

  const accounts = users as AdminUser[];
  const aiUsage = (usage ?? []) as AdminUsage[];

  const totalCalls = aiUsage.reduce((sum, row) => sum + Number(row.calls), 0);

  // Emailed links are the one thing you can't check by using the app: they're
  // built server-side and read somewhere else, so a wrong one only shows up as
  // a dead page in someone's inbox. Print the actual value instead.
  const origin = await siteUrl();
  const linkSource = process.env.NEXT_PUBLIC_SITE_URL
    ? "NEXT_PUBLIC_SITE_URL"
    : process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? "VERCEL_PROJECT_PRODUCTION_URL"
      : "this request's own host (no site URL is configured)";

  return (
    <>
      <PageHeader
        title="Admin"
        description={`${accounts.length} ${accounts.length === 1 ? "account" : "accounts"} on Skillet.`}
        info={
          <>
            Only visible to you. Everyone else gets a 404, including signed-in
            users — the underlying queries return nothing unless the caller is
            listed as an admin, so this isn&apos;t merely a hidden link.
          </>
        }
      />

      <section className="mb-8 rounded-xl border border-black/10 bg-surface p-5 dark:border-white/10">
        <h2 className="text-sm font-semibold">Emailed links</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Where password-reset and confirmation emails point. Supabase replaces
          this with the project&apos;s <strong>Site URL</strong> if it
          isn&apos;t listed under Authentication → URL Configuration → Redirect
          URLs, so a link that disagrees with the address below is that
          substitution, not this value.
        </p>
        <dl className="mt-3 flex flex-col gap-2 text-sm">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">Reset link:</dt>
            <dd className="break-all font-mono text-xs">
              {origin}/auth/confirm?next=/reset-password
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">Taken from:</dt>
            <dd className="text-xs">{linkSource}</dd>
          </div>
        </dl>
      </section>

      <section className="mb-8 overflow-x-auto rounded-xl border border-black/10 bg-surface dark:border-white/10">
        <table className="w-full min-w-[36rem] text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-white/10 dark:text-zinc-400">
              <th className="px-4 py-2.5 font-semibold">Email</th>
              <th className="px-4 py-2.5 font-semibold">Name</th>
              <th className="px-4 py-2.5 font-semibold">Joined</th>
              <th className="px-4 py-2.5 font-semibold">Last seen</th>
              <th className="px-4 py-2.5 text-right font-semibold">Recipes</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((user) => (
              <tr
                key={user.id}
                className="border-b border-black/5 last:border-b-0 dark:border-white/5"
              >
                <td className="px-4 py-2.5">{user.email}</td>
                <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                  {user.display_name ?? "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                  {formatDate(user.created_at)}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                  {formatDate(user.last_sign_in_at)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {user.recipe_count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <h2 className="mb-2 text-lg font-semibold tracking-tight">
        AI usage
        <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
          {totalCalls} {totalCalls === 1 ? "call" : "calls"} billed to your key
        </span>
      </h2>

      {aiUsage.length === 0 ? (
        <p className="rounded-xl border border-dashed border-black/15 bg-surface/60 p-6 text-center text-sm text-zinc-500 dark:border-white/15 dark:text-zinc-400">
          No AI calls recorded yet.
        </p>
      ) : (
        <section className="overflow-x-auto rounded-xl border border-black/10 bg-surface dark:border-white/10">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                <th className="px-4 py-2.5 font-semibold">Email</th>
                <th className="px-4 py-2.5 font-semibold">Feature</th>
                <th className="px-4 py-2.5 text-right font-semibold">Calls</th>
                <th className="px-4 py-2.5 text-right font-semibold">
                  Tokens in
                </th>
                <th className="px-4 py-2.5 text-right font-semibold">
                  Tokens out
                </th>
              </tr>
            </thead>
            <tbody>
              {aiUsage.map((row) => (
                <tr
                  key={`${row.email}-${row.feature}`}
                  className="border-b border-black/5 last:border-b-0 dark:border-white/5"
                >
                  <td className="px-4 py-2.5">{row.email}</td>
                  <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                    {FEATURE_LABELS[row.feature] ?? row.feature}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {row.calls}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-zinc-500 dark:text-zinc-400">
                    {Number(row.input_tokens).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-zinc-500 dark:text-zinc-400">
                    {Number(row.output_tokens).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
