import { z } from "zod";

/**
 * Validated process.env. Import `env` from here instead of reading
 * process.env directly so a missing or malformed variable fails at boot with
 * a readable message rather than deep inside a request.
 *
 * Variables for services not wired up yet (payments, email, storage) are
 * optional here; the item that integrates each service tightens its schema.
 */

const bool = z
  .enum(["true", "false"])
  .default("false")
  .transform((v) => v === "true");

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

  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith("sk_").optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_").optional(),

  // SSLCommerz
  SSLCOMMERZ_STORE_ID: z.string().min(1).optional(),
  SSLCOMMERZ_STORE_PASSWORD: z.string().min(1).optional(),
  SSLCOMMERZ_SANDBOX: bool,

  // Email (Resend)
  RESEND_API_KEY: z.string().startsWith("re_").optional(),
  EMAIL_FROM: z.string().min(3).optional(),

  // Storage (Cloudflare R2)
  R2_ACCOUNT_ID: z.string().min(1).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_BUCKET: z.string().min(1).optional(),
  R2_PUBLIC_URL: z.url().optional(),
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
