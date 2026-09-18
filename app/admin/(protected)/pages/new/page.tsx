import { PageHeader } from "@/src/admin/components/page-header";
import { PageForm } from "@/src/admin/features/pages/page-form";
import { requireAdmin } from "@/src/lib/auth/guards";

export default async function NewPagePage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="New page" />
      <div className="p-6">
        <PageForm />
      </div>
    </>
  );
}
