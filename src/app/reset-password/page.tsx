import Link from "next/link";
import { cookies } from "next/headers";
import { ChefHat, CircleCheck } from "lucide-react";
import { RECOVERY_COOKIE } from "@/lib/recovery";
import { ResetPasswordForm } from "./reset-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; done?: string }>;
}) {
  const { error, done } = await searchParams;

  // Arriving from a reset link is proof enough of identity; arriving any other
  // way (say, from the profile page) means proving it with the old password.
  const jar = await cookies();
  const fromRecoveryLink = jar.get(RECOVERY_COOKIE)?.value === "1";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <ChefHat className="h-10 w-10 text-amber-600" />
          <h1 className="text-2xl font-semibold tracking-tight">
            {done ? "Password updated" : "Choose a new password"}
          </h1>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-black/10 bg-surface p-6 text-center dark:border-white/10">
            <CircleCheck className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              You&apos;re signed in with your new password. Use it next time.
            </p>
            <Link
              href="/"
              className="rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-300"
            >
              Back to Skillet
            </Link>
          </div>
        ) : (
          <>
            {error ? (
              <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
                {error}
              </p>
            ) : null}
            <ResetPasswordForm needsCurrentPassword={!fromRecoveryLink} />
          </>
        )}
      </div>
    </div>
  );
}
