import { requireCustomer } from "@/src/lib/auth/guards";

export default async function AccountPage() {
  const session = await requireCustomer("/account");
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">Your account</h1>
      <p className="mt-2 text-sm text-zinc-600">Signed in as {session.customer.email}.</p>
    </main>
  );
}
