import type { HomepageSection } from "@/src/modules/content/types";
import { EditorialSection } from "./editorial";
import { FeaturedCollectionSection } from "./featured-collection";
import { HeroSection } from "./hero";
import { LogoRowSection } from "./logo-row";
import { NewsletterSection } from "./newsletter";
import { TestimonialsSection } from "./testimonials";

/** Map a stored homepage section to its component. Disabled sections render nothing. */
export function renderSection(section: HomepageSection, index: number) {
  if (!section.enabled) return null;
  const key = `${section.type}-${index}`;
  switch (section.type) {
    case "hero":
      return <HeroSection key={key} collection={section.collection} />;
    case "featured-collection":
      return <FeaturedCollectionSection key={key} collection={section.collection} limit={section.limit} />;
    case "editorial":
      return <EditorialSection key={key} collection={section.collection} flip={index % 2 === 0} />;
    case "testimonials":
      return <TestimonialsSection key={key} />;
    case "logo-row":
      return <LogoRowSection key={key} />;
    case "newsletter":
      return <NewsletterSection key={key} />;
  }
}
