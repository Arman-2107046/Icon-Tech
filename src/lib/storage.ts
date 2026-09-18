import "server-only";

import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Local-disk media storage. Files land in public/uploads/<yyyy>/<mm>/ and
 * are served by Next.js as static assets at /uploads/…. Keys are relative
 * to the uploads root and never contain user-supplied names.
 */

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");
const PUBLIC_PREFIX = "/uploads";

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export type StoredFile = { key: string; url: string };

export async function saveUpload(bytes: ArrayBuffer | Uint8Array, mimeType: string): Promise<StoredFile> {
  const ext = ALLOWED_IMAGE_TYPES[mimeType];
  if (!ext) throw new Error(`Unsupported image type: ${mimeType}`);

  const now = new Date();
  const dir = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const key = `${dir}/${randomBytes(12).toString("hex")}.${ext}`;

  await mkdir(path.join(UPLOADS_ROOT, dir), { recursive: true });
  await writeFile(path.join(UPLOADS_ROOT, key), bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  return { key, url: `${PUBLIC_PREFIX}/${key}` };
}

/** Best-effort delete; a missing file is not an error. */
export async function deleteUpload(url: string): Promise<void> {
  if (!url.startsWith(`${PUBLIC_PREFIX}/`)) return; // not ours (e.g. seeded remote URL)
  const key = url.slice(PUBLIC_PREFIX.length + 1);
  const target = path.join(UPLOADS_ROOT, key);
  if (!target.startsWith(UPLOADS_ROOT)) return; // path traversal guard
  await unlink(target).catch(() => undefined);
}
