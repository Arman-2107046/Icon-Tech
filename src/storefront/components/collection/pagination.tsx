import Link from "next/link";
import { cx } from "@/src/storefront/lib/cx";

export function Pagination({ basePath, params, page, pageCount }: { basePath: string; params: string; page: number; pageCount: number }) {
  if (pageCount <= 1) return null;
  const href = (p: number) => {
    const next = new URLSearchParams(params);
    if (p > 1) next.set("page", String(p));
    else next.delete("page");
    const qs = next.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const link = "inline-flex h-11 min-w-11 items-center justify-center rounded-sf-full px-s2 text-t-sm transition-colors hover:bg-neutral-100";
  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-s1">
      {page > 1 ? (
        <Link href={href(page - 1)} className={link} rel="prev">
          ← Previous
        </Link>
      ) : null}
      {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
        <Link key={p} href={href(p)} className={cx(link, p === page && "bg-ink text-canvas hover:bg-ink")} aria-current={p === page ? "page" : undefined}>
          {p}
        </Link>
      ))}
      {page < pageCount ? (
        <Link href={href(page + 1)} className={link} rel="next">
          Next →
        </Link>
      ) : null}
    </nav>
  );
}
