import NextLink from "next/link";
import { cx as cn } from "@/src/storefront/lib/cx";
import type { ComponentProps } from "react";

/**
 * Text link. `underline` (default) for inline links in copy, `nav` for
 * navigation (no underline, hover colour), `quiet` for muted secondary
 * links. External URLs open in a new tab automatically.
 */
export function Link({ variant = "underline", className, href, ...props }: { variant?: "underline" | "nav" | "quiet" } & ComponentProps<typeof NextLink>) {
  const external = typeof href === "string" && /^(https?:)?\/\//.test(href);
  const classes = cn(
    "rounded-sf-sm transition-colors duration-200 ease-out-expo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
    variant === "underline" && "text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink",
    variant === "nav" && "text-ink hover:text-ink-muted",
    variant === "quiet" && "text-ink-muted hover:text-ink",
    className,
  );
  return <NextLink href={href} className={classes} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} {...props} />;
}
