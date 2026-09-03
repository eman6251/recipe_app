import { createClient } from "@/lib/supabase/client";
import type { PendingAttachment } from "@/app/(app)/friends/actions";

/** Matches the bucket's own limit, so a rejection is caught before the round trip. */
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
export const MAX_ATTACHMENTS = 10;

/** Pixel dimensions, so a photo's bubble holds its shape before it loads. */
async function imageSize(
  file: File,
): Promise<{ width: number; height: number } | null> {
  if (!file.type.startsWith("image/")) return null;
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return null; // an unsupported format is still a perfectly good file
  }
}

/** Storage rejects some characters, and a stray one shouldn't lose the file. */
function safeName(name: string): string {
  return name.replace(/[^\w.\-]+/g, "_").slice(-80);
}

/**
 * Put files in the bucket, then hand the paths back for the message row.
 *
 * Browser straight to storage rather than through the Server Action, whose
 * body caps out around 1MB — a single photo would blow that. The path is
 * keyed by conversation because that's what the storage policy checks
 * membership against.
 */
export async function uploadAttachments(
  conversationId: string,
  files: File[],
): Promise<{ attachments: PendingAttachment[]; error?: string }> {
  const supabase = createClient();
  const attachments: PendingAttachment[] = [];

  for (const file of files) {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return {
        attachments,
        error: `"${file.name}" is over 25MB.`,
      };
    }

    const path = `${conversationId}/${crypto.randomUUID()}-${safeName(file.name)}`;
    const { error } = await supabase.storage
      .from("chat-attachments")
      .upload(path, file, {
        contentType: file.type || "application/octet-stream",
      });

    if (error) return { attachments, error: error.message };

    const size = await imageSize(file);
    attachments.push({
      storage_path: path,
      file_name: file.name,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      width: size?.width ?? null,
      height: size?.height ?? null,
    });
  }

  return { attachments };
}
