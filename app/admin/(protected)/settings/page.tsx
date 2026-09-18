import { PageHeader } from "@/src/admin/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/admin/components/ui/card";
import { HomepageSectionsEditor } from "@/src/admin/features/settings/homepage-sections";
import { CheckoutSettingsForm, EmailSettingsForm, StoreSettingsForm } from "@/src/admin/features/settings/settings-forms";
import { requireAdmin } from "@/src/lib/auth/guards";
import { STORE_CURRENCY, money, toMajorUnits } from "@/src/lib/money";
import { listCollectionsBrief } from "@/src/modules/catalog";
import { getSiteSettings } from "@/src/modules/content";

export default async function SettingsPage() {
  await requireAdmin();
  const [settings, collections] = await Promise.all([getSiteSettings(), listCollectionsBrief()]);
  const threshold = settings.checkout.freeShippingThreshold === null ? "" : toMajorUnits(money(settings.checkout.freeShippingThreshold)).toFixed(2);

  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-6 p-6 lg:grid-cols-2">
        <StoreSettingsForm settings={settings} />
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Currency</CardTitle>
              <CardDescription>Set by the NEXT_PUBLIC_STORE_CURRENCY environment variable and applied at build time.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
              <span className="rounded-md bg-muted px-2 py-1 font-mono">{STORE_CURRENCY}</span>
              <span className="ml-2 text-muted-foreground">{STORE_CURRENCY === "BDT" ? "Bangladeshi taka (৳)" : "US dollar ($)"}</span>
            </CardContent>
          </Card>
          <EmailSettingsForm settings={settings} />
          <CheckoutSettingsForm settings={settings} threshold={threshold} />
        </div>
        <div className="lg:col-span-2">
          <HomepageSectionsEditor sections={settings.homepage.sections} collections={collections.map((c) => ({ handle: c.handle, title: c.title }))} />
        </div>
      </div>
    </>
  );
}
