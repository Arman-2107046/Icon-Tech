import { Container, Section } from "@/src/storefront/components/layout";
import { Button } from "@/src/storefront/components/ui";

export default function StorefrontNotFound() {
  return (
    <Section space="xl">
      <Container className="text-center">
        <p className="label text-ink-muted">404</p>
        <h1 className="display display-3xl mt-s2">Page not found</h1>
        <p className="body mx-auto mt-s2 text-ink-muted">The link may be out of date, or the product may have been retired.</p>
        <div className="mt-s5 flex justify-center gap-s2">
          <Button href="/">Back home</Button>
          <Button href="/collections/new-arrivals" variant="secondary">
            New arrivals
          </Button>
        </div>
      </Container>
    </Section>
  );
}
