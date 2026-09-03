"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  ChatAttachment,
  ChatMessage,
  ConversationSummary,
  FriendEdge,
  FriendProfile,
} from "@/lib/friends";

/**
 * Reads live here rather than in a page component because the friends panel
 * is an overlay that can open anywhere in the app — it fetches its own data
 * on open instead of every page paying to load it.
 */

export async function getFriendCode(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("friend_codes").select("code").maybeSingle();
  return data?.code ?? null;
}

export async function listFriends(): Promise<FriendEdge[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("list_friends");
  return (data ?? []) as FriendEdge[];
}

export async function listConversations(): Promise<ConversationSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("list_conversations");
  return (data ?? []) as ConversationSummary[];
}

/** How long an attachment link stays good. Long enough to read a backlog. */
const SIGNED_URL_SECONDS = 60 * 60;

type AttachmentRow = {
  id: string;
  message_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
};

export async function listMessages(
  conversationId: string,
  /** Only what's arrived since, for the poll that backs up realtime. */
  since?: string,
): Promise<ChatMessage[]> {
  const supabase = await createClient();
  let query = supabase
    .from("messages")
    .select(
      "id, conversation_id, sender_id, body, created_at, message_attachments (id, message_id, storage_path, file_name, mime_type, size_bytes, width, height)",
    )
    .eq("conversation_id", conversationId);

  if (since) query = query.gt("created_at", since);

  const { data } = await query.order("created_at", { ascending: true }).limit(200);
  const rows = (data ?? []) as unknown as (Omit<ChatMessage, "attachments"> & {
    message_attachments: AttachmentRow[];
  })[];

  // One signing call for the whole page rather than one per file: the bucket
  // is private, so every attachment needs a fresh link on every read.
  const paths = rows.flatMap((r) =>
    r.message_attachments.map((a) => a.storage_path),
  );
  const signed = new Map<string, string>();
  if (paths.length > 0) {
    const { data: urls } = await supabase.storage
      .from("chat-attachments")
      .createSignedUrls(paths, SIGNED_URL_SECONDS);
    for (const entry of urls ?? []) {
      if (entry.path && entry.signedUrl) signed.set(entry.path, entry.signedUrl);
    }
  }

  return rows.map(({ message_attachments, ...message }) => ({
    ...message,
    attachments: message_attachments.map(
      (a): ChatAttachment => ({
        id: a.id,
        file_name: a.file_name,
        mime_type: a.mime_type,
        size_bytes: a.size_bytes,
        width: a.width,
        height: a.height,
        url: signed.get(a.storage_path) ?? null,
      }),
    ),
  }));
}

const CODE_SHAPE = /^SKL-[2-9A-HJ-NP-TV-Z]{4}-[2-9A-HJ-NP-TV-Z]{4}$/;

/** Normalise what someone typed or pasted into the code they meant. */
function normaliseCode(raw: string): string | null {
  const bare = raw.toUpperCase().replace(/[^0-9A-Z]/g, "");
  const body = bare.startsWith("SKL") ? bare.slice(3) : bare;
  if (body.length !== 8) return null;
  const code = `SKL-${body.slice(0, 4)}-${body.slice(4)}`;
  return CODE_SHAPE.test(code) ? code : null;
}

export type AddFriendResult = {
  ok: boolean;
  message: string;
  /** Set when the request went through, for an optimistic list update. */
  profile?: FriendProfile;
};

export async function addFriendByCode(raw: string): Promise<AddFriendResult> {
  const code = normaliseCode(raw);
  if (!code) {
    return {
      ok: false,
      message: "That doesn't look like a friend code. They look like SKL-4F7K-2MQX.",
    };
  }

  const supabase = await createClient();
  const { data: found } = await supabase.rpc("find_by_friend_code", { code });
  const profile = (found as FriendProfile[] | null)?.[0];

  if (!profile) {
    return { ok: false, message: "No one has that code. Double-check the letters." };
  }

  return { ...(await requestFriendship(profile.id)), profile };
}

/** Used by the code form above and by the button on a recipe author's profile. */
export async function requestFriendship(
  userId: string,
): Promise<{ ok: boolean; message: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("send_friend_request", {
    other: userId,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath("/friends");
  switch (data as string) {
    case "sent":
      return { ok: true, message: "Request sent." };
    case "accepted":
      return { ok: true, message: "You're friends — they'd already asked you." };
    case "already_friends":
      return { ok: false, message: "You're already friends." };
    case "pending":
      return { ok: false, message: "You've already asked. Waiting on them." };
    case "declined":
      // Deliberately vague: telling someone they were turned down invites a
      // second attempt from a new account.
      return { ok: false, message: "That request can't be sent." };
    case "self":
      return { ok: false, message: "That's your own code." };
    default:
      return { ok: false, message: "Couldn't send that request." };
  }
}

export async function respondToRequest(userId: string, accept: boolean) {
  const supabase = await createClient();
  await supabase.rpc("respond_to_friend_request", { other: userId, accept });
  revalidatePath("/friends");
}

export async function removeFriend(userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // The pair is stored in a fixed order, so both ids are known here.
  const [a, b] = [user.id, userId].sort();
  await supabase.from("friendships").delete().eq("user_a", a).eq("user_b", b);
  revalidatePath("/friends");
}

export async function openDirectMessage(
  userId: string,
): Promise<{ conversationId?: string; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_or_create_dm", { other: userId });
  if (error) return { error: error.message };
  return { conversationId: data as string };
}

export async function createGroup(
  title: string,
  memberIds: string[],
): Promise<{ conversationId?: string; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_group_conversation", {
    group_title: title,
    member_ids: memberIds,
  });
  if (error) return { error: error.message };
  return { conversationId: data as string };
}

/** Files already uploaded to storage by the browser, awaiting a message. */
export type PendingAttachment = {
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  width?: number | null;
  height?: number | null;
};

export async function sendMessage(
  conversationId: string,
  body: string,
  attachments: PendingAttachment[] = [],
): Promise<{ error?: string }> {
  const trimmed = body.trim();
  // A message with nothing in it and nothing attached isn't a message.
  if (!trimmed && attachments.length === 0) return {};
  if (trimmed.length > 4000) return { error: "That message is too long." };

  const supabase = await createClient();
  const { data: message, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, body: trimmed })
    .select("id")
    .single();

  if (error) return { error: error.message };

  if (attachments.length > 0) {
    const { error: attachError } = await supabase
      .from("message_attachments")
      .insert(
        attachments.map((a) => ({
          message_id: message.id,
          storage_path: a.storage_path,
          file_name: a.file_name,
          mime_type: a.mime_type,
          size_bytes: a.size_bytes,
          width: a.width ?? null,
          height: a.height ?? null,
        })),
      );

    if (attachError) {
      // Better an absent message than one that claims to carry files it
      // doesn't — the sender can retry, and the orphaned uploads are unread.
      await supabase.from("messages").delete().eq("id", message.id);
      return { error: attachError.message };
    }
  }

  return {};
}

export async function markConversationRead(conversationId: string) {
  const supabase = await createClient();
  await supabase.rpc("mark_conversation_read", { conv: conversationId });
}

export async function leaveConversation(conversationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("conversation_members")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);
}
