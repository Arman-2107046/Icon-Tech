"use client";

import { useActionState } from "react";
import { adminLogin } from "@/src/lib/auth/admin-actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(adminLogin, null);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={action} className="space-y-4" noValidate>
      {state && !state.ok && !state.fieldErrors ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <div className="space-y-1">
        <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        />
        {fieldErrors?.email ? <p className="text-xs text-red-600">{fieldErrors.email}</p> : null}
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        />
        {fieldErrors?.password ? <p className="text-xs text-red-600">{fieldErrors.password}</p> : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
