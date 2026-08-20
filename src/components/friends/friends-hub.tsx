"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { MessagesSquare, UsersRound } from "lucide-react";
import type { ConversationSummary, FriendEdge } from "@/lib/friends";
import {
  getFriendCode,
  listConversations,
  listFriends,
  openDirectMessage,
} from "@/app/(app)/friends/actions";
import { FriendsTab } from "./friends-tab";
import { ChatTab } from "./chat-tab";

/**
 * The friends and messaging surface, shared by the desktop slide-over and the
 * mobile page — the panel is too cramped to work with a thumb, but the content
 * is identical, so only the frame differs.
 *
 * Loads its own data on mount rather than being handed it: it can open from
 * anywhere in the app, and every other page shouldn't pay for a friends query
 * it will usually never show.
 */
export function FriendsHub({
  meId,
  active,
}: {
  meId: string;
  /** False while a panel is closed, so a hidden panel isn't polling. */
  active: boolean;
}) {
  const [tab, setTab] = useState<"friends" | "chat">("friends");
  const [friends, setFriends] = useState<FriendEdge[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [friendCode, setFriendCode] = useState<string | null>(null);
  const [openConversation, setOpenConversation] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    const [edges, convos] = await Promise.all([listFriends(), listConversations()]);
    setFriends(edges);
    setConversations(convos);
    setLoaded(true);
  }, []);

  // Reload whenever the surface becomes visible. friendCode is deliberately
  // not a dependency — setting it would re-run this and refetch forever.
  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    Promise.all([listFriends(), listConversations()]).then(([edges, convos]) => {
      if (cancelled) return;
      setFriends(edges);
      setConversations(convos);
      setLoaded(true);
    });

    getFriendCode().then((code) => {
      if (!cancelled) setFriendCode(code);
    });

    return () => {
      cancelled = true;
    };
  }, [active]);

  const messageFriend = (userId: string) => {
    startTransition(async () => {
      const result = await openDirectMessage(userId);
      if (!result.conversationId) return;
      await refresh();
      setOpenConversation(result.conversationId);
      setTab("chat");
    });
  };

  const unread = conversations.reduce((n, c) => n + Number(c.unread_count), 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 gap-1 border-b border-black/10 p-2 dark:border-white/10">
        {(
          [
            ["friends", "Friends", UsersRound],
            ["chat", "Chat", MessagesSquare],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === key
                ? "bg-amber-400 text-zinc-950"
                : "text-zinc-600 hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/5"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            {key === "chat" && unread > 0 && tab !== "chat" ? (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-semibold text-zinc-950">
                {unread}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {!loaded ? (
          <p className="p-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
            Loading…
          </p>
        ) : tab === "friends" ? (
          <FriendsTab
            edges={friends}
            friendCode={friendCode}
            onChanged={refresh}
            onMessage={messageFriend}
          />
        ) : (
          <ChatTab
            meId={meId}
            conversations={conversations}
            friends={friends}
            activeId={openConversation}
            onOpen={setOpenConversation}
            onChanged={refresh}
          />
        )}
      </div>
    </div>
  );
}
