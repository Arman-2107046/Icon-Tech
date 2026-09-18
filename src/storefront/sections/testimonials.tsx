import { Container, Section, SectionHeading } from "@/src/storefront/components/layout";

const QUOTES = [
  { quote: "Ordered the Keystone 75 on a Tuesday afternoon, it was on my desk Wednesday morning. Packaging was better than the brand's own.", name: "Tanvir A.", where: "Dhaka" },
  { quote: "I've bought three chargers from Icon Tech because the first one survived two years of daily travel. That's the whole review.", name: "Nusrat J.", where: "Chattogram" },
  { quote: "Asked a question about a monitor arm's clamp depth and got a photo of it measured on their own desk within an hour.", name: "Rafiq H.", where: "Sylhet" },
];

export function TestimonialsSection() {
  return (
    <Section space="lg">
      <Container>
        <SectionHeading eyebrow="Customers" title="Reviewed by people who use the things" />
        <ul className="mt-s6 grid gap-s3 md:grid-cols-3">
          {QUOTES.map((q) => (
            <li key={q.name} className="flex flex-col justify-between rounded-sf-lg border border-line bg-surface p-s4">
              <blockquote className="body text-ink">“{q.quote}”</blockquote>
              <footer className="mt-s4 text-t-sm text-ink-muted">
                <span className="font-medium text-ink">{q.name}</span> · {q.where}
              </footer>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
