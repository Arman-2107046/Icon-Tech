import { PageHeader } from "@/src/admin/components/page-header";
import { ProductForm } from "@/src/admin/features/products/product-form";
import { requireAdmin } from "@/src/lib/auth/guards";

export default async function NewProductPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="New product" />
      <div className="p-6">
        <ProductForm />
      </div>
    </>
  );
}
