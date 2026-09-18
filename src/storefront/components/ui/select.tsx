import { cx as cn } from "@/src/storefront/lib/cx";
import type { ComponentProps } from "react";
import { FieldShell, inputClasses } from "./input";

export type SelectOption = { value: string; label: string; disabled?: boolean };

/** Native <select> styled to match Input, with a custom chevron. */
export function Select({
  label,
  hint,
  error,
  hideLabel,
  className,
  options,
  placeholder,
  ...props
}: {
  label: string;
  hint?: string;
  error?: string;
  hideLabel?: boolean;
  className?: string;
  options: SelectOption[];
  placeholder?: string;
} & Omit<ComponentProps<"select">, "id" | "className" | "children">) {
  return (
    <FieldShell label={label} hint={hint} error={error} hideLabel={hideLabel} className={className}>
      {({ id, describedBy, invalid }) => (
        <span className="relative block">
          <select id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} className={cn(inputClasses, "appearance-none pr-s5")} {...props}>
            {placeholder ? (
              <option value="" disabled>
                {placeholder}
              </option>
            ) : null}
            {options.map((o) => (
              <option key={o.value} value={o.value} disabled={o.disabled}>
                {o.label}
              </option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-s2 top-1/2 size-4 -translate-y-1/2 text-ink-muted" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </FieldShell>
  );
}
