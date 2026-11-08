"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { CircleAlert, X } from "lucide-react";

/**
 * Transient failure notices, bottom centre.
 *
 * The counterpart to optimistic updates. Showing a change before it's saved
 * is only honest if the moment it turns out not to have saved is visible:
 * a checkbox that fills in, empties again a second later and says nothing is
 * worse than one that was simply slow, because the first teaches people to
 * distrust what they're looking at.
 *
 * Only failures go here. A toast for every success would be noise, and the
 * success is already on screen — that's the whole point of the optimism.
 */

type Toast = { id: number; message: string };

const ToastContext = createContext<(message: string) => void>(() => {});

/** Call with a message written for the specific thing that failed. */
export function useToast() {
  return useContext(ToastContext);
}

const DURATION_MS = 6000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message: string) => {
    // Date.now collides when two writes fail in the same millisecond, which
    // is exactly what a dropped connection does.
    const id = Math.random();
    setToasts((prev) => [...prev, { id, message }]);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        // Bottom centre, above the phone tab bar, and never in the way: the
        // wrapper ignores pointer events so only the toasts themselves catch
        // a tap.
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[80] flex flex-col items-center gap-2 px-4 md:bottom-8"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <ToastRow key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastRow({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div className="pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border border-red-500/40 bg-surface px-4 py-3 text-sm shadow-2xl">
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
      <p className="min-w-0 flex-1 text-zinc-700 dark:text-zinc-200">
        {toast.message}
      </p>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        className="shrink-0 rounded p-0.5 text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
