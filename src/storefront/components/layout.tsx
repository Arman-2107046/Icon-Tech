import type { ComponentProps, ElementType, ReactNode } from "react";
import { cx } from "@/src/storefront/lib/cx";
import { Reveal, RevealGroup } from "@/src/storefront/motion/reveal";

/**
 * Layout primitives. Sections carry the vertical rhythm (96–160px on
 * desktop, scaled down on phones); Container carries the horizontal
 * gutter and max width; the grid helpers produce the intentionally
 * asymmetric compositions the storefront uses instead of equal card rows.
 */

type Polymorphic<T extends ElementType> = { as?: T; className?: string; children?: ReactNode } & Omit<ComponentProps<T>, "as" | "className" | "children">;

const CONTAINER_WIDTHS = {
  narrow: "max-w-[720px]",
  default: "max-w-[1280px]",
  wide: "max-w-[1440px]",
  full: "max-w-none",
} as const;

export function Container<T extends ElementType = "div">({ as, width = "default", className, children, ...rest }: Polymorphic<T> & { width?: keyof typeof CONTAINER_WIDTHS }) {
  const Tag = (as ?? "div") as ElementType;
  return (
    <Tag className={cx("mx-auto w-full px-s2 sm:px-s3 lg:px-s6", CONTAINER_WIDTHS[width], className)} {...rest}>
      {children}
    </Tag>
  );
}

const SECTION_SPACE = {
  /** 96px desktop / 48px mobile */
  md: "py-s6 lg:py-s12",
  /** 128px desktop / 64px mobile */
  lg: "py-s8 lg:py-s16",
  /** 160px desktop / 80px mobile */
  xl: "py-s10 lg:py-s20",
  none: "",
} as const;

export function Section<T extends ElementType = "section">({
  as,
  space = "md",
  tone = "canvas",
  className,
  children,
  ...rest
}: Polymorphic<T> & { space?: keyof typeof SECTION_SPACE; tone?: "canvas" | "surface" | "ink" }) {
  const Tag = (as ?? "section") as ElementType;
  return (
    <Tag
      className={cx(
        SECTION_SPACE[space],
        tone === "surface" && "bg-surface",
        tone === "ink" && "bg-ink text-canvas",
        tone === "canvas" && "bg-canvas",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/**
 * Twelve-column grid with named asymmetric presets:
 *  - "7/5"   editorial: wide image, narrower text (swap with `flip`)
 *  - "8/4"   feature + sidebar
 *  - "5/7"   text-first hero
 *  - "cards" product cards: 2 → 3 → 4 columns, never a perfect square wall
 */
const SPLITS = {
  "7/5": ["lg:col-span-7", "lg:col-span-5"],
  "8/4": ["lg:col-span-8", "lg:col-span-4"],
  "5/7": ["lg:col-span-5", "lg:col-span-7"],
} as const;

export function Split({ ratio = "7/5", flip = false, align = "start", gap = "lg", className, children }: { ratio?: keyof typeof SPLITS; flip?: boolean; align?: "start" | "center" | "end"; gap?: "md" | "lg" | "xl"; className?: string; children: [ReactNode, ReactNode] }) {
  const [a, b] = SPLITS[ratio];
  const [first, second] = children;
  return (
    <div className={cx("grid grid-cols-1 lg:grid-cols-12", gap === "md" ? "gap-s3 lg:gap-s4" : gap === "lg" ? "gap-s4 lg:gap-s8" : "gap-s6 lg:gap-s12", align === "center" && "items-center", align === "end" && "items-end", className)}>
      <div className={cx(a, flip && "lg:order-2")}>{first}</div>
      <div className={cx(b, flip && "lg:order-1")}>{second}</div>
    </div>
  );
}

export function CardGrid({ className, children, dense = false }: { className?: string; children: ReactNode; dense?: boolean }) {
  return <RevealGroup className={cx("grid grid-cols-2 gap-x-s2 gap-y-s5 md:grid-cols-3 md:gap-x-s3 md:gap-y-s8", dense ? "lg:grid-cols-4" : "lg:grid-cols-3 xl:grid-cols-4", className)}>{children}</RevealGroup>;
}

/** Eyebrow + heading + optional lead, left-aligned by default. */
export function SectionHeading({ eyebrow, title, lead, align = "start", size = "2xl", className }: { eyebrow?: string; title: string; lead?: string; align?: "start" | "center"; size?: "xl" | "2xl" | "3xl"; className?: string }) {
  return (
    <Reveal className={cx("flex flex-col gap-s2", align === "center" && "items-center text-center", className)}>
      {eyebrow ? <span className="label text-ink-muted">{eyebrow}</span> : null}
      <h2 className={cx("display", `display-${size}`)}>{title}</h2>
      {lead ? <p className="body body-lg text-ink-muted">{lead}</p> : null}
    </Reveal>
  );
}

/** Horizontal rule with generous breathing room. */
export function Rule({ className }: { className?: string }) {
  return <hr className={cx("border-0 border-t border-line", className)} />;
}
