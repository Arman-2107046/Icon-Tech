import { getAdminSession } from "@/src/lib/auth/session";
import { adminLogout } from "@/src/lib/auth/admin-actions";

export default async function AdminHomePage() {
  const session = await getAdminSession();
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">Admin</h1>
      <p className="mt-2 text-sm text-zinc-600">Signed in as {session?.user.email ?? "nobody"}.</p>
      <form action={adminLogout} className="mt-4">
        <button type="submit" className="rounded-md border px-3 py-1.5 text-sm">Sign out</button>
      </form>
    </main>
  );
}
