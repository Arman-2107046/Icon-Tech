"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import { Button } from "@/src/admin/components/ui/button";
import { Checkbox } from "@/src/admin/components/ui/checkbox";
import { Input } from "@/src/admin/components/ui/input";
import { Label } from "@/src/admin/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/admin/components/ui/select";
import { Textarea } from "@/src/admin/components/ui/textarea";
import { cn } from "@/src/admin/lib/utils";
import { useFieldError, useFormState } from "./action-form";

/** Label + control + inline error. Error text comes from the form context. */
export function Field({
  name,
  label,
  hint,
  className,
  children,
}: {
  name: string;
  label: string;
  hint?: string;
  className?: string;
  children: (props: { id: string; invalid: boolean; describedBy: string | undefined }) => ReactNode;
}) {
  const id = useId();
  const error = useFieldError(name);
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children({ id, invalid: Boolean(error), describedBy })}
      {error ? (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type Common = { name: string; label: string; hint?: string; className?: string };

/**
 * defaultValue from the last failed submission wins over the prop. The
 * returned key changes with it so the control remounts instead of having
 * its uncontrolled default swapped underneath it.
 */
function useDefaultValue(name: string, fallback: string | number | readonly string[] | undefined) {
  const { values, hasValues } = useFormState();
  const value = hasValues && name in values ? values[name] : fallback;
  return { value, key: hasValues ? `v:${String(value)}` : "initial" };
}

export function TextField({ name, label, hint, className, defaultValue, ...input }: Common & Omit<ComponentProps<typeof Input>, "name" | "id">) {
  const { value, key } = useDefaultValue(name, defaultValue);
  return (
    <Field name={name} label={label} hint={hint} className={className}>
      {({ id, invalid, describedBy }) => (
        <Input key={key} id={id} name={name} defaultValue={value} aria-invalid={invalid} aria-describedby={describedBy} {...input} />
      )}
    </Field>
  );
}

export function TextareaField({ name, label, hint, className, defaultValue, ...input }: Common & Omit<ComponentProps<typeof Textarea>, "name" | "id">) {
  const { value, key } = useDefaultValue(name, defaultValue);
  return (
    <Field name={name} label={label} hint={hint} className={className}>
      {({ id, invalid, describedBy }) => (
        <Textarea key={key} id={id} name={name} defaultValue={value} aria-invalid={invalid} aria-describedby={describedBy} {...input} />
      )}
    </Field>
  );
}

export function SelectField({
  name,
  label,
  hint,
  className,
  options,
  defaultValue,
  placeholder,
}: Common & {
  options: { value: string; label: string }[];
  defaultValue?: string;
  placeholder?: string;
}) {
  const items = Object.fromEntries(options.map((o) => [o.value, o.label]));
  const { value, key } = useDefaultValue(name, defaultValue);
  return (
    <Field name={name} label={label} hint={hint} className={className}>
      {({ id, invalid, describedBy }) => (
        <Select key={key} name={name} items={items} defaultValue={typeof value === "string" ? value : null}>
          <SelectTrigger id={id} aria-invalid={invalid} aria-describedby={describedBy} className="w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </Field>
  );
}

/** Submits "on" when checked; absent when unchecked, like a native checkbox. */
export function CheckboxField({
  name,
  label,
  hint,
  className,
  defaultChecked,
}: Common & { defaultChecked?: boolean }) {
  const id = useId();
  const error = useFieldError(name);
  const { values, hasValues } = useFormState();
  // An unchecked box is absent from FormData, so after a failure "absent" means unchecked.
  const checked = hasValues ? name in values : defaultChecked;
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-2">
        <Checkbox id={id} name={name} defaultChecked={checked} aria-invalid={Boolean(error)} />
        <Label htmlFor={id} className="font-normal">
          {label}
        </Label>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function HiddenField({ name, value }: { name: string; value: string }) {
  return <input type="hidden" name={name} value={value} />;
}

export function SubmitButton({ children = "Save", pendingLabel = "Saving…", ...props }: ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending } = useFormState();
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
