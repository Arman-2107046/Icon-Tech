import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/src/lib/auth/session";
import { LoginForm } from "./login-form";

// Session-gated: never prerendered as an instant shell (dev-only validation).
export const instant = false;

export const metadata: Metadata = { title: "Admin sign in" };

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session) redirect("/admin");

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 p-6">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-zinc-900">Icon Tech admin</h1>
        <p className="mb-6 text-sm text-zinc-500">Sign in with your staff account.</p>
        <LoginForm />
      </div>
    </main>
  );
}
