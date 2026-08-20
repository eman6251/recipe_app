/** Shared shapes for the friends and messaging UI. */

export type FriendProfile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

export type FriendEdge = FriendProfile & {
  status: "pending" | "accepted";
  /** 'incoming' when they asked you, 'outgoing' when you asked them. */
  direction: "incoming" | "outgoing";
  created_at: string;
};

export type ConversationSummary = {
  id: string;
  is_group: boolean;
  title: string | null;
  last_message_at: string;
  last_message_body: string | null;
  last_message_sender: string | null;
  unread_count: number;
  /** Everyone except you. */
  members: FriendProfile[];
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

/** What to call a thread: its name, or whoever's in it. */
export function conversationName(c: ConversationSummary): string {
  if (c.title) return c.title;
  if (c.members.length === 0) return "Empty conversation";
  const names = c.members.map((m) => m.display_name || m.username);
  if (names.length <= 2) return names.join(" & ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}
