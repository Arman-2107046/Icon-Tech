import { NextResponse } from "next/server";
import { verifyMagicLink } from "@/src/lib/auth/magic-link";
import { createCustomerSession } from "@/src/lib/auth/session";
import { db } from "@/src/lib/db";
import { mergeGuestCartIntoCustomer } from "@/src/modules/cart/actions";

/** Magic-link landing: redeem the token, sign in, merge the guest cart. */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const email = (url.searchParams.get("email") ?? "").trim().toLowerCase();
  const next = url.searchParams.get("next") ?? "/account";
  const target = next.startsWith("/") && !next.startsWith("//") ? next : "/account";

  const outcome = await verifyMagicLink(token, email);
  if (!outcome.ok) {
    return NextResponse.redirect(new URL(`/account/login?error=${outcome.reason}`, request.url));
  }
  const customer = await db.customer.upsert({ where: { email: outcome.email }, create: { email: outcome.email }, update: {}, select: { id: true } });
  await createCustomerSession(customer.id);
  await mergeGuestCartIntoCustomer(customer.id);
  return NextResponse.redirect(new URL(target, request.url));
}
