import Link from "next/link";
import { cacheLife } from "next/cache";
import { getMenu, getCachedSiteSettings } from "@/src/modules/content";
import { Container } from "@/src/storefront/components/layout";
import { NewsletterForm } from "./newsletter-form";

/** Prerender-safe copyright year: cached for a day rather than read at render. */
async function copyrightYear(): Promise<number> {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export async function Footer() {
  const [settings, menu, year] = await Promise.all([getCachedSiteSettings(), getMenu("footer"), copyrightYear()]);
  const items = menu?.items ?? [];
  const social = [
    { label: "Instagram", href: settings.social.instagram },
    { label: "Facebook", href: settings.social.facebook },
    { label: "YouTube", href: settings.social.youtube },
  ].filter((s): s is { label: string; href: string } => Boolean(s.href));

  return (
    <footer className="border-t border-line bg-surface">
      <Container className="grid gap-s8 py-s10 lg:grid-cols-12 lg:py-s12">
        <div className="lg:col-span-5">
          <p className="display text-t-md">{settings.store.name}</p>
          {settings.store.tagline ? <p className="body body-sm mt-s1 text-ink-muted">{settings.store.tagline}</p> : null}
          <NewsletterForm className="mt-s5 max-w-sm" />
        </div>

        <nav aria-label="Footer" className="lg:col-span-3 lg:col-start-7">
          <p className="label text-ink-subtle">Company</p>
          <ul className="mt-s2 space-y-s1">
            {items.map((item) => (
              <li key={item.id}>
                <Link href={item.url} className="text-t-sm text-ink-muted transition-colors hover:text-ink">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="lg:col-span-3">
          <p className="label text-ink-subtle">Contact</p>
          <ul className="mt-s2 space-y-s1 text-t-sm text-ink-muted">
            {settings.store.email ? (
              <li>
                <a href={`mailto:${settings.store.email}`} className="transition-colors hover:text-ink">
                  {settings.store.email}
                </a>
              </li>
            ) : null}
            {settings.store.phone ? <li>{settings.store.phone}</li> : null}
            {settings.store.address ? <li className="max-w-xs">{settings.store.address}</li> : null}
          </ul>
          {social.length ? (
            <ul className="mt-s3 flex gap-s2">
              {social.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className="text-t-sm text-ink-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <p className="text-t-xs text-ink-subtle lg:col-span-12">
          © {year} {settings.store.name}. Prices in Bangladeshi taka, VAT included where applicable.
        </p>
      </Container>
    </footer>
  );
}
