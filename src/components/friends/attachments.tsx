"use client";

import { Download, FileText } from "lucide-react";
import {
  formatBytes,
  isImage,
  type ChatAttachment,
} from "@/lib/friends";

/**
 * Attachments inside a message bubble.
 *
 * Images show themselves — that's the whole reason someone sent a photo of
 * the thing they cooked. Everything else is a row you can tap, because a
 * generic icon at thumbnail size tells you less than the file's name does.
 */
export function MessageAttachments({
  attachments,
  mine,
}: {
  attachments: ChatAttachment[];
  mine: boolean;
}) {
  if (attachments.length === 0) return null;

  return (
    <span className="mt-1 flex max-w-[85%] flex-col gap-1">
      {attachments.map((attachment) =>
        isImage(attachment) && attachment.url ? (
          <a
            key={attachment.id}
            href={attachment.url}
            target="_blank"
            rel="noreferrer"
            className="block overflow-hidden rounded-xl border border-black/10 dark:border-white/10"
          >
            {/* Plain img: these are short-lived signed URLs on a private
                bucket, which the image optimiser can't cache or re-fetch. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={attachment.url}
              alt={attachment.file_name}
              className="max-h-64 w-auto object-cover"
            />
          </a>
        ) : (
          <a
            key={attachment.id}
            href={attachment.url ?? "#"}
            target="_blank"
            rel="noreferrer"
            download={attachment.file_name}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition-colors ${
              mine
                ? "bg-amber-400/80 text-zinc-950 hover:bg-amber-400"
                : "bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15"
            }`}
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">
                {attachment.file_name}
              </span>
              <span className="block opacity-70">
                {formatBytes(attachment.size_bytes)}
              </span>
            </span>
            <Download className="h-3.5 w-3.5 shrink-0 opacity-70" />
          </a>
        ),
      )}
    </span>
  );
}
