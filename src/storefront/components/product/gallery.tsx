"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { ViewMedia } from "@/src/modules/catalog/types";
import { cx } from "@/src/storefront/lib/cx";

/**
 * Product gallery. Desktop: main image with cursor-following zoom and a
 * thumbnail rail. Mobile: horizontal scroll-snap swiper with dots. The
 * active index resets when the media list changes (variant switch).
 */
export function Gallery({ media, title }: { media: ViewMedia[]; title: string }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // A variant switch swaps the list; start again from its first image.
  const key = media.map((m) => m.id).join(",");
  const [seenKey, setSeenKey] = useState(key);
  if (key !== seenKey) {
    setSeenKey(key);
    setActive(0);
  }

  // Mobile: keep `active` in sync with the swiped slide.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => {
      const index = Math.round(track.scrollLeft / track.clientWidth);
      setActive((a) => (a === index ? a : index));
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (index: number) => {
    setActive(index);
    trackRef.current?.scrollTo({ left: index * trackRef.current.clientWidth, behavior: "smooth" });
  };

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setZoom({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
  };

  if (media.length === 0) {
    return <div className="flex aspect-[4/5] items-center justify-center rounded-sf-xl bg-neutral-100 text-t-sm text-ink-subtle">No image</div>;
  }
  const current = media[Math.min(active, media.length - 1)] ?? media[0];

  return (
    <div className="lg:grid lg:grid-cols-[72px_1fr] lg:gap-s2">
      {/* Thumbnails (desktop) */}
      <ul className="hidden lg:flex lg:flex-col lg:gap-s1" aria-label="Product images">
        {media.map((m, i) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show image ${i + 1}`}
              aria-current={i === active ? "true" : undefined}
              className={cx("relative block aspect-[4/5] w-full overflow-hidden rounded-sf-md border transition-colors", i === active ? "border-ink" : "border-line hover:border-line-strong")}
            >
              <Image src={m.url} alt="" fill sizes="72px" className="object-cover" />
            </button>
          </li>
        ))}
      </ul>

      {/* Main image with hover zoom (desktop) */}
      <div
        className="relative hidden aspect-[4/5] cursor-zoom-in overflow-hidden rounded-sf-xl bg-neutral-100 lg:block"
        onMouseMove={onMove}
        onMouseLeave={() => setZoom(null)}
        data-testid="gallery-main"
      >
        {current ? (
          <Image
            key={current.id}
            src={current.url}
            alt={current.alt || title}
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover transition-transform duration-200 ease-out"
            style={zoom ? { transform: "scale(2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
          />
        ) : null}
      </div>

      {/* Swiper (mobile) */}
      <div className="lg:hidden">
        <div ref={trackRef} className="flex snap-x snap-mandatory overflow-x-auto rounded-sf-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-roledescription="carousel" aria-label="Product images">
          {media.map((m, i) => (
            <div key={m.id} className="relative aspect-[4/5] w-full shrink-0 snap-center bg-neutral-100" aria-roledescription="slide" aria-label={`${i + 1} of ${media.length}`}>
              <Image src={m.url} alt={m.alt || title} fill priority={i === 0} sizes="100vw" className="object-cover" />
            </div>
          ))}
        </div>
        {media.length > 1 ? (
          <div className="mt-s2 flex justify-center gap-s1" role="tablist" aria-label="Choose image">
            {media.map((m, i) => (
              <button key={m.id} type="button" role="tab" aria-selected={i === active} aria-label={`Image ${i + 1}`} onClick={() => scrollTo(i)} className={cx("size-2 rounded-sf-full transition-colors", i === active ? "bg-ink" : "bg-neutral-300")} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
