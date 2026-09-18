import type { Metadata } from "next";
import { getCachedSiteSettings } from "@/src/modules/content";
import { renderSection } from "@/src/storefront/sections";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getCachedSiteSettings();
  return {
    title: settings.store.tagline ? `${settings.store.name} — ${settings.store.tagline}` : settings.store.name,
    description: settings.store.tagline || undefined,
  };
}

/**
 * The home page is a list of sections in the order stored in site
 * settings (admin → Settings → Homepage sections). Everything here reads
 * from cached, tagged queries, so the page is fully prerendered and only
 * re-rendered when an admin changes something.
 */
export default async function HomePage() {
  const settings = await getCachedSiteSettings();
  return <>{settings.homepage.sections.map((section, index) => renderSection(section, index))}</>;
}
