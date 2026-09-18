"use client";

import { createContext, useActionState, useContext, useEffect, useRef, type ReactNode } from "react";
import type { ActionResult, FieldErrors } from "@/src/lib/action-result";
import { cn } from "@/src/admin/lib/utils";

/**
 * A form bound to a Server Action that returns an ActionResult. Field
 * components read their error from context by name; the root error (a
 * failure with no fieldErrors, or a leftover "_root" key) shows at the top.
 *
 * React resets uncontrolled fields after every action, so the submitted
 * values are kept alongside the result and re-applied as defaultValue when
 * the action failed. The user never loses what they typed.
 */

export type FormAction<T> = (prev: ActionResult<T> | null, formData: FormData) => Promise<ActionResult<T>>;

export type FormValues = Record<string, string>;

type FormContextValue = {
  pending: boolean;
  fieldErrors: FieldErrors;
  rootError: string | null;
  /** Values from the last failed submission; empty otherwise. */
  values: FormValues;
  /** True once a submission has failed, so fields prefer `values` over props. */
  hasValues: boolean;
};

const FormContext = createContext<FormContextValue>({
  pending: false,
  fieldErrors: {},
  rootError: null,
  values: {},
  hasValues: false,
});

export function useFormState(): FormContextValue {
  return useContext(FormContext);
}

export function useFieldError(name: string): string | undefined {
  return useContext(FormContext).fieldErrors[name];
}

type InternalState<T> = { result: ActionResult<T>; values: FormValues } | null;

function collectValues(formData: FormData): FormValues {
  const values: FormValues = {};
  formData.forEach((value, key) => {
    if (typeof value === "string" && !(key in values)) values[key] = value;
  });
  return values;
}

export function ActionForm<T>({
  action,
  onSuccess,
  className,
  children,
}: {
  action: FormAction<T>;
  /** Called once per successful submission with the action's data. */
  onSuccess?: (data: T) => void;
  className?: string;
  children: ReactNode;
}) {
  const [state, formAction, pending] = useActionState<InternalState<T>, FormData>(
    async (prev, formData) => {
      const result = await action(prev?.result ?? null, formData);
      return { result, values: result.ok ? {} : collectValues(formData) };
    },
    null,
  );
  const handled = useRef<InternalState<T>>(null);

  useEffect(() => {
    if (state && state.result.ok && handled.current !== state) {
      handled.current = state;
      onSuccess?.(state.result.data);
    }
  }, [state, onSuccess]);

  const failure = state && !state.result.ok ? state.result : null;
  const fieldErrors = failure?.fieldErrors ?? {};
  const rootError = failure
    ? (fieldErrors._root ?? (Object.keys(fieldErrors).length === 0 ? failure.error : null))
    : null;

  return (
    <FormContext.Provider
      value={{ pending, fieldErrors, rootError, values: state?.values ?? {}, hasValues: Boolean(failure) }}
    >
      <form action={formAction} className={cn("space-y-4", className)} noValidate>
        {rootError ? (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {rootError}
          </p>
        ) : null}
        {children}
      </form>
    </FormContext.Provider>
  );
}
