import { ChefHat } from "lucide-react";
import { login, signup } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <ChefHat className="h-10 w-10 text-amber-600" />
          <h1 className="text-2xl font-semibold tracking-tight">Skillet</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Sign in to your kitchen
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

        <form className="flex flex-col gap-4 rounded-xl border border-black/10 bg-surface p-6 dark:border-white/10">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="rounded-lg border border-black/15 bg-canvas px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-white/15"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Password</span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
              className="rounded-lg border border-black/15 bg-canvas px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-white/15"
            />
          </label>

          <button
            formAction={login}
            className="mt-2 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-300"
          >
            Sign in
          </button>
          <button
            formAction={signup}
            className="rounded-lg border border-black/15 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
          >
            Create account
          </button>
        </form>
      </div>
    </div>
  );
}
