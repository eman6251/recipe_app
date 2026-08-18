"use client";

import { MIN_PASSWORD_LENGTH, PASSWORD_HINT } from "@/lib/password";
import { updatePassword } from "./actions";

const inputClass =
  "rounded-lg border border-black/15 bg-canvas px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-white/15";

export function ResetPasswordForm({
  needsCurrentPassword,
}: {
  needsCurrentPassword: boolean;
}) {
  return (
    <form
      action={updatePassword}
      className="flex flex-col gap-4 rounded-xl border border-black/10 bg-surface p-6 dark:border-white/10"
    >
      {needsCurrentPassword ? (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Current password</span>
          <input
            name="current_password"
            type="password"
            required
            autoComplete="current-password"
            className={inputClass}
          />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Asked because you didn&apos;t arrive from a reset link. If
            you&apos;ve forgotten it,{" "}
            <a
              href="/login/forgot"
              className="text-amber-600 underline-offset-2 hover:underline dark:text-amber-400"
            >
              email yourself one
            </a>
            .
          </span>
        </label>
      ) : null}

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">New password</span>
        <input
          name="password"
          type="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          className={inputClass}
        />
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {PASSWORD_HINT}
        </span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Confirm new password</span>
        <input
          name="confirm"
          type="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          className={inputClass}
        />
      </label>

      <button
        type="submit"
        className="mt-2 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-300"
      >
        Update password
      </button>
    </form>
  );
}
