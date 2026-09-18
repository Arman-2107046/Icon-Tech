import { notFound } from "next/navigation";
import { PageHeader } from "@/src/admin/components/page-header";
import { Badge } from "@/src/admin/components/ui/badge";
import { CollectionForm } from "@/src/admin/features/collections/collection-form";
import { DeleteCollectionButton } from "@/src/admin/features/collections/delete-collection-button";
import { ProductPicker } from "@/src/admin/features/collections/product-picker";
import { RuleEditor } from "@/src/admin/features/collections/rule-editor";
import { MediaManager } from "@/src/admin/features/media/media-manager";
import { requireAdmin } from "@/src/lib/auth/guards";
import { coverImagesFor, getCollectionForAdmin, listMedia, parseRules } from "@/src/modules/catalog";

export default async function EditCollectionPage({ params }: PageProps<"/admin/collections/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const collection = await getCollectionForAdmin(id);
  if (!collection) notFound();

  const [media, covers] = await Promise.all([
    listMedia("COLLECTION", collection.id),
    coverImagesFor(collection.products.map((cp) => cp.productId)),
  ]);

  return (
    <>
      <PageHeader
        title={collection.title}
        actions={
          <>
            <Badge variant="secondary">{collection.type === "MANUAL" ? "Manual" : "Automatic"}</Badge>
            <DeleteCollectionButton collectionId={collection.id} title={collection.title} />
          </>
        }
      />
      <div className="space-y-8 p-6">
        <CollectionForm
          collectionId={collection.id}
          initial={{
            title: collection.title,
            handle: collection.handle,
            description: collection.description,
            type: collection.type,
            seoTitle: collection.seoTitle,
            seoDescription: collection.seoDescription,
          }}
        />
        <MediaManager ownerType="COLLECTION" ownerId={collection.id} media={media} />
        {collection.type === "MANUAL" ? (
          <ProductPicker
            collectionId={collection.id}
            products={collection.products.map((cp) => ({
              id: cp.product.id,
              title: cp.product.title,
              handle: cp.product.handle,
              status: cp.product.status,
              imageUrl: covers.get(cp.productId) ?? null,
            }))}
          />
        ) : (
          <RuleEditor collectionId={collection.id} initial={parseRules(collection.rules)} />
        )}
      </div>
    </>
  );
}
