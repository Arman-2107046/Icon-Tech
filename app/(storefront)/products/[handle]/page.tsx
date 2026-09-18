import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getStorefrontProduct, toProductView } from "@/src/modules/catalog";
import { Container, Section } from "@/src/storefront/components/layout";
import { ProductView } from "@/src/storefront/components/product/product-view";

export async function generateMetadata({ params }: PageProps<"/products/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const product = await getStorefrontProduct(handle);
  if (!product) return {};
  return { title: product.seoTitle ?? product.title, description: product.seoDescription ?? product.description.split(". ")[0] };
}

/** Static shell; the product (params) and the requested variant (searchParams) stream in. */
export default function ProductPage({ params, searchParams }: PageProps<"/products/[handle]">) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ProductContent({ params, searchParams }: PageProps<"/products/[handle]">) {
  const [{ handle }, query] = await Promise.all([params, searchParams]);
  const product = await getStorefrontProduct(handle);
  if (!product) notFound();
  const view = toProductView(product);
  const requested = typeof query.variant === "string" ? query.variant : null;
  const primaryTag = product.tags[0];

  return (
    <Section space="md">
      <Container>
        <nav aria-label="Breadcrumb" className="mb-s4 text-t-sm text-ink-muted">
          <ol className="flex flex-wrap items-center gap-s1">
            <li>
              <Link href="/" className="hover:text-ink">
                Home
              </Link>
            </li>
            {primaryTag ? (
              <>
                <li aria-hidden>/</li>
                <li>
                  <Link href={`/collections/${primaryTag}`} className="capitalize hover:text-ink">
                    {primaryTag}
                  </Link>
                </li>
              </>
            ) : null}
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-ink">
              {product.title}
            </li>
          </ol>
        </nav>

        <ProductView product={view} requestedVariantId={requested} />

        {product.description ? (
          <div className="mt-s10 grid gap-s4 border-t border-line pt-s8 lg:grid-cols-12">
            <h2 className="display display-md lg:col-span-4">About this product</h2>
            <div className="prose-sf lg:col-span-7 lg:col-start-6" dangerouslySetInnerHTML={{ __html: view.descriptionHtml }} />
          </div>
        ) : null}
      </Container>
    </Section>
  );
}

function ProductSkeleton() {
  return (
    <Section space="md">
      <Container>
        <div className="h-4 w-40 animate-pulse rounded bg-neutral-200" />
        <div className="mt-s4 grid gap-s6 lg:grid-cols-12 lg:gap-s8" aria-busy>
          <div className="aspect-[4/5] animate-pulse rounded-sf-xl bg-neutral-200 lg:col-span-7" />
          <div className="space-y-s3 lg:col-span-5">
            <div className="h-4 w-24 animate-pulse rounded bg-neutral-200" />
            <div className="h-12 w-3/4 animate-pulse rounded bg-neutral-200" />
            <div className="h-6 w-32 animate-pulse rounded bg-neutral-200" />
            <div className="mt-s5 h-13 w-full animate-pulse rounded-sf-full bg-neutral-200" />
          </div>
        </div>
      </Container>
    </Section>
  );
}
