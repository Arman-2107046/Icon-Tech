import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCustomerSession } from "@/src/lib/auth/session";
import { Container, Section } from "@/src/storefront/components/layout";
import { LoginForm } from "./login-form";

// Session-gated: never prerendered as an instant shell (dev-only validation).
export const instant = false;

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

const ERRORS: Record<string, string> = {
  invalid: "That sign-in link is not valid. Request a new one below.",
  expired: "That sign-in link has expired. Request a new one below.",
  used: "That sign-in link was already used. Request a new one below.",
};

export default function AccountLoginPage({ searchParams }: PageProps<"/account/login">) {
  return (
    <Section space="lg">
      <Container width="narrow">
        <Suspense fallback={null}>
          <Login searchParams={searchParams} />
        </Suspense>
      </Container>
    </Section>
  );
}

async function Login({ searchParams }: { searchParams: PageProps<"/account/login">["searchParams"] }) {
  const session = await getCustomerSession();
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "";
  if (session) redirect(next && next.startsWith("/") ? next : "/account");
  const error = typeof params.error === "string" ? ERRORS[params.error] : undefined;
  return (
    <div className="mx-auto max-w-md">
      <h1 className="display display-2xl">Sign in</h1>
      <p className="body mt-s2 text-ink-muted">No passwords. Enter your email and we will send you a link that signs you in.</p>
      {error ? (
        <p role="alert" className="mt-s3 rounded-sf-md bg-danger-soft px-s2 py-s1 text-t-sm text-danger">
          {error}
        </p>
      ) : null}
      <LoginForm next={next} />
    </div>
  );
}
