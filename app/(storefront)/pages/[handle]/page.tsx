import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { renderMarkdown } from "@/src/lib/markdown";
import { getPublishedPage } from "@/src/modules/content";
import { Container, Section } from "@/src/storefront/components/layout";

export async function generateMetadata({ params }: PageProps<"/pages/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const page = await getPublishedPage(handle);
  if (!page) return {};
  return { title: page.seoTitle ?? page.title, description: page.seoDescription ?? undefined, alternates: { canonical: `/pages/${handle}` } };
}

export default function ContentPage({ params }: PageProps<"/pages/[handle]">) {
  return (
    <Suspense fallback={<Skeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/pages/[handle]">["params"] }) {
  const { handle } = await params;
  const page = await getPublishedPage(handle);
  if (!page) notFound();
  return (
    <Section space="lg">
      <Container width="narrow">
        <h1 className="display display-3xl">{page.title}</h1>
        <div className="prose-sf mt-s6" dangerouslySetInnerHTML={{ __html: renderMarkdown(page.body) }} />
      </Container>
    </Section>
  );
}

function Skeleton() {
  return (
    <Section space="lg">
      <Container width="narrow">
        <div className="h-12 w-2/3 animate-pulse rounded bg-neutral-200" />
        <div className="mt-s6 space-y-s2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-neutral-200" style={{ width: `${90 - (i % 3) * 15}%` }} />
          ))}
        </div>
      </Container>
    </Section>
  );
}
