import type { Metadata } from "next";
import { CardGrid, Container, Rule, Section, SectionHeading, Split } from "@/src/storefront/components/layout";
import { Badge, Button, Input, Link, Price, Select, Textarea } from "@/src/storefront/components/ui";

export const metadata: Metadata = { title: "Playground", robots: { index: false } };

/**
 * Every storefront component in every state, on one page. Not linked from
 * the site; used while building pages and for visual regression checks.
 */
export default function PlaygroundPage() {
  return (
    <>
      <Section space="md">
        <Container>
          <SectionHeading eyebrow="Design system" title="Playground" lead="Every component, every state. If it looks wrong here it looks wrong everywhere." />
        </Container>
      </Section>

      <Block title="Typography">
        <div className="space-y-s3">
          <p className="display display-5xl">Display 5xl</p>
          <p className="display display-4xl">Display 4xl</p>
          <p className="display display-3xl">Display 3xl</p>
          <p className="display display-2xl">Display 2xl</p>
          <p className="display display-xl">Display xl</p>
          <p className="display display-lg">Display lg</p>
          <p className="display display-md">Display md</p>
          <p className="body body-lg">Body large — for lead paragraphs under a heading.</p>
          <p className="body">Body — the default reading size. Line height 1.65, measure capped at 68 characters so a paragraph never becomes a wall. The quick brown fox jumps over the lazy dog while the five boxing wizards jump quickly.</p>
          <p className="body body-sm text-ink-muted">Body small, muted — captions and metadata.</p>
          <p className="label">Label · eyebrow · nav</p>
        </div>
      </Block>

      <Block title="Colour">
        <div className="grid grid-cols-6 gap-s1 sm:grid-cols-11">
          {/* Static class names: Tailwind only generates what it can read. */}
          {[
            ["50", "bg-neutral-50"],
            ["100", "bg-neutral-100"],
            ["200", "bg-neutral-200"],
            ["300", "bg-neutral-300"],
            ["400", "bg-neutral-400"],
            ["500", "bg-neutral-500"],
            ["600", "bg-neutral-600"],
            ["700", "bg-neutral-700"],
            ["800", "bg-neutral-800"],
            ["900", "bg-neutral-900"],
            ["950", "bg-neutral-950"],
          ].map(([step, cls]) => (
            <div key={step} className="space-y-s0-5">
              <div className={`aspect-square rounded-sf-md border border-line ${cls}`} />
              <p className="text-t-xs text-ink-muted">{step}</p>
            </div>
          ))}
        </div>
        <div className="mt-s3 flex flex-wrap gap-s2">
          {[
            ["bg-brand text-brand-fg", "brand"],
            ["bg-brand-hover text-brand-fg", "brand-hover"],
            ["bg-brand-soft text-brand-hover", "brand-soft"],
            ["bg-success-soft text-success", "success"],
            ["bg-danger-soft text-danger", "danger"],
            ["bg-ink text-canvas", "ink"],
            ["bg-surface text-ink border border-line", "surface"],
          ].map(([cls, name]) => (
            <div key={name} className={`rounded-sf-md px-s2 py-s1 text-t-sm ${cls}`}>
              {name}
            </div>
          ))}
        </div>
      </Block>

      <Block title="Buttons">
        <Row label="Primary">
          <Button>Default</Button>
          <Button className="hover">Hover</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
          <Button size="lg">Large</Button>
          <Button href="/playground">As link</Button>
        </Row>
        <Row label="Secondary">
          <Button variant="secondary">Default</Button>
          <Button variant="secondary" loading>
            Loading
          </Button>
          <Button variant="secondary" disabled>
            Disabled
          </Button>
          <Button variant="secondary" size="lg">
            Large
          </Button>
        </Row>
        <Row label="Ghost">
          <Button variant="ghost">Default</Button>
          <Button variant="ghost" loading>
            Loading
          </Button>
          <Button variant="ghost" disabled>
            Disabled
          </Button>
        </Row>
      </Block>

      <Block title="Form controls">
        <div className="grid max-w-3xl gap-s3 md:grid-cols-2">
          <Input label="Default" placeholder="Placeholder" />
          <Input label="With value" defaultValue="Ayesha Rahman" />
          <Input label="With hint" placeholder="you@example.com" hint="We only use this for order updates." />
          <Input label="Error" defaultValue="not-an-email" error="Enter a valid email address" />
          <Input label="Disabled" defaultValue="Can't touch this" disabled />
          <Input label="Hidden label" hideLabel placeholder="Search products…" />
          <Select label="Select" placeholder="Choose a country" defaultValue="" options={[{ value: "BD", label: "Bangladesh" }, { value: "IN", label: "India" }, { value: "NP", label: "Nepal", disabled: true }]} />
          <Select label="Select with error" defaultValue="" placeholder="Choose a size" error="Pick a size" options={[{ value: "S", label: "Small" }, { value: "M", label: "Medium" }]} />
          <Textarea label="Textarea" placeholder="Anything we should know about delivery?" className="md:col-span-2" />
        </div>
      </Block>

      <Block title="Badges">
        <Row label="Tones">
          <Badge>Neutral</Badge>
          <Badge tone="brand">Brand</Badge>
          <Badge tone="success">In stock</Badge>
          <Badge tone="danger">Sold out</Badge>
          <Badge tone="inverse">New</Badge>
        </Row>
      </Block>

      <Block title="Price">
        <Row label="States">
          <Price amount={129900} />
          <Price amount={129900} compareAt={149900} />
          <Price amount={95000} max={160000} />
          <Price amount={4900} size="sm" />
          <Price amount={1850000} size="lg" />
          <Price amount={1250} currency="USD" />
        </Row>
      </Block>

      <Block title="Links">
        <Row label="Variants">
          <Link href="/playground">Underline</Link>
          <Link href="/playground" variant="nav">
            Nav
          </Link>
          <Link href="/playground" variant="quiet">
            Quiet
          </Link>
          <Link href="https://example.com">External (new tab)</Link>
        </Row>
      </Block>

      <Block title="Layout">
        <Split ratio="7/5" align="center">
          <div className="aspect-[4/3] rounded-sf-lg bg-neutral-200" />
          <div>
            <p className="label text-ink-muted">Split 7/5</p>
            <p className="body mt-s1">Editorial: image wide, copy narrow. Use `flip` to mirror.</p>
          </div>
        </Split>
        <Rule className="my-s6" />
        <CardGrid>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="aspect-[4/5] rounded-sf-md bg-neutral-200" />
          ))}
        </CardGrid>
      </Block>

      <Block title="Empty, loading and error states">
        <div className="grid gap-s3 md:grid-cols-3">
          <div className="rounded-sf-lg border border-dashed border-line-strong p-s5 text-center">
            <p className="display display-md">Nothing here yet</p>
            <p className="body body-sm mt-s1 text-ink-muted">Empty state: a headline, one line of help, one action.</p>
            <Button variant="secondary" className="mt-s3">
              Browse products
            </Button>
          </div>
          <div className="space-y-s2 rounded-sf-lg border border-line p-s3" aria-busy>
            <div className="aspect-[4/5] animate-pulse rounded-sf-md bg-neutral-200" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-200" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-neutral-200" />
            <p className="text-t-xs text-ink-subtle">Loading: skeleton matches the final layout exactly.</p>
          </div>
          <div className="rounded-sf-lg border border-danger/30 bg-danger-soft p-s3" role="alert">
            <p className="font-medium text-danger">Something went wrong</p>
            <p className="body body-sm mt-s1 text-danger">Error state: say what happened and what to do next.</p>
            <Button variant="secondary" size="md" className="mt-s2">
              Try again
            </Button>
          </div>
        </div>
      </Block>

      <Section tone="ink" space="lg">
        <Container>
          <SectionHeading eyebrow="Inverse" title="Sections can be ink-toned" lead="Text switches to canvas; keep contrast high and copy short." />
          <Row label="" className="mt-s4">
            <Button variant="secondary">Secondary on ink</Button>
            <Badge tone="brand">Brand badge</Badge>
          </Row>
        </Container>
      </Section>
    </>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Section space="md" tone="surface" className="border-t border-line">
      <Container>
        <h2 className="label mb-s4 text-ink-muted">{title}</h2>
        {children}
      </Container>
    </Section>
  );
}

function Row({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`mb-s3 flex flex-wrap items-center gap-s2 ${className ?? ""}`}>
      {label ? <span className="w-24 text-t-xs text-ink-subtle">{label}</span> : null}
      {children}
    </div>
  );
}
