import Link from "next/link";
import { ChefHat } from "lucide-react";
import { requestPasswordReset } from "../actions";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const { message, error } = await searchParams;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <ChefHat className="h-10 w-10 text-amber-600" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Reset your password
          </h1>
          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            We&apos;ll email you a link to set a new one.
          </p>
        </div>

        {error ? (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-400">
            {message}
          </p>
        ) : null}

        <form
          action={requestPasswordReset}
          className="flex flex-col gap-4 rounded-xl border border-black/10 bg-surface p-6 dark:border-white/10"
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="rounded-lg border border-black/15 bg-canvas px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-white/15"
            />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              The address you signed up with — a username won&apos;t work here,
              since the link has to go somewhere.
            </span>
          </label>

          <button
            type="submit"
            className="mt-2 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-300"
          >
            Send reset link
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
          <Link href="/login" className="underline-offset-2 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
