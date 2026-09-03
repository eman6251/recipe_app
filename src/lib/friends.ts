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

export type ChatAttachment = {
  id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  /**
   * Time-limited link minted on the server. The bucket is private, so there's
   * no permanent URL to hold onto — a stale one stops working rather than
   * leaking, which is the right way round.
   */
  url: string | null;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  attachments: ChatAttachment[];
};

export function isImage(attachment: ChatAttachment): boolean {
  return attachment.mime_type.startsWith("image/");
}

/** "2.4 MB" — enough to know whether it's worth tapping on mobile data. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Preview line for the conversation list; attachments arrive with no body. */
export function messagePreview(body: string | null): string {
  const trimmed = body?.trim();
  return trimmed || "Attachment";
}

/** What to call a thread: its name, or whoever's in it. */
export function conversationName(c: ConversationSummary): string {
  if (c.title) return c.title;
  if (c.members.length === 0) return "Empty conversation";
  const names = c.members.map((m) => m.display_name || m.username);
  if (names.length <= 2) return names.join(" & ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}
