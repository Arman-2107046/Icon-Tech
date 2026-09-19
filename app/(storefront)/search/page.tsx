import type { Metadata } from "next";
import { Suspense } from "react";
import { searchProducts } from "@/src/modules/catalog";
import { Pagination } from "@/src/storefront/components/collection/pagination";
import { CardGrid, Container, Section } from "@/src/storefront/components/layout";
import { ProductCard } from "@/src/storefront/components/product-card";
import { SearchArt } from "@/src/storefront/components/art";
import { EmptyState } from "@/src/storefront/components/empty-state";
import { ProductGridSkeleton } from "@/src/storefront/components/skeletons";
import { Button } from "@/src/storefront/components/ui";
import { inputClasses } from "@/src/storefront/components/ui/input";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <Section space="md">
      <Container>
        <Suspense fallback={<Skeleton />}>
          <Results searchParams={searchParams} />
        </Suspense>
      </Container>
    </Section>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const page = Number.parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1;
  const result = q ? await searchProducts(q, page) : null;
  const qs = new URLSearchParams({ q }).toString();

  return (
    <>
      <form method="get" action="/search" role="search" className="flex max-w-xl gap-s1">
        <label htmlFor="search-q" className="sr-only">
          Search products
        </label>
        <input id="search-q" name="q" type="search" defaultValue={q} placeholder="Search products…" autoFocus={!q} className={inputClasses} />
        <Button type="submit">Search</Button>
      </form>

      {result ? (
        <div className="mt-s5">
          <p className="text-t-sm text-ink-muted" data-testid="search-summary">
            {result.total === 0 ? (
              <>No results for “{q}”.</>
            ) : (
              <>
                {result.total} result{result.total === 1 ? "" : "s"} for “{q}”{result.mode === "fuzzy" ? " (showing close matches)" : ""}
              </>
            )}
          </p>
          {result.products.length ? (
            <CardGrid className="mt-s4" dense>
              {result.products.map((p, i) => (
                <ProductCard key={p.id} product={p} priority={i === 0} />
              ))}
            </CardGrid>
          ) : (
            <div className="mt-s4 rounded-sf-lg border border-dashed border-line-strong">
              <EmptyState compact art={SearchArt} title="Nothing matched" body="Try a shorter word, a brand name, or browse the collections." action={{ label: "New arrivals", href: "/collections/new-arrivals" }} testId="search-empty" />
            </div>
          )}
          <div className="mt-s8">
            <Pagination basePath="/search" params={qs} page={result.page} pageCount={result.pageCount} />
          </div>
        </div>
      ) : (
        <p className="body mt-s5 text-ink-muted">Search by product, brand, or what it does — “usb-c”, “headphones”, “desk lamp”.</p>
      )}
    </>
  );
}

/** Mirrors Results: the search row, the summary line, then the dense grid. */
function Skeleton() {
  return (
    <div aria-busy>
      <div className="flex max-w-xl gap-s1">
        <div className="h-12 flex-1 animate-pulse rounded-sf-md bg-neutral-200" />
        <div className="h-12 w-24 animate-pulse rounded-sf-full bg-neutral-200" />
      </div>
      <div className="mt-s5 h-4 w-40 animate-pulse rounded bg-neutral-200" />
      <ProductGridSkeleton className="mt-s4" />
    </div>
  );
}
