import Link from "next/link";

/** Opens search. Becomes the instant-results trigger in item 100. */
export function SearchTrigger() {
  return (
    <Link href="/search" className="inline-flex size-11 items-center justify-center rounded-sf-full text-ink transition-colors hover:bg-neutral-100" aria-label="Search">
      <svg className="size-5" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.75" />
        <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    </Link>
  );
}
