import { PageHeader } from "@/src/admin/components/page-header";
import { requireAdmin } from "@/src/lib/auth/guards";

export default async function AdminHomePage() {
  const session = await requireAdmin();
  return (
    <>
      <PageHeader title="Dashboard" />
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          Signed in as {session.user.email}. Dashboard metrics arrive in item 107.
        </p>
      </div>
    </>
  );
}
