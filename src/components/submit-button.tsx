"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";

/**
 * A submit button that shows its own form's progress.
 *
 * Server actions can take a round trip or two — a password reset waits on an
 * email send, saving a profile waits on the database — and a button that
 * looks identical the whole time invites a second click on a form that's
 * already submitting. useFormStatus reads the state of the enclosing form, so
 * this works with any `<form action={serverAction}>` without the action
 * having to report anything back.
 *
 * Must be rendered inside the form it belongs to; that's how the hook finds
 * it. A button in the same component as the <form> tag reads nothing.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className = "",
  icon,
  // Spelled out rather than spread, because an icon-only button's whole
  // accessible name lives here and silently dropping it would be worse than
  // not accepting it at all.
  "aria-label": ariaLabel,
}: {
  /** Idle label. */
  children?: React.ReactNode;
  /** Shown beside the spinner while submitting; omit for icon-only buttons. */
  pendingLabel?: string;
  className?: string;
  /** Leading icon when idle; replaced by the spinner while submitting. */
  icon?: React.ReactNode;
  "aria-label"?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      aria-label={ariaLabel}
      className={`${className} ${
        pending ? "cursor-wait opacity-60" : ""
      } transition-opacity`}
    >
      {pending ? (
        <LoaderCircle className="h-4 w-4 animate-spin" />
      ) : (
        icon ?? null
      )}
      {pending ? pendingLabel : children}
    </button>
  );
}
