import { encode } from "blurhash";

export type ImageMeta = { width: number; height: number; blurhash: string };

/**
 * Read an image's natural size and compute a 4×3 blurhash from a small
 * canvas downsample. Runs in the browser at upload time so the server
 * never has to decode images.
 */
export async function readImageMeta(file: File): Promise<ImageMeta> {
  const bitmap = await createImageBitmap(file);
  try {
    const width = bitmap.width;
    const height = bitmap.height;

    const scale = Math.min(1, 32 / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available");
    ctx.drawImage(bitmap, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    const blurhash = encode(data, w, h, 4, 3);
    return { width, height, blurhash };
  } finally {
    bitmap.close();
  }
}
