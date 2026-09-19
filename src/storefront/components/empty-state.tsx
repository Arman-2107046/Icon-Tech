import type { ComponentType, ReactNode } from "react";
import { Button } from "@/src/storefront/components/ui";
import { cx } from "@/src/storefront/lib/cx";

/**
 * One empty/error state for the whole storefront: illustration, a short
 * heading, one line of help, and a primary (optionally secondary) action.
 * Illustrations live in ./art, one component each.
 */
export type { ArtProps } from "./art";

export function EmptyState({
  art: Art,
  title,
  body,
  action,
  secondary,
  compact = false,
  className,
  children,
  testId,
}: {
  /** One of the components in ./art. */
  art: ComponentType<{ className?: string }>;
  title: string;
  body?: string;
  action?: { label: string; href?: string; onClick?: () => void };
  secondary?: { label: string; href: string };
  compact?: boolean;
  className?: string;
  children?: ReactNode;
  testId?: string;
}) {
  return (
    <div className={cx("flex flex-col items-center text-center", compact ? "px-s3 py-s6" : "px-s3 py-s10", className)} data-testid={testId}>
      <Art className={compact ? "size-28" : "size-40"} />
      <p className={cx("display mt-s4", compact ? "display-md" : "display-xl")}>{title}</p>
      {body ? <p className={cx("body mt-s1 max-w-sm text-ink-muted", compact && "body-sm")}>{body}</p> : null}
      {children}
      {action || secondary ? (
        <div className="mt-s4 flex flex-wrap justify-center gap-s2">
          {action ? (
            action.href ? (
              <Button href={action.href} onClick={action.onClick} variant={compact ? "secondary" : "primary"}>
                {action.label}
              </Button>
            ) : (
              <Button type="button" onClick={action.onClick} variant={compact ? "secondary" : "primary"}>
                {action.label}
              </Button>
            )
          ) : null}
          {secondary ? (
            <Button href={secondary.href} variant="ghost">
              {secondary.label}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
