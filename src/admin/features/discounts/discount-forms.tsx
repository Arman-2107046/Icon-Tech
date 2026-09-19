"use client";

import { Pencil, Plus } from "lucide-react";
import { CheckboxField, DrawerForm, SelectField, TextField } from "@/src/admin/components/form";
import { Button } from "@/src/admin/components/ui/button";
import { createDiscount, updateDiscount } from "@/src/modules/discounts/actions";

export type DiscountInitial = {
  id: string;
  code: string;
  title: string;
  type: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING";
  /** As typed: "10" for 10%, "250.00" for an amount. */
  value: string;
  minOrderSubtotal: string;
  usageLimit: string;
  usageLimitPerUser: string;
  stackable: boolean;
  active: boolean;
  /** datetime-local values (local time) or "". */
  startsAt: string;
  endsAt: string;
};

const TYPES = [
  { value: "PERCENTAGE", label: "Percentage off" },
  { value: "FIXED_AMOUNT", label: "Fixed amount off" },
  { value: "FREE_SHIPPING", label: "Free shipping" },
];

export function AddDiscountButton() {
  return (
    <DrawerForm trigger={<Button size="sm"><Plus className="size-4" />Add discount</Button>} title="Add discount" action={createDiscount} submitLabel="Create discount">
      <DiscountFields />
    </DrawerForm>
  );
}

export function EditDiscountButton({ discount }: { discount: DiscountInitial }) {
  return (
    <DrawerForm
      trigger={<Button variant="ghost" size="icon" aria-label={`Edit discount ${discount.code}`}><Pencil className="size-4" /></Button>}
      title="Edit discount"
      action={updateDiscount.bind(null, discount.id)}
    >
      <DiscountFields initial={discount} />
    </DrawerForm>
  );
}

function DiscountFields({ initial }: { initial?: Omit<DiscountInitial, "id"> }) {
  return (
    <>
      <TextField name="code" label="Code" defaultValue={initial?.code} placeholder="WELCOME10" hint="Customers type this at checkout. Stored in upper case." />
      <TextField name="title" label="Title" defaultValue={initial?.title} placeholder="Welcome offer" />
      <SelectField name="type" label="Type" options={TYPES} defaultValue={initial?.type ?? "PERCENTAGE"} />
      <TextField name="value" label="Value" defaultValue={initial?.value} inputMode="decimal" placeholder="10" hint="Percent for percentage discounts, an amount for fixed discounts. Ignored for free shipping." />
      <TextField name="minOrderSubtotal" label="Minimum order subtotal" defaultValue={initial?.minOrderSubtotal} inputMode="decimal" placeholder="Optional" />
      <div className="grid grid-cols-2 gap-3">
        <TextField name="usageLimit" label="Total uses" defaultValue={initial?.usageLimit} inputMode="numeric" placeholder="Unlimited" />
        <TextField name="usageLimitPerUser" label="Uses per customer" defaultValue={initial?.usageLimitPerUser} inputMode="numeric" placeholder="Unlimited" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField name="startsAt" label="Starts" type="datetime-local" defaultValue={initial?.startsAt} />
        <TextField name="endsAt" label="Ends" type="datetime-local" defaultValue={initial?.endsAt} />
      </div>
      <CheckboxField name="stackable" label="Can be combined with other stackable codes" defaultChecked={initial?.stackable ?? false} hint="Non-stackable codes are exclusive: the customer can use no other code with them." />
      <CheckboxField name="active" label="Active" defaultChecked={initial?.active ?? true} />
    </>
  );
}
