import type { ZodError } from "zod";

/**
 * Every Server Action returns an ActionResult. Callers narrow on `ok`.
 * Actions never throw to the client — unexpected errors are caught at the
 * action boundary and turned into a generic failure.
 */

export type FieldErrors = Record<string, string>;

export type ActionSuccess<T> = { ok: true; data: T };

export type ActionFailure = {
  ok: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type ActionResult<T> = ActionSuccess<T> | ActionFailure;

export function ok<T>(data: T): ActionSuccess<T> {
  return { ok: true, data };
}

export function fail(error: string, fieldErrors?: FieldErrors): ActionFailure {
  return fieldErrors ? { ok: false, error, fieldErrors } : { ok: false, error };
}

/**
 * Collapse a ZodError into one message per field, keyed by dotted path.
 * The first issue for a field wins; users fix one thing at a time. An issue
 * inside an array or object (e.g. countries.1) is also reported under its
 * first segment, so a single input that holds a list shows the message.
 */
export function zodFieldErrors(error: ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_root";
    if (!(key in fieldErrors)) fieldErrors[key] = issue.message;
    const head = issue.path.length > 1 ? String(issue.path[0]) : null;
    if (head && !(head in fieldErrors)) fieldErrors[head] = issue.message;
  }
  return fieldErrors;
}

export function failFromZod(error: ZodError, message = "Please fix the highlighted fields."): ActionFailure {
  return fail(message, zodFieldErrors(error));
}

/** Errors whose message is safe to show to the user. */
export class ActionError extends Error {
  constructor(message: string, readonly fieldErrors?: FieldErrors) {
    super(message);
    this.name = "ActionError";
  }
}

/**
 * Wrap an action body so nothing escapes as a thrown error. ActionError
 * surfaces its message; anything else is logged and replaced with a
 * generic one so internals never leak to the client.
 */
export async function runAction<T>(body: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await body();
  } catch (error) {
    if (error instanceof ActionError) {
      return fail(error.message, error.fieldErrors);
    }
    console.error("[action] unhandled error", error);
    return fail("Something went wrong. Please try again.");
  }
}
