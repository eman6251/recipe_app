/**
 * Shrink a photo in the browser before it goes anywhere.
 *
 * Phone cameras produce two to four megabytes at four thousand pixels wide,
 * and nothing in this app ever shows a recipe photo larger than about twelve
 * hundred. Uploading the original costs the slowest part of a phone's
 * connection — the way up — and then costs it again every time storage serves
 * it back.
 *
 * Returns the original untouched when it's already small or the browser
 * can't do the work, because a slightly large upload beats a failed one.
 */

const MAX_EDGE = 1600;
const QUALITY = 0.82;
/** Below this, re-encoding tends to cost more than it saves. */
const SKIP_BELOW_BYTES = 300 * 1024;

export async function downscaleImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < SKIP_BELOW_BYTES) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));

    if (scale === 1 && file.size < 1024 * 1024) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", QUALITY),
    );
    // A re-encode that came out bigger is a re-encode worth discarding.
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
