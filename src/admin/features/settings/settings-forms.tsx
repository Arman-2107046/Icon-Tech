"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { ActionForm, CheckboxField, SubmitButton, TextField, TextareaField } from "@/src/admin/components/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/admin/components/ui/card";
import { updateCheckoutSettings, updateEmailSettings, updateStoreSettings } from "@/src/modules/content/actions";
import type { SiteSettings } from "@/src/modules/content/types";

function useRefresh() {
  const router = useRouter();
  return useCallback(() => router.refresh(), [router]);
}

export function StoreSettingsForm({ settings }: { settings: SiteSettings }) {
  const onSuccess = useRefresh();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Store</CardTitle>
        <CardDescription>Shown in the header, footer, emails and invoices.</CardDescription>
      </CardHeader>
      <CardContent>
        <ActionForm action={updateStoreSettings} onSuccess={onSuccess}>
          <TextField name="name" label="Store name" defaultValue={settings.store.name} />
          <TextField name="tagline" label="Tagline" defaultValue={settings.store.tagline} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="email" label="Contact email" type="email" defaultValue={settings.store.email} />
            <TextField name="phone" label="Phone" defaultValue={settings.store.phone} />
          </div>
          <TextareaField name="address" label="Address" rows={2} defaultValue={settings.store.address} />
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField name="instagram" label="Instagram" defaultValue={settings.social.instagram ?? ""} placeholder="https://instagram.com/…" />
            <TextField name="facebook" label="Facebook" defaultValue={settings.social.facebook ?? ""} placeholder="https://facebook.com/…" />
            <TextField name="youtube" label="YouTube" defaultValue={settings.social.youtube ?? ""} placeholder="https://youtube.com/…" />
          </div>
          <div className="flex justify-end">
            <SubmitButton>Save store</SubmitButton>
          </div>
        </ActionForm>
      </CardContent>
    </Card>
  );
}

export function EmailSettingsForm({ settings }: { settings: SiteSettings }) {
  const onSuccess = useRefresh();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Email sender</CardTitle>
        <CardDescription>Transactional emails are sent from this name and address (the address must be verified with the email provider).</CardDescription>
      </CardHeader>
      <CardContent>
        <ActionForm action={updateEmailSettings} onSuccess={onSuccess}>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="fromName" label="From name" defaultValue={settings.email.fromName} />
            <TextField name="fromAddress" label="From address" type="email" defaultValue={settings.email.fromAddress} placeholder="orders@example.com" />
          </div>
          <div className="flex justify-end">
            <SubmitButton>Save sender</SubmitButton>
          </div>
        </ActionForm>
      </CardContent>
    </Card>
  );
}

export function CheckoutSettingsForm({ settings, threshold }: { settings: SiteSettings; threshold: string }) {
  const onSuccess = useRefresh();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Checkout &amp; payments</CardTitle>
        <CardDescription>Cash on delivery is the only payment method for now.</CardDescription>
      </CardHeader>
      <CardContent>
        <ActionForm action={updateCheckoutSettings} onSuccess={onSuccess}>
          <CheckboxField name="codEnabled" label="Accept cash on delivery" defaultChecked={settings.checkout.codEnabled} hint="Turning this off closes checkout until another payment method exists." />
          <TextField name="freeShippingThreshold" label="Free-shipping banner threshold (BDT)" inputMode="decimal" defaultValue={threshold} hint="Storefront shows “free shipping over ৳X”. Leave blank to hide. Actual rates are set under Shipping." />
          <div className="flex justify-end">
            <SubmitButton>Save checkout</SubmitButton>
          </div>
        </ActionForm>
      </CardContent>
    </Card>
  );
}
