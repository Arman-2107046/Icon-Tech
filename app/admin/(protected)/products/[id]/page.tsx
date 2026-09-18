import { notFound } from "next/navigation";
import { PageHeader } from "@/src/admin/components/page-header";
import { StatusBadge } from "@/src/admin/components/status-badge";
import { OptionBuilder } from "@/src/admin/features/products/option-builder";
import { ProductForm } from "@/src/admin/features/products/product-form";
import { VariantsTable } from "@/src/admin/features/products/variants-table";
import { requireAdmin } from "@/src/lib/auth/guards";
import { getProductForAdmin, selectionKey } from "@/src/modules/catalog";

export default async function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const product = await getProductForAdmin(id);
  if (!product) notFound();

  // Map each variant to its option-name/value selection for the builder preview.
  const valueLookup = new Map(product.options.flatMap((o) => o.values.map((v) => [v.id, { name: o.name, value: v.value }] as const)));
  const existingKeys = product.variants.map((v) =>
    selectionKey(
      Object.fromEntries(
        v.optionValues.flatMap((ov) => {
          const hit = valueLookup.get(ov.optionValueId);
          return hit ? [[hit.name, hit.value]] : [];
        }),
      ),
    ),
  );

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
        <OptionBuilder
          productId={product.id}
          initial={product.options.map((o) => ({ id: o.id, name: o.name, values: o.values.map((v) => ({ id: v.id, value: v.value })) }))}
          existingKeys={existingKeys}
        />
        <VariantsTable product={product} />
      </div>
    </>
  );
}
