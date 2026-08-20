"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, LogOut, Send, Users, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  conversationName,
  type ChatMessage,
  type ConversationSummary,
  type FriendEdge,
} from "@/lib/friends";
import {
  createGroup,
  leaveConversation,
  listMessages,
  markConversationRead,
  sendMessage,
} from "@/app/(app)/friends/actions";
import { Avatar } from "./avatar";

/** Backstop for the realtime subscription, in case the socket drops. */
const POLL_MS = 10_000;

function timeLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  return today
    ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ChatTab({
  meId,
  conversations,
  friends,
  activeId,
  onOpen,
  onChanged,
}: {
  meId: string;
  conversations: ConversationSummary[];
  friends: FriendEdge[];
  activeId: string | null;
  onOpen: (id: string | null) => void;
  onChanged: () => void;
}) {
  const active = conversations.find((c) => c.id === activeId) ?? null;

  if (!active) {
    return (
      <ConversationList
        conversations={conversations}
        friends={friends}
        onOpen={onOpen}
        onChanged={onChanged}
      />
    );
  }

  return (
    <Thread
      key={active.id}
      meId={meId}
      conversation={active}
      onBack={() => onOpen(null)}
      onChanged={onChanged}
    />
  );
}

function ConversationList({
  conversations,
  friends,
  onOpen,
  onChanged,
}: {
  conversations: ConversationSummary[];
  friends: FriendEdge[];
  onOpen: (id: string) => void;
  onChanged: () => void;
}) {
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const accepted = friends.filter((f) => f.status === "accepted");

  if (composing) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">New group</h3>
          <button
            onClick={() => setComposing(false)}
            aria-label="Cancel"
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Group name (optional)"
          className="rounded-lg border border-black/15 bg-canvas px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-white/15"
        />

        {accepted.length === 0 ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Add a friend first — groups can only contain people you&apos;re
            already friends with.
          </p>
        ) : (
          <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
            {accepted.map((f) => {
              const on = picked.includes(f.id);
              return (
                <li key={f.id}>
                  <button
                    onClick={() =>
                      setPicked((p) =>
                        on ? p.filter((id) => id !== f.id) : [...p, f.id],
                      )
                    }
                    className={`flex w-full items-center gap-2.5 rounded-lg border p-2 text-left transition-colors ${
                      on
                        ? "border-amber-400 bg-amber-400/10"
                        : "border-black/10 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                    }`}
                  >
                    <Avatar profile={f} size={28} />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {f.display_name}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {error ? (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        ) : null}

        <button
          disabled={pending || picked.length === 0}
          onClick={() =>
            startTransition(async () => {
              const result = await createGroup(title, picked);
              if (result.error) {
                setError(result.error);
                return;
              }
              setComposing(false);
              setTitle("");
              setPicked([]);
              onChanged();
              if (result.conversationId) onOpen(result.conversationId);
            })
          }
          className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-300 disabled:opacity-50"
        >
          Start group
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <button
        onClick={() => setComposing(true)}
        className="flex items-center justify-center gap-2 rounded-lg border border-amber-400/40 bg-amber-400/5 px-3 py-2 text-sm font-medium transition-colors hover:border-amber-400/70"
      >
        <Users className="h-4 w-4" />
        New group
      </button>

      {conversations.length === 0 ? (
        <p className="rounded-lg border border-dashed border-black/15 p-6 text-center text-xs text-zinc-500 dark:border-white/15 dark:text-zinc-400">
          No conversations yet. Message a friend from the Friends tab.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {conversations.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => onOpen(c.id)}
                className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              >
                {c.is_group ? (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-amber-600 dark:text-amber-400">
                    <Users className="h-4 w-4" />
                  </span>
                ) : (
                  <Avatar
                    profile={
                      c.members[0] ?? { avatar_url: null, display_name: "?" }
                    }
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {conversationName(c)}
                    </span>
                    <span className="shrink-0 text-[10px] text-zinc-400">
                      {timeLabel(c.last_message_at)}
                    </span>
                  </span>
                  <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {c.last_message_body ?? "No messages yet"}
                  </span>
                </span>
                {c.unread_count > 0 ? (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-amber-400 px-1.5 text-[10px] font-semibold text-zinc-950">
                    {c.unread_count}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Thread({
  meId,
  conversation,
  onBack,
  onChanged,
}: {
  meId: string;
  conversation: ConversationSummary;
  onBack: () => void;
  onChanged: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const latestRef = useRef<string | undefined>(undefined);

  const merge = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const merged = [...prev, ...incoming.filter((m) => !seen.has(m.id))];
      merged.sort((a, b) => a.created_at.localeCompare(b.created_at));
      latestRef.current = merged[merged.length - 1]?.created_at;
      return merged;
    });
  }, []);

  // Initial load, then mark the thread read.
  useEffect(() => {
    let cancelled = false;
    listMessages(conversation.id).then((rows) => {
      if (cancelled) return;
      setMessages(rows);
      latestRef.current = rows[rows.length - 1]?.created_at;
    });
    markConversationRead(conversation.id).then(onChanged);
    return () => {
      cancelled = true;
    };
    // onChanged is stable enough here; re-running on it would refetch forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  // Live updates, with a slow poll behind them so a dropped socket degrades
  // into a laggy chat rather than a silent one.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => merge([payload.new as ChatMessage]),
      )
      .subscribe();

    const poll = setInterval(async () => {
      merge(await listMessages(conversation.id, latestRef.current));
    }, POLL_MS);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [conversation.id, merge]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setDraft("");
    await sendMessage(conversation.id, body);
    merge(await listMessages(conversation.id, latestRef.current));
    setSending(false);
    onChanged();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-black/10 p-3 dark:border-white/10">
        <button
          onClick={onBack}
          aria-label="Back to conversations"
          className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
          {conversationName(conversation)}
        </span>
        {conversation.is_group ? (
          leaving ? (
            <span className="flex shrink-0 items-center gap-1.5">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Leave?
              </span>
              <button
                onClick={async () => {
                  await leaveConversation(conversation.id);
                  onChanged();
                  onBack();
                }}
                className="rounded-lg bg-red-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-red-500"
              >
                Leave
              </button>
              <button
                onClick={() => setLeaving(false)}
                className="rounded-lg px-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              onClick={() => setLeaving(true)}
              aria-label="Leave group"
              title="Leave group"
              className="shrink-0 rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-black/5 hover:text-red-600 dark:hover:bg-white/10 dark:hover:text-red-400"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <p className="my-auto text-center text-xs text-zinc-500 dark:text-zinc-400">
            Say something.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === meId;
            const sender = conversation.members.find((p) => p.id === m.sender_id);
            return (
              <div
                key={m.id}
                className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
              >
                {conversation.is_group && !mine ? (
                  <span className="mb-0.5 px-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                    {sender?.display_name ?? "Someone"}
                  </span>
                ) : null}
                <span
                  className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-1.5 text-sm ${
                    mine
                      ? "rounded-br-sm bg-amber-400 text-zinc-950"
                      : "rounded-bl-sm bg-black/5 dark:bg-white/10"
                  }`}
                >
                  {m.body}
                </span>
                <span className="mt-0.5 px-1 text-[10px] text-zinc-400">
                  {timeLabel(m.created_at)}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-end gap-2 border-t border-black/10 p-3 dark:border-white/10">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Message"
          className="max-h-32 min-w-0 flex-1 resize-none rounded-lg border border-black/15 bg-canvas px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-white/15"
        />
        <button
          onClick={send}
          disabled={!draft.trim() || sending}
          aria-label="Send"
          className="shrink-0 rounded-lg bg-amber-400 p-2 text-zinc-950 transition-colors hover:bg-amber-300 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
