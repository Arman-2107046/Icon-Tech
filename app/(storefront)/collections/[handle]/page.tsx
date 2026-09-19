import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCollectionFacets, getManualOrder, getStorefrontCollection, listCollectionProducts } from "@/src/modules/catalog";
import { collectionQueryToParams, parseCollectionQuery } from "@/src/modules/catalog/types";
import { ActiveFilters, CollectionFilters } from "@/src/storefront/components/collection/filters";
import { Pagination } from "@/src/storefront/components/collection/pagination";
import { SortSelect } from "@/src/storefront/components/collection/sort-select";
import { CardGrid, Container, Section } from "@/src/storefront/components/layout";
import { ProductCard } from "@/src/storefront/components/product-card";
import { EmptyState } from "@/src/storefront/components/empty-state";

export async function generateMetadata({ params }: PageProps<"/collections/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const collection = await getStorefrontCollection(handle);
  if (!collection) return {};
  return {
    title: collection.seoTitle ?? collection.title,
    description: collection.seoDescription ?? collection.description ?? undefined,
    alternates: { canonical: `/collections/${handle}` },
    openGraph: { type: "website", title: collection.title, url: `/collections/${handle}` },
  };
}

/**
 * Collection listing. `params` and `searchParams` are runtime data, so the
 * page itself is a static shell and everything URL-dependent streams in
 * behind Suspense: the header first, then the filtered grid.
 */
export default function CollectionPage({ params, searchParams }: PageProps<"/collections/[handle]">) {
  return (
    <Suspense fallback={<HeaderSkeleton />}>
      <CollectionContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function CollectionContent({ params, searchParams }: PageProps<"/collections/[handle]">) {
  const { handle } = await params;
  const collection = await getStorefrontCollection(handle);
  if (!collection) notFound();

  return (
    <>
      <Section space="md" className="border-b border-line">
        <Container>
          <p className="label text-ink-muted">Collection</p>
          <h1 className="display display-3xl mt-s1">{collection.title}</h1>
          {collection.description ? <p className="body body-lg mt-s2 max-w-2xl text-ink-muted">{collection.description}</p> : null}
        </Container>
      </Section>
      <Section space="md">
        <Container>
          <Suspense fallback={<GridSkeleton />}>
            <Listing handle={handle} collectionId={collection.id} type={collection.type} membership={collection.membership} searchParams={searchParams} />
          </Suspense>
        </Container>
      </Section>
    </>
  );
}

function HeaderSkeleton() {
  return (
    <>
      <Section space="md" className="border-b border-line">
        <Container>
          <div className="h-4 w-20 animate-pulse rounded bg-neutral-200" />
          <div className="mt-s2 h-12 w-72 animate-pulse rounded bg-neutral-200" />
        </Container>
      </Section>
      <Section space="md">
        <Container>
          <GridSkeleton />
        </Container>
      </Section>
    </>
  );
}

async function Listing({
  handle,
  collectionId,
  type,
  membership,
  searchParams,
}: {
  handle: string;
  collectionId: string;
  type: "MANUAL" | "RULE";
  membership: NonNullable<Awaited<ReturnType<typeof getStorefrontCollection>>>["membership"];
  searchParams: PageProps<"/collections/[handle]">["searchParams"];
}) {
  const basePath = `/collections/${handle}`;
  const query = parseCollectionQuery(await searchParams);
  if (!membership) return <Empty basePath={basePath} message="This collection has no rules yet." />;

  const [facets, manualOrder] = await Promise.all([getCollectionFacets(membership), getManualOrder(collectionId, type)]);
  const listing = await listCollectionProducts(membership, query, manualOrder);
  const params = collectionQueryToParams({ ...query, page: listing.page }).toString();

  return (
    <div className="grid gap-s4 lg:grid-cols-12 lg:gap-s6">
      <div className="lg:col-span-3">
        <CollectionFilters basePath={basePath} facets={facets} query={query} />
      </div>
      <div className="lg:col-span-9">
        <div className="flex flex-wrap items-center justify-between gap-s2">
          <p className="text-t-sm text-ink-muted" data-testid="result-count">
            {listing.total} product{listing.total === 1 ? "" : "s"}
          </p>
          <SortSelect basePath={basePath} current={query.sort} params={params} />
        </div>
        <div className="mt-s2">
          <ActiveFilters basePath={basePath} query={query} />
        </div>
        {listing.products.length === 0 ? (
          <Empty basePath={basePath} message="Nothing matches those filters." />
        ) : (
          <CardGrid className="mt-s4" dense>
            {listing.products.map((p, i) => (
              <ProductCard key={p.id} product={p} priority={i === 0} />
            ))}
          </CardGrid>
        )}
        <div className="mt-s8">
          <Pagination basePath={basePath} params={params} page={listing.page} pageCount={listing.pageCount} />
        </div>
      </div>
    </div>
  );
}

function Empty({ basePath, message }: { basePath: string; message: string }) {
  return (
    <div className="mt-s4 rounded-sf-lg border border-dashed border-line-strong">
      <EmptyState compact art="search" title={message} body="Loosen a filter or two, or clear them all to see everything in this collection." action={{ label: "Clear filters", href: basePath }} testId="collection-empty" />
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid gap-s4 lg:grid-cols-12 lg:gap-s6" aria-busy>
      <div className="hidden space-y-s2 lg:col-span-3 lg:block">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-5 w-2/3 animate-pulse rounded bg-neutral-200" />
        ))}
      </div>
      <div className="lg:col-span-9">
        <div className="h-5 w-24 animate-pulse rounded bg-neutral-200" />
        <CardGrid className="mt-s4" dense>
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="space-y-s2">
              <div className="aspect-[4/5] animate-pulse rounded-sf-lg bg-neutral-200" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-200" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-neutral-200" />
            </div>
          ))}
        </CardGrid>
      </div>
    </div>
  );
}
