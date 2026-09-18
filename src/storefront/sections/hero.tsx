import Image from "next/image";
import { getStorefrontCollection, listStorefrontProductCards } from "@/src/modules/catalog";
import { getCachedSiteSettings } from "@/src/modules/content";
import { Container, Section } from "@/src/storefront/components/layout";
import { Button } from "@/src/storefront/components/ui";

/** Full-bleed opener: tagline, two CTAs, and the collection's cover or first product image. */
export async function HeroSection({ collection }: { collection?: string }) {
  const settings = await getCachedSiteSettings();
  const target = collection ? await getStorefrontCollection(collection) : null;
  const cards = target?.membership ? await listStorefrontProductCards(target.membership, 1) : [];
  const image = target?.image ? { url: target.image.url, alt: target.image.alt } : cards[0]?.image ? { url: cards[0].image.url, alt: cards[0].image.alt } : target?.imageUrl ? { url: target.imageUrl, alt: "" } : null;

  return (
    <Section space="none" className="overflow-hidden">
      <Container width="wide" className="grid items-center gap-s6 py-s10 lg:grid-cols-12 lg:py-s16">
        <div className="lg:col-span-6">
          <p className="label text-ink-muted">{target?.title ?? settings.store.name}</p>
          <h1 className="display display-4xl mt-s2 max-w-[14ch] lg:display-5xl">{settings.store.tagline || "Well-made things for the desk, the bag, and the pocket."}</h1>
          <p className="body body-lg mt-s3 max-w-md text-ink-muted">Tested in our own office before it goes on the shelf. Next-day delivery inside Dhaka, cash on delivery anywhere in Bangladesh.</p>
          <div className="mt-s5 flex flex-wrap gap-s2">
            <Button href={target ? `/collections/${target.handle}` : "/collections/new-arrivals"} size="lg">
              Shop {target?.title.toLowerCase() ?? "now"}
            </Button>
            <Button href="/pages/about" variant="secondary" size="lg">
              Our story
            </Button>
          </div>
        </div>
        <div className="relative aspect-[4/5] overflow-hidden rounded-sf-xl bg-neutral-100 lg:col-span-5 lg:col-start-8 lg:aspect-[5/6]">
          {image ? <Image src={image.url} alt={image.alt} fill priority sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" /> : null}
        </div>
      </Container>
    </Section>
  );
}
