"use client";

import { Pencil, Plus } from "lucide-react";
import { DrawerForm, TextField } from "@/src/admin/components/form";
import { Button } from "@/src/admin/components/ui/button";
import { createTaxRate, updateTaxRate } from "@/src/modules/checkout/actions";

export type TaxInitial = { id: string; name: string; country: string; region: string; rate: string };

export function AddTaxRateButton() {
  return (
    <DrawerForm trigger={<Button size="sm"><Plus className="size-4" />Add tax rate</Button>} title="Add tax rate" action={createTaxRate} submitLabel="Create tax rate">
      <TaxFields />
    </DrawerForm>
  );
}

export function EditTaxRateButton({ tax }: { tax: TaxInitial }) {
  return (
    <DrawerForm
      trigger={<Button variant="ghost" size="icon" aria-label={`Edit tax rate ${tax.name}`}><Pencil className="size-4" /></Button>}
      title="Edit tax rate"
      action={updateTaxRate.bind(null, tax.id)}
    >
      <TaxFields initial={tax} />
    </DrawerForm>
  );
}

function TaxFields({ initial }: { initial?: Omit<TaxInitial, "id"> }) {
  return (
    <>
      <TextField name="name" label="Name" defaultValue={initial?.name} placeholder="e.g. VAT" />
      <TextField name="country" label="Country" defaultValue={initial?.country} placeholder="BD" hint="Two-letter ISO country code." />
      <TextField name="region" label="Region" defaultValue={initial?.region} placeholder="Optional, e.g. Dhaka" hint="Leave blank for a country-wide rate. A region rate overrides the country rate." />
      <TextField name="rate" label="Rate (%)" defaultValue={initial?.rate} inputMode="decimal" placeholder="5" />
    </>
  );
}
