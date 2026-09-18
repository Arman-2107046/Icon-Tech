import { NewsletterForm } from "@/src/storefront/components/footer/newsletter-form";
import { Container, Section } from "@/src/storefront/components/layout";

export function NewsletterSection() {
  return (
    <Section tone="ink" space="lg">
      <Container className="grid gap-s4 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-6">
          <p className="label text-neutral-400">Newsletter</p>
          <h2 className="display display-2xl mt-s2 text-canvas">One email a month. New arrivals, nothing else.</h2>
        </div>
        <div className="lg:col-span-5 lg:col-start-8">
          <NewsletterForm className="[&_label]:text-canvas" />
        </div>
      </Container>
    </Section>
  );
}
