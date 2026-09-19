import { CompassArt } from "@/src/storefront/components/art";
import { EmptyState } from "@/src/storefront/components/empty-state";
import { Container, Section } from "@/src/storefront/components/layout";

export default function StorefrontNotFound() {
  return (
    <Section space="lg">
      <Container>
        <EmptyState art={CompassArt} title="Page not found" body="The link may be out of date, or the product may have been retired." action={{ label: "Back home", href: "/" }} secondary={{ label: "New arrivals", href: "/collections/new-arrivals" }}>
          <p className="label mt-s2 text-ink-subtle">404</p>
        </EmptyState>
      </Container>
    </Section>
  );
}
