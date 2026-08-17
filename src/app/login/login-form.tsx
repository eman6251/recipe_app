"use client";

import { useState } from "react";
import { login, signup } from "./actions";
import { MIN_PASSWORD_LENGTH, PASSWORD_HINT } from "@/lib/password";

const inputClass =
  "rounded-lg border border-black/15 bg-canvas px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-white/15";

/**
 * Sign-in and sign-up ask for different things — signing in accepts a
 * username *or* an email, while creating an account needs both — so they're
 * separate modes rather than one form with conditional fields.
 */
export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const signingUp = mode === "signup";

  return (
    <>
      <div className="mb-4 flex rounded-lg border border-black/10 p-0.5 dark:border-white/10">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === m
                ? "bg-amber-400 text-zinc-950"
                : "text-zinc-600 hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/5"
            }`}
          >
            {m === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <form
        action={signingUp ? signup : login}
        className="flex flex-col gap-4 rounded-xl border border-black/10 bg-surface p-6 dark:border-white/10"
      >
        <input type="hidden" name="next" value={next} />

        {signingUp ? (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Username</span>
              <input
                name="username"
                required
                autoComplete="username"
                pattern="[a-zA-Z0-9_]{3,20}"
                placeholder="pastagremlin"
                className={inputClass}
              />
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                This is what other people see on recipes you share. Your email
                is never shown.
              </span>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Email</span>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className={inputClass}
              />
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Used only to sign in and reset your password.
              </span>
            </label>
          </>
        ) : (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Username or email</span>
            <input
              name="identifier"
              required
              autoComplete="username"
              className={inputClass}
            />
          </label>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={signingUp ? MIN_PASSWORD_LENGTH : undefined}
            autoComplete={signingUp ? "new-password" : "current-password"}
            className={inputClass}
          />
          {signingUp ? (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {PASSWORD_HINT}
            </span>
          ) : null}
        </label>

        <button
          type="submit"
          className="mt-2 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-300"
        >
          {signingUp ? "Create account" : "Sign in"}
        </button>
      </form>
    </>
  );
}
