"use client";

import { useActionState, useState } from "react";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { authenticate, type AuthState } from "./actions";
import { MIN_PASSWORD_LENGTH, PASSWORD_HINT } from "@/lib/password";

const baseInput =
  "rounded-lg border bg-canvas px-3 py-2 text-sm outline-none transition-colors disabled:opacity-60";

/** Red border and ring when this field is what the server objected to. */
function inputClass(bad: boolean): string {
  return bad
    ? `${baseInput} border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20`
    : `${baseInput} border-black/15 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-white/15`;
}

/**
 * Sign-in and sign-up ask for different things — signing in accepts a
 * username *or* an email, while creating an account needs both — so they're
 * separate modes rather than one form with conditional fields.
 *
 * The identity fields are controlled rather than left to the DOM: React
 * resets a form once its action resolves, which would wipe a correctly typed
 * username because the password beside it was wrong. The password field is
 * deliberately left to clear — retyping it is the expected cost of getting it
 * wrong, and an emptied box is itself a sign the attempt went through.
 */
export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    authenticate,
    {},
  );

  const signingUp = mode === "signup";
  // A failed sign-in never says which half was wrong — that's what stops the
  // form being used to test whether an account exists — so both go red.
  const badCredentials = state.field === "credentials";

  return (
    <>
      <div className="mb-4 flex rounded-lg border border-black/10 p-0.5 dark:border-white/10">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            disabled={pending}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
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
        action={formAction}
        aria-busy={pending}
        className="flex flex-col gap-4 rounded-xl border border-black/10 bg-surface p-6 dark:border-white/10"
      >
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="mode" value={mode} />

        {/* Announced rather than only coloured, so it reaches a screen reader
            and anyone who can't pick the red out. */}
        {state.error ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 dark:bg-red-950/60 dark:text-red-400"
          >
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{state.error}</span>
          </p>
        ) : null}

        {state.message ? (
          <p
            aria-live="polite"
            className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-400"
          >
            {state.message}
          </p>
        ) : null}

        {signingUp ? (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Username</span>
              <input
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={pending}
                autoComplete="username"
                pattern="[a-zA-Z0-9_]{3,20}"
                placeholder="pastagremlin"
                aria-invalid={state.field === "username"}
                className={inputClass(state.field === "username")}
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={pending}
                autoComplete="email"
                aria-invalid={state.field === "email"}
                className={inputClass(state.field === "email")}
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
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              disabled={pending}
              autoComplete="username"
              aria-invalid={badCredentials}
              className={inputClass(badCredentials)}
            />
          </label>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium">Password</span>
            {signingUp ? null : (
              <a
                href="/login/forgot"
                className="text-xs text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
              >
                Forgot password?
              </a>
            )}
          </span>
          <input
            name="password"
            type="password"
            required
            disabled={pending}
            minLength={signingUp ? MIN_PASSWORD_LENGTH : undefined}
            autoComplete={signingUp ? "new-password" : "current-password"}
            aria-invalid={badCredentials || state.field === "password"}
            className={inputClass(badCredentials || state.field === "password")}
          />
          {signingUp ? (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {PASSWORD_HINT}
            </span>
          ) : null}
        </label>

        <button
          type="submit"
          disabled={pending}
          className={`mt-2 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-zinc-950 transition-colors ${
            pending
              ? "cursor-wait bg-amber-400/50"
              : "bg-amber-400 hover:bg-amber-300"
          }`}
        >
          {pending ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              {signingUp ? "Creating account…" : "Signing in…"}
            </>
          ) : signingUp ? (
            "Create account"
          ) : (
            "Sign in"
          )}
        </button>
      </form>
    </>
  );
}
