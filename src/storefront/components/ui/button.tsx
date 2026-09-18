import Link from "next/link";
import { cx as cn } from "@/src/storefront/lib/cx";
import type { ComponentProps, ReactNode } from "react";

/**
 * Three variants only: primary (solid brand), secondary (outlined) and
 * ghost (text). Sizes md/lg. Renders a <button>, or a <Link> when `href`
 * is given, with identical styling.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sf-full font-medium transition-[background-color,color,border-color,box-shadow,transform] duration-200 ease-out-expo " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas " +
  "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 active:scale-[0.98]";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-ink text-canvas hover:bg-neutral-800 shadow-e1",
  secondary: "border border-line-strong bg-surface text-ink hover:border-ink hover:bg-neutral-100",
  ghost: "text-ink hover:bg-neutral-100",
};

const sizes: Record<ButtonSize, string> = {
  md: "h-11 px-s3 text-t-sm",
  lg: "h-13 px-s4 text-t-base",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string): string {
  return cn(base, variants[variant], sizes[size], className);
}

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  className?: string;
  children: ReactNode;
};

type ButtonAsButton = CommonProps & Omit<ComponentProps<"button">, "className" | "children"> & { href?: undefined };
type ButtonAsLink = CommonProps & Omit<ComponentProps<typeof Link>, "className" | "children"> & { href: string };

export function Button(props: ButtonAsButton | ButtonAsLink) {
  const { variant = "primary", size = "md", loading = false, className, children, ...rest } = props;
  const classes = buttonClasses(variant, size, className);
  const content = (
    <>
      {loading ? <Spinner /> : null}
      <span className={loading ? "opacity-70" : undefined}>{children}</span>
    </>
  );
  if ("href" in rest && rest.href !== undefined) {
    const { href, ...linkRest } = rest as ButtonAsLink;
    return (
      <Link href={href} className={classes} aria-disabled={loading || undefined} {...linkRest}>
        {content}
      </Link>
    );
  }
  const { type = "button", disabled, ...buttonRest } = rest as ButtonAsButton;
  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...buttonRest}>
      {content}
    </button>
  );
}

function Spinner() {
  return (
    <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
