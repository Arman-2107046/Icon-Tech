"use client";

import { createContext, useActionState, useContext, useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import type { ActionResult, FieldErrors } from "@/src/lib/action-result";
import { Input, Select, Textarea } from "@/src/storefront/components/ui";

/**
 * Storefront counterpart of the admin ActionForm: binds a Server Action
 * that returns an ActionResult, shows field errors inline via context and
 * keeps the submitted values when the action fails (React resets
 * uncontrolled fields after every action).
 */
export type FormAction<T> = (prev: ActionResult<T> | null, formData: FormData) => Promise<ActionResult<T>>;

type State<T> = { result: ActionResult<T>; values: Record<string, string> } | null;
type Ctx = { pending: boolean; errors: FieldErrors; rootError: string | null; values: Record<string, string>; failed: boolean };
const FormCtx = createContext<Ctx>({ pending: false, errors: {}, rootError: null, values: {}, failed: false });

export function useForm(): Ctx {
  return useContext(FormCtx);
}

export function Form<T>({ action, onSuccess, className, children }: { action: FormAction<T>; onSuccess?: (data: T) => void; className?: string; children: ReactNode }) {
  const [state, formAction, pending] = useActionState<State<T>, FormData>(async (prev, formData) => {
    const result = await action(prev?.result ?? null, formData);
    const values: Record<string, string> = {};
    formData.forEach((v, k) => {
      if (typeof v === "string" && !(k in values)) values[k] = v;
    });
    return { result, values: result.ok ? {} : values };
  }, null);
  const handled = useRef<State<T>>(null);
  useEffect(() => {
    if (state?.result.ok && handled.current !== state) {
      handled.current = state;
      onSuccess?.(state.result.data);
    }
  }, [state, onSuccess]);
  const failure = state && !state.result.ok ? state.result : null;
  const errors = failure?.fieldErrors ?? {};
  const rootError = failure ? (errors._root ?? (Object.keys(errors).length === 0 ? failure.error : null)) : null;
  return (
    <FormCtx.Provider value={{ pending, errors, rootError, values: state?.values ?? {}, failed: Boolean(failure) }}>
      <form action={formAction} className={className} noValidate>
        {rootError ? (
          <p role="alert" className="mb-s3 rounded-sf-md bg-danger-soft px-s2 py-s1 text-t-sm text-danger">
            {rootError}
          </p>
        ) : null}
        {children}
      </form>
    </FormCtx.Provider>
  );
}

function useDefault(name: string, fallback: string | undefined) {
  const { values, failed } = useForm();
  const value = failed && name in values ? values[name] : fallback;
  return { value, key: failed ? `v:${value ?? ""}` : "initial" };
}

export function FormInput({ name, defaultValue, ...props }: { name: string } & Omit<ComponentProps<typeof Input>, "error" | "name" | "defaultValue"> & { defaultValue?: string }) {
  const { errors } = useForm();
  const { value, key } = useDefault(name, defaultValue);
  return <Input key={key} name={name} defaultValue={value} error={errors[name]} {...props} />;
}

export function FormTextarea({ name, defaultValue, ...props }: { name: string } & Omit<ComponentProps<typeof Textarea>, "error" | "name" | "defaultValue"> & { defaultValue?: string }) {
  const { errors } = useForm();
  const { value, key } = useDefault(name, defaultValue);
  return <Textarea key={key} name={name} defaultValue={value} error={errors[name]} {...props} />;
}

export function FormSelect({ name, defaultValue, ...props }: { name: string } & Omit<ComponentProps<typeof Select>, "error" | "name" | "defaultValue"> & { defaultValue?: string }) {
  const { errors } = useForm();
  const { value, key } = useDefault(name, defaultValue);
  return <Select key={key} name={name} defaultValue={value} error={errors[name]} {...props} />;
}

export function FormCheckbox({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  const { values, failed } = useForm();
  const checked = failed ? name in values : defaultChecked;
  return (
    <label className="flex cursor-pointer items-start gap-s1 text-t-sm text-ink">
      <input key={failed ? `c:${String(checked)}` : "initial"} type="checkbox" name={name} defaultChecked={checked} className="mt-0.5 size-4 rounded-sf-sm border-line-strong accent-ink" />
      {label}
    </label>
  );
}
