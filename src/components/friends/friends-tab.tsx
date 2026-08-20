"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  MessageSquare,
  Search,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import type { FriendEdge } from "@/lib/friends";
import {
  addFriendByCode,
  removeFriend,
  respondToRequest,
} from "@/app/(app)/friends/actions";
import { Avatar } from "./avatar";

/** Small enough that the list never scrolls inside the narrow panel. */
const PAGE_SIZE = 6;

export function FriendsTab({
  edges,
  friendCode,
  onChanged,
  onMessage,
}: {
  edges: FriendEdge[];
  friendCode: string | null;
  onChanged: () => void;
  onMessage: (userId: string) => void;
}) {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const incoming = edges.filter(
    (e) => e.status === "pending" && e.direction === "incoming",
  );
  const outgoing = edges.filter(
    (e) => e.status === "pending" && e.direction === "outgoing",
  );

  const friends = useMemo(() => {
    const accepted = edges.filter((e) => e.status === "accepted");
    const q = query.trim().toLowerCase();
    if (!q) return accepted;
    return accepted.filter(
      (e) =>
        e.display_name.toLowerCase().includes(q) ||
        e.username.toLowerCase().includes(q),
    );
  }, [edges, query]);

  const pageCount = Math.max(1, Math.ceil(friends.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = friends.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const submitCode = () => {
    startTransition(async () => {
      const outcome = await addFriendByCode(code);
      setResult(outcome);
      if (outcome.ok) {
        setCode("");
        onChanged();
      }
    });
  };

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* ------------------------------------------------ your code */}
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Your friend code
        </h3>
        <button
          onClick={() => {
            if (!friendCode) return;
            navigator.clipboard?.writeText(friendCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-amber-400/40 bg-amber-400/5 px-3 py-2.5 text-left transition-colors hover:border-amber-400/70"
        >
          <span className="font-mono text-sm tracking-wider">
            {friendCode ?? "…"}
          </span>
          <span className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> Copy
              </>
            )}
          </span>
        </button>
        <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          Share it however you like — it&apos;s the only way someone can find you
          without a recipe of yours to go on.
        </p>
      </section>

      {/* ------------------------------------------------ add by code */}
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Add a friend
        </h3>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitCode();
            }}
            placeholder="SKL-4F7K-2MQX"
            spellCheck={false}
            className="min-w-0 flex-1 rounded-lg border border-black/15 bg-canvas px-3 py-2 font-mono text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-white/15"
          />
          <button
            onClick={submitCode}
            disabled={pending || !code.trim()}
            className="shrink-0 rounded-lg bg-amber-400 px-3 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-300 disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
          </button>
        </div>
        {result ? (
          <p
            className={`mt-1.5 text-xs ${
              result.ok
                ? "text-amber-600 dark:text-amber-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {result.message}
          </p>
        ) : null}
      </section>

      {/* ------------------------------------------------ requests */}
      {incoming.length > 0 ? (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Wants to be friends ({incoming.length})
          </h3>
          <ul className="flex flex-col gap-1.5">
            {incoming.map((edge) => (
              <li
                key={edge.id}
                className="flex items-center gap-2.5 rounded-lg border border-amber-400/40 bg-amber-400/5 p-2"
              >
                <Avatar profile={edge} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {edge.display_name}
                  </span>
                  <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                    @{edge.username}
                  </span>
                </span>
                <button
                  aria-label={`Accept ${edge.display_name}`}
                  onClick={() =>
                    startTransition(async () => {
                      await respondToRequest(edge.id, true);
                      onChanged();
                    })
                  }
                  className="rounded-lg bg-amber-400 p-1.5 text-zinc-950 transition-colors hover:bg-amber-300"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  aria-label={`Decline ${edge.display_name}`}
                  onClick={() =>
                    startTransition(async () => {
                      await respondToRequest(edge.id, false);
                      onChanged();
                    })
                  }
                  className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-black/5 hover:text-zinc-900 dark:hover:bg-white/10 dark:hover:text-zinc-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {outgoing.length > 0 ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Waiting on {outgoing.map((e) => e.display_name).join(", ")}.
        </p>
      ) : null}

      {/* ------------------------------------------------ friends */}
      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Friends ({edges.filter((e) => e.status === "accepted").length})
          </h3>
        </div>

        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search friends"
            className="w-full rounded-lg border border-black/15 bg-canvas py-1.5 pl-8 pr-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-white/15"
          />
        </div>

        {friends.length === 0 ? (
          <p className="rounded-lg border border-dashed border-black/15 p-4 text-center text-xs text-zinc-500 dark:border-white/15 dark:text-zinc-400">
            {query
              ? "Nobody by that name."
              : "No friends yet. Share your code, or add someone from a recipe they've shared."}
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {visible.map((edge) => (
              <li
                key={edge.id}
                className="rounded-lg border border-black/10 p-2 dark:border-white/10"
              >
                {confirming === edge.id ? (
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 text-xs text-zinc-600 dark:text-zinc-400">
                      Remove <strong>{edge.display_name}</strong>? Your messages
                      stay, but you&apos;ll both have to ask again.
                    </span>
                    <button
                      onClick={() =>
                        startTransition(async () => {
                          await removeFriend(edge.id);
                          setConfirming(null);
                          onChanged();
                        })
                      }
                      className="shrink-0 rounded-lg bg-red-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-red-500"
                    >
                      Remove
                    </button>
                    <button
                      onClick={() => setConfirming(null)}
                      className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <Avatar profile={edge} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {edge.display_name}
                      </span>
                      <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                        @{edge.username}
                      </span>
                    </span>
                    <button
                      aria-label={`Message ${edge.display_name}`}
                      onClick={() => onMessage(edge.id)}
                      className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-black/5 hover:text-amber-600 dark:hover:bg-white/10 dark:hover:text-amber-400"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </button>
                    <button
                      aria-label={`Remove ${edge.display_name}`}
                      onClick={() => setConfirming(edge.id)}
                      className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-black/5 hover:text-red-600 dark:hover:bg-white/10 dark:hover:text-red-400"
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {pageCount > 1 ? (
          <div className="mt-2 flex items-center justify-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              aria-label="Previous page"
              className="rounded p-1 transition-colors hover:bg-black/5 disabled:opacity-30 dark:hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span>
              Page {safePage + 1} of {pageCount}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={safePage >= pageCount - 1}
              aria-label="Next page"
              className="rounded p-1 transition-colors hover:bg-black/5 disabled:opacity-30 dark:hover:bg-white/10"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
