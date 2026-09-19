import Image from "next/image";
import { getStorefrontCollection, listStorefrontProductCards } from "@/src/modules/catalog";
import { Container, Section, Split } from "@/src/storefront/components/layout";
import { Button } from "@/src/storefront/components/ui";

/** Image + text split with intentional asymmetry; flips when `flip` is set. */
export async function EditorialSection({ collection, flip = true }: { collection?: string; flip?: boolean }) {
  if (!collection) return null;
  const target = await getStorefrontCollection(collection);
  if (!target) return null;
  const cards = target.membership ? await listStorefrontProductCards(target.membership, 1) : [];
  const image = target.image
    ? { url: target.image.url, alt: target.image.alt, blur: target.image.blur }
    : cards[0]?.image
      ? { url: cards[0].image.url, alt: cards[0].image.alt, blur: cards[0].image.blur }
      : target.imageUrl
        ? { url: target.imageUrl, alt: "", blur: undefined }
        : null;

  return (
    <Section tone="surface" space="lg">
      <Container>
        <Split ratio="7/5" flip={flip} align="center" gap="xl">
          <div className="relative aspect-[4/3] overflow-hidden rounded-sf-xl bg-neutral-100">
            {image ? <Image src={image.url} alt={image.alt} fill placeholder={image.blur ? "blur" : "empty"} blurDataURL={image.blur} sizes="(min-width: 1024px) 58vw, 100vw" className="object-cover" /> : null}
          </div>
          <div>
            <p className="label text-ink-muted">Editorial</p>
            <h2 className="display display-2xl mt-s2">{target.title}</h2>
            <p className="body mt-s3 text-ink-muted">{target.description || "A short, considered range. Every piece earns its place on the shelf."}</p>
            <Button href={`/collections/${target.handle}`} variant="secondary" className="mt-s4">
              Explore {target.title.toLowerCase()}
            </Button>
          </div>
        </Split>
      </Container>
    </Section>
  );
}
