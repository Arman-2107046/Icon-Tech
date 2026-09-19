"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { instantSearch, type InstantHit } from "@/src/modules/catalog/actions";
import { formatMoney, money } from "@/src/lib/money";
import { inputClasses } from "@/src/storefront/components/ui/input";
import { cx } from "@/src/storefront/lib/cx";

/**
 * Header search: a button reveals an input; typing (debounced) shows up to
 * six ranked hits with thumbnails; Enter goes to /search. Out-of-order
 * responses are ignored, arrow keys move through results, Escape closes.
 */
export function SearchTrigger() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<InstantHit[]>([]);
  const [active, setActive] = useState(-1);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listId = useId();

  const onChange = (value: string) => {
    setQuery(value);
    setActive(-1);
    if (timer.current) clearTimeout(timer.current);
    if (value.trim().length < 2) {
      setHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(async () => {
      const mine = ++seq.current;
      const result = await instantSearch(value);
      if (mine !== seq.current) return;
      setSearching(false);
      setHits(result.ok ? result.data : []);
    }, 200);
  };

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const submit = () => {
    const chosen = active >= 0 ? hits[active] : undefined;
    if (chosen) router.push(`/products/${chosen.handle}`);
    else if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="inline-flex size-11 items-center justify-center rounded-sf-full text-ink transition-colors hover:bg-neutral-100" aria-label="Search" aria-expanded={open}>
        <svg className="size-5" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.75" />
          <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-s1 w-[min(92vw,420px)] rounded-sf-lg border border-line bg-surface p-s1 shadow-e3" data-testid="instant-search">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              else if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, hits.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, -1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Search products…"
            aria-label="Search products"
            aria-controls={listId}
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            role="combobox"
            aria-expanded={hits.length > 0}
            aria-autocomplete="list"
            className={cx(inputClasses, "h-11")}
          />
          {query.trim().length >= 2 ? (
            <ul id={listId} role="listbox" className="mt-s1 max-h-[60vh] overflow-y-auto" aria-label="Results">
              {searching && hits.length === 0 ? <li className="px-s2 py-s1 text-t-sm text-ink-muted">Searching…</li> : null}
              {!searching && hits.length === 0 ? <li className="px-s2 py-s1 text-t-sm text-ink-muted">No matches.</li> : null}
              {hits.map((h, i) => (
                <li key={h.id} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                  <Link
                    href={`/products/${h.handle}`}
                    onClick={() => setOpen(false)}
                    onMouseEnter={() => setActive(i)}
                    className={cx("flex items-center gap-s2 rounded-sf-md px-s1 py-s1 transition-colors", i === active ? "bg-neutral-100" : "hover:bg-neutral-100")}
                  >
                    <span className="relative size-12 shrink-0 overflow-hidden rounded-sf-sm bg-neutral-100">{h.image ? <Image src={h.image} alt="" fill sizes="48px" className="object-cover" /> : null}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-t-sm font-medium">{h.title}</span>
                      {h.vendor ? <span className="block truncate text-t-xs text-ink-muted">{h.vendor}</span> : null}
                    </span>
                    <span className="text-t-sm tabular-nums">{formatMoney(money(h.price))}</span>
                  </Link>
                </li>
              ))}
              {hits.length ? (
                <li className="border-t border-line">
                  <Link href={`/search?q=${encodeURIComponent(query.trim())}`} onClick={() => setOpen(false)} className="block px-s2 py-s1 text-t-sm text-ink-muted hover:text-ink">
                    All results for “{query.trim()}” →
                  </Link>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
