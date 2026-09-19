import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/src/lib/auth/session";
import { tags } from "@/src/lib/cache-tags";
import { parseCsv } from "@/src/lib/csv";
import { importProductCsv } from "@/src/modules/catalog";

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * POST multipart: file (CSV) + dryRun ("1" to validate only). A route handler
 * because Server Actions cap the body at 1 MB. Returns an ImportSummary.
 */
export async function POST(request: Request): Promise<Response> {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Choose a CSV file" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ ok: false, error: "CSV files must be 5 MB or smaller" }, { status: 400 });
  const { headers, records } = parseCsv(await file.text());
  if (records.length === 0) return NextResponse.json({ ok: false, error: "The file has no data rows" }, { status: 400 });
  const dryRun = form.get("dryRun") === "1";
  const summary = await importProductCsv(records, headers, dryRun);
  if (!dryRun && summary.issues.length === 0) {
    revalidateTag(tags.products, "max");
    revalidateTag(tags.collections, "max");
  }
  return NextResponse.json({ ok: true, data: summary });
}
