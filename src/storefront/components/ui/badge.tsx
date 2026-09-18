import { cx as cn } from "@/src/storefront/lib/cx";
import type { ComponentProps, ReactNode } from "react";

export type BadgeTone = "neutral" | "brand" | "success" | "danger" | "inverse";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-neutral-100 text-ink-muted",
  brand: "bg-brand-soft text-brand-hover",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  inverse: "bg-ink text-canvas",
};

export function Badge({ tone = "neutral", className, children, ...rest }: { tone?: BadgeTone; className?: string; children: ReactNode } & Omit<ComponentProps<"span">, "className" | "children">) {
  return (
    <span className={cn("label inline-flex h-6 items-center rounded-sf-full px-s1", tones[tone], className)} {...rest}>
      {children}
    </span>
  );
}
