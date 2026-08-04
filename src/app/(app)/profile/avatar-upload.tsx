"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { setAvatar } from "./actions";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export function AvatarUpload({ avatarUrl }: { avatarUrl: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  // Child elements fire dragleave too, so count rather than clear on first.
  const dragDepth = useRef(0);
  const [pending, startTransition] = useTransition();

  const dropHandlers = {
    onDragEnter: (e: React.DragEvent) => {
      e.preventDefault();
      dragDepth.current += 1;
      if (e.dataTransfer.types.includes("Files")) setDragging(true);
    },
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDragLeave: (e: React.DragEvent) => {
      e.preventDefault();
      dragDepth.current -= 1;
      if (dragDepth.current <= 0) setDragging(false);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) upload(file);
    },
  };

  const upload = (file: File) => {
    setError(null);
    if (!ALLOWED.includes(file.type)) {
      setError("Use a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("That image is over 5MB — try a smaller one.");
      return;
    }

    startTransition(async () => {
      // Direct to storage; Server Action bodies cap out around 1MB.
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Not signed in.");
        return;
      }

      const ext = file.type.split("/")[1].replace("jpeg", "jpg");
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);
      const result = await setAvatar(`${publicUrl}?v=${Date.now()}`);
      if (result.error) setError(result.error);
    });
  };

  return (
    <div className="flex items-center gap-4" {...dropHandlers}>
      <div
        className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 transition-colors ${
          dragging ? "border-amber-400" : "border-black/10 dark:border-white/10"
        } bg-canvas`}
      >
        {avatarUrl ? (
          <Image src={avatarUrl} alt="" fill className="object-cover" unoptimized />
        ) : (
          <span className="flex h-full items-center justify-center text-zinc-300 dark:text-zinc-600">
            <UserRound className="h-8 w-8" />
          </span>
        )}
      </div>

      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="rounded-lg border border-black/10 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-black/5 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/5"
        >
          {pending
            ? "Uploading…"
            : dragging
              ? "Drop to upload"
              : avatarUrl
                ? "Change photo"
                : "Add photo"}
        </button>
        {error ? (
          <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}
      </div>
    </div>
  );
}
