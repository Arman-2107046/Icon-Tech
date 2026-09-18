import { PageHeader } from "@/src/admin/components/page-header";
import { CollectionForm } from "@/src/admin/features/collections/collection-form";
import { requireAdmin } from "@/src/lib/auth/guards";

export default async function NewCollectionPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="New collection" />
      <div className="p-6">
        <CollectionForm />
      </div>
    </>
  );
}
