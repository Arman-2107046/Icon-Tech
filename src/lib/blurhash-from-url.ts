import { encode } from "blurhash";
import sharp from "sharp";

/**
 * Fetch an image (remote or a local /uploads path), shrink it to ~32px and
 * encode a 4x4 blurhash. Used by the seed and the backfill script; uploads
 * from the admin compute theirs in the browser before posting.
 */
export async function blurhashFromUrl(url: string, baseUrl?: string): Promise<string | null> {
  try {
    const target = url.startsWith("http") ? url : `${baseUrl ?? "http://localhost:3000"}${url}`;
    const res = await fetch(target, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const input = Buffer.from(await res.arrayBuffer());
    const { data, info } = await sharp(input).resize(32, 32, { fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    return encode(new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength), info.width, info.height, 4, 4);
  } catch {
    return null;
  }
}
