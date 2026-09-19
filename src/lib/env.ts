import { z } from "zod";

/**
 * Validated process.env. Import `env` from here instead of reading
 * process.env directly so a missing or malformed variable fails at boot with
 * a readable message rather than deep inside a request.
 *
 * Variables for services not wired up yet (email) are optional here; the
 * item that integrates the service tightens its schema. Payments are
 * cash-on-delivery only and media lives on local disk, so there are no
 * gateway or object-storage variables.
 */

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Database
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),

  // Store
  NEXT_PUBLIC_STORE_CURRENCY: z.enum(["BDT", "USD"]).default("BDT"),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),

  // Auth: signs session and guest-cart cookies. 32+ chars.
  SESSION_SECRET: z.string().min(32),

  // Cron: shared secret for /api/cron/* routes.
  CRON_SECRET: z.string().min(16).optional(),

  // Email (Resend). Optional: without a key the outbox marks jobs SKIPPED.
  RESEND_API_KEY: z.string().startsWith("re_").optional(),
});

export type Env = z.infer<typeof schema>;

function load(): Env {
  const parsed = schema.safeParse(process.env);
  if (parsed.success) return parsed.data;

  const lines = parsed.error.issues.map(
    (issue) => `  ${issue.path.join(".") || "(root)"}: ${issue.message}`,
  );
  throw new Error(
    `Invalid environment variables:\n${lines.join("\n")}\n` +
      "See .env.example for the full list.",
  );
}

export const env: Env = load();
