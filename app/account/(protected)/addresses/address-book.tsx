"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { COUNTRIES } from "@/src/modules/checkout/types";
import { deleteAddress, saveAddress } from "@/src/modules/customers/actions";
import { Form, FormCheckbox, FormInput, FormSelect, useForm } from "@/src/storefront/components/form";
import { PinArt } from "@/src/storefront/components/art";
import { EmptyState } from "@/src/storefront/components/empty-state";
import { Badge, Button } from "@/src/storefront/components/ui";

export type AddressRow = { id: string; firstName: string; lastName: string; company: string | null; line1: string; line2: string | null; city: string; region: string | null; postalCode: string | null; country: string; isDefault: boolean };

export function AddressBook({ addresses }: { addresses: AddressRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [isPending, startTransition] = useTransition();
  const done = useCallback(() => {
    setEditing(null);
    router.refresh();
  }, [router]);

  return (
    <div className="mt-s5 space-y-s3" data-testid="address-book">
      {addresses.length === 0 && editing !== "new" ? (
        <div className="rounded-sf-lg border border-dashed border-line-strong">
          <EmptyState compact art={PinArt} title="No saved addresses" body="Save one here and checkout will fill it in for you." testId="addresses-empty" />
        </div>
      ) : null}
      <ul className="grid gap-s3 sm:grid-cols-2">
        {addresses.map((a) => (
          <li key={a.id} className="rounded-sf-lg border border-line bg-surface p-s3 text-t-sm" data-testid="address-card">
            {editing === a.id ? (
              <AddressForm initial={a} onDone={done} onCancel={() => setEditing(null)} />
            ) : (
              <>
                <div className="flex items-start justify-between gap-s2">
                  <p className="font-medium">
                    {a.firstName} {a.lastName}
                  </p>
                  {a.isDefault ? <Badge tone="brand">Default</Badge> : null}
                </div>
                <p className="mt-s1 text-ink-muted">
                  {a.company ? <>{a.company}<br /></> : null}
                  {a.line1}
                  {a.line2 ? <><br />{a.line2}</> : null}
                  <br />
                  {[a.city, a.region, a.postalCode].filter(Boolean).join(", ")} · {a.country}
                </p>
                <div className="mt-s2 flex gap-s2">
                  <button type="button" onClick={() => setEditing(a.id)} className="underline underline-offset-4">
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await deleteAddress(a.id);
                        router.refresh();
                      })
                    }
                    className="text-ink-muted underline underline-offset-4 hover:text-ink"
                  >
                    Remove
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      {editing === "new" ? (
        <div className="rounded-sf-lg border border-ink bg-surface p-s3">
          <AddressForm onDone={done} onCancel={() => setEditing(null)} />
        </div>
      ) : (
        <Button variant="secondary" onClick={() => setEditing("new")}>
          Add address
        </Button>
      )}
    </div>
  );
}

function AddressForm({ initial, onDone, onCancel }: { initial?: AddressRow; onDone: () => void; onCancel: () => void }) {
  return (
    <Form action={saveAddress.bind(null, initial?.id ?? null)} onSuccess={onDone}>
      <div className="grid gap-s2 sm:grid-cols-2">
        <FormInput name="firstName" label="First name" defaultValue={initial?.firstName ?? ""} />
        <FormInput name="lastName" label="Last name" defaultValue={initial?.lastName ?? ""} />
        <FormInput name="company" label="Company (optional)" defaultValue={initial?.company ?? ""} className="sm:col-span-2" />
        <FormInput name="line1" label="Address" defaultValue={initial?.line1 ?? ""} className="sm:col-span-2" />
        <FormInput name="line2" label="Apartment, floor (optional)" defaultValue={initial?.line2 ?? ""} className="sm:col-span-2" />
        <FormInput name="city" label="City" defaultValue={initial?.city ?? ""} />
        <FormInput name="region" label="District / region (optional)" defaultValue={initial?.region ?? ""} />
        <FormInput name="postalCode" label="Postal code (optional)" defaultValue={initial?.postalCode ?? ""} />
        <FormSelect name="country" label="Country" defaultValue={initial?.country ?? "BD"} options={COUNTRIES.map((c) => ({ value: c.code, label: c.name }))} />
      </div>
      <div className="mt-s2">
        <FormCheckbox name="isDefault" label="Use as my default address" defaultChecked={initial?.isDefault ?? false} />
      </div>
      <Buttons onCancel={onCancel} />
    </Form>
  );
}

function Buttons({ onCancel }: { onCancel: () => void }) {
  const { pending } = useForm();
  return (
    <div className="mt-s3 flex gap-s1">
      <Button type="submit" loading={pending}>
        Save address
      </Button>
      <Button type="button" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}
