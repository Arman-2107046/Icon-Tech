import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/src/lib/auth/session";

export const metadata: Metadata = { title: "Sign in" };

/** Placeholder until the magic-link flow lands (item 101). */
export default async function AccountLoginPage() {
  const session = await getCustomerSession();
  if (session) redirect("/account");
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <p className="mt-2 text-sm text-zinc-600">Magic-link sign in is coming soon.</p>
    </main>
  );
}
