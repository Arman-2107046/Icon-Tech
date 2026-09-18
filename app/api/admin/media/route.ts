import { NextResponse } from "next/server";
import { getAdminSession } from "@/src/lib/auth/session";
import { db } from "@/src/lib/db";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES, saveUpload } from "@/src/lib/storage";
import { mediaMetaSchema } from "@/src/modules/catalog";

/**
 * POST multipart/form-data: file + ownerType + ownerId + width + height +
 * blurhash + alt. A route handler rather than a Server Action because
 * actions cap the request body at 1 MB by default.
 */
export async function POST(request: Request): Promise<Response> {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "No file uploaded" }, { status: 400 });
  if (!(file.type in ALLOWED_IMAGE_TYPES)) {
    return NextResponse.json({ ok: false, error: "Only JPEG, PNG, WebP, GIF and AVIF images are allowed" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ ok: false, error: "Images must be 10 MB or smaller" }, { status: 400 });
  }

  const meta = mediaMetaSchema.safeParse({
    ownerType: form.get("ownerType"),
    ownerId: form.get("ownerId"),
    width: form.get("width"),
    height: form.get("height"),
    blurhash: form.get("blurhash") ?? "",
    alt: form.get("alt") ?? "",
  });
  if (!meta.success) return NextResponse.json({ ok: false, error: "Invalid image metadata" }, { status: 400 });

  const stored = await saveUpload(await file.arrayBuffer(), file.type);
  const position = await db.media.count({ where: { ownerType: meta.data.ownerType, ownerId: meta.data.ownerId } });
  const media = await db.media.create({
    data: {
      ownerType: meta.data.ownerType,
      ownerId: meta.data.ownerId,
      url: stored.url,
      mimeType: file.type,
      width: meta.data.width,
      height: meta.data.height,
      blurhash: meta.data.blurhash ?? null,
      alt: meta.data.alt,
      position,
    },
  });

  return NextResponse.json({ ok: true, data: media });
}
