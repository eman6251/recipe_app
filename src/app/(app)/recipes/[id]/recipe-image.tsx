"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { ImagePlus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { removeRecipeImage, setRecipeImage } from "../actions";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function RecipeImage({
  recipeId,
  imageUrl,
  title,
}: {
  recipeId: string;
  imageUrl: string | null;
  title: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const upload = (file: File) => {
    setError(null);
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("Use a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("That image is over 8MB — try a smaller one.");
      return;
    }

    startTransition(async () => {
      // Straight to storage: a Server Action body would cap out around 1MB.
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Not signed in.");
        return;
      }

      const ext = file.type.split("/")[1].replace("jpeg", "jpg");
      // Keyed by user id so storage policies verify ownership from the path.
      const path = `${user.id}/${recipeId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("recipe-images")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("recipe-images").getPublicUrl(path);

      // Replacing a photo reuses the path, so bust the CDN cache.
      const result = await setRecipeImage(recipeId, `${publicUrl}?v=${Date.now()}`);
      if (result.error) setError(result.error);
    });
  };

  const remove = () => {
    setError(null);
    startTransition(async () => {
      const result = await removeRecipeImage(recipeId);
      if (result.error) setError(result.error);
    });
  };

  return (
    <div className="mb-6">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = ""; // allow re-picking the same file
        }}
      />

      {imageUrl ? (
        <div className="group/img relative overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
          {/*
            A fixed aspect ratio (rather than a fixed height) keeps the framing
            identical at every window width. Since these are arbitrary phone
            photos, the image is contained rather than cropped so the whole
            dish stays visible, with a blurred copy filling the leftover space
            instead of empty bars.
          */}
          <div className="relative aspect-[3/2] w-full bg-black/5 dark:bg-black/30">
            <Image
              src={imageUrl}
              alt=""
              aria-hidden
              fill
              className="scale-110 object-cover opacity-40 blur-2xl"
              unoptimized
            />
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-contain"
              unoptimized
            />
          </div>
          <div className="absolute right-2 top-2 flex gap-1.5 opacity-0 transition-opacity group-hover/img:opacity-100">
            <button
              onClick={() => inputRef.current?.click()}
              disabled={pending}
              className="rounded-lg bg-black/60 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur transition-colors hover:bg-black/80 disabled:opacity-50"
            >
              {pending ? "Working…" : "Replace"}
            </button>
            <button
              onClick={remove}
              disabled={pending}
              aria-label="Remove photo"
              className="rounded-lg bg-black/60 p-1.5 text-white backdrop-blur transition-colors hover:bg-red-600/80 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="flex h-32 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-black/15 text-sm text-zinc-500 transition-colors hover:border-emerald-500/50 hover:text-emerald-600 disabled:opacity-50 dark:border-white/15 dark:text-zinc-400 dark:hover:text-emerald-400"
        >
          <ImagePlus className="h-4 w-4" />
          {pending ? "Uploading…" : "Add a photo"}
        </button>
      )}

      {error ? (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
