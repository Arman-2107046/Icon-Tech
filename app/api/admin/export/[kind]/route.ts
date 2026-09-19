import { NextResponse } from "next/server";
import { getAdminSession } from "@/src/lib/auth/session";
import { toCsv } from "@/src/lib/csv";
import { PRODUCT_CSV_HEADERS, productCsvRows } from "@/src/modules/catalog";
import { ORDER_CSV_HEADERS, orderCsvRows } from "@/src/modules/orders";

/** GET /api/admin/export/products | orders → CSV download (admin only). */
export async function GET(_request: Request, ctx: RouteContext<"/api/admin/export/[kind]">): Promise<Response> {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { kind } = await ctx.params;
  const stamp = new Date().toISOString().slice(0, 10);

  let body: string;
  if (kind === "products") body = toCsv(PRODUCT_CSV_HEADERS, await productCsvRows());
  else if (kind === "orders") body = toCsv(ORDER_CSV_HEADERS, await orderCsvRows());
  else return NextResponse.json({ ok: false, error: "Unknown export" }, { status: 404 });

  return new Response("\uFEFF" + body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="icon-tech-${kind}-${stamp}.csv"`,
      "cache-control": "no-store",
    },
  });
}
