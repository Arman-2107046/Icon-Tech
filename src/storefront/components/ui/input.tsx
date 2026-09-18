import { cx as cn } from "@/src/storefront/lib/cx";
import { useId, type ComponentProps, type ReactNode } from "react";

const control =
  "h-12 w-full rounded-sf-md border border-line-strong bg-surface px-s2 text-t-base text-ink placeholder:text-ink-subtle " +
  "transition-[border-color,box-shadow] duration-200 ease-out-expo " +
  "focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand/30 " +
  "aria-invalid:border-danger aria-invalid:focus:ring-danger/30 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-ink-muted";

export const inputClasses = control;

type FieldShellProps = {
  label: string;
  hint?: string;
  error?: string;
  /** Visually hide the label (still read by screen readers). */
  hideLabel?: boolean;
  className?: string;
};

/** Label + control + hint/error. `render` receives the ids to wire up. */
export function FieldShell({ label, hint, error, hideLabel, className, children }: FieldShellProps & { children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col gap-s1", className)}>
      <label htmlFor={id} className={cn("text-t-sm font-medium text-ink", hideLabel && "sr-only")}>
        {label}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error ? (
        <p id={errorId} role="alert" className="text-t-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-t-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ label, hint, error, hideLabel, className, ...props }: FieldShellProps & Omit<ComponentProps<"input">, "id" | "className">) {
  return (
    <FieldShell label={label} hint={hint} error={error} hideLabel={hideLabel} className={className}>
      {({ id, describedBy, invalid }) => <input id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} className={control} {...props} />}
    </FieldShell>
  );
}

export function Textarea({ label, hint, error, hideLabel, className, ...props }: FieldShellProps & Omit<ComponentProps<"textarea">, "id" | "className">) {
  return (
    <FieldShell label={label} hint={hint} error={error} hideLabel={hideLabel} className={className}>
      {({ id, describedBy, invalid }) => <textarea id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} className={cn(control, "h-auto min-h-28 py-s1 leading-relaxed")} {...props} />}
    </FieldShell>
  );
}
