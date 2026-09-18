import { notFound } from "next/navigation";
import { PageHeader } from "@/src/admin/components/page-header";
import { StatusBadge } from "@/src/admin/components/status-badge";
import { ProductForm } from "@/src/admin/features/products/product-form";
import { requireAdmin } from "@/src/lib/auth/guards";
import { getProductForAdmin } from "@/src/modules/catalog";

export default async function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const product = await getProductForAdmin(id);
  if (!product) notFound();

  return (
    <>
      <PageHeader title={product.title} actions={<StatusBadge status={product.status} />} />
      <div className="space-y-8 p-6">
        <ProductForm
          productId={product.id}
          initial={{
            title: product.title,
            handle: product.handle,
            description: product.description,
            status: product.status,
            vendor: product.vendor,
            tags: product.tags,
            seoTitle: product.seoTitle,
            seoDescription: product.seoDescription,
          }}
        />
      </div>
    </>
  );
}
