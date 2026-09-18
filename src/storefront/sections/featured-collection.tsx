import { getStorefrontCollection, listStorefrontProductCards } from "@/src/modules/catalog";
import { CardGrid, Container, Section, SectionHeading } from "@/src/storefront/components/layout";
import { ProductCard } from "@/src/storefront/components/product-card";
import { Button } from "@/src/storefront/components/ui";

export async function FeaturedCollectionSection({ collection, limit = 8 }: { collection?: string; limit?: number }) {
  if (!collection) return null;
  const target = await getStorefrontCollection(collection);
  if (!target?.membership) return null;
  const products = await listStorefrontProductCards(target.membership, limit);
  if (products.length === 0) return null;

  return (
    <Section space="lg">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-s3">
          <SectionHeading eyebrow="Collection" title={target.title} lead={target.description || undefined} />
          <Button href={`/collections/${target.handle}`} variant="secondary">
            View all
          </Button>
        </div>
        <CardGrid className="mt-s6">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </CardGrid>
      </Container>
    </Section>
  );
}
