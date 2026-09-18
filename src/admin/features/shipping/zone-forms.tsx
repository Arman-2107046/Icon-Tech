"use client";

import { Pencil, Plus } from "lucide-react";
import { DrawerForm, TextField } from "@/src/admin/components/form";
import { Button } from "@/src/admin/components/ui/button";
import { createShippingRate, createShippingZone, updateShippingRate, updateShippingZone } from "@/src/modules/checkout/actions";

export function AddZoneButton() {
  return (
    <DrawerForm trigger={<Button size="sm"><Plus className="size-4" />Add zone</Button>} title="Add shipping zone" action={createShippingZone} submitLabel="Create zone">
      <ZoneFields />
    </DrawerForm>
  );
}

export function EditZoneButton({ zone }: { zone: { id: string; name: string; countries: string[] } }) {
  return (
    <DrawerForm
      trigger={<Button variant="ghost" size="icon" aria-label={`Edit zone ${zone.name}`}><Pencil className="size-4" /></Button>}
      title="Edit shipping zone"
      action={updateShippingZone.bind(null, zone.id)}
    >
      <ZoneFields initial={zone} />
    </DrawerForm>
  );
}

function ZoneFields({ initial }: { initial?: { name: string; countries: string[] } }) {
  return (
    <>
      <TextField name="name" label="Zone name" defaultValue={initial?.name} placeholder="e.g. Bangladesh" />
      <TextField
        name="countries"
        label="Countries"
        defaultValue={initial?.countries.join(", ")}
        placeholder="BD, IN, NP"
        hint="Two-letter ISO country codes, comma-separated. A country can be in one zone only."
      />
    </>
  );
}

export function AddRateButton({ zoneId, zoneName }: { zoneId: string; zoneName: string }) {
  return (
    <DrawerForm
      trigger={<Button variant="outline" size="sm"><Plus className="size-4" />Add rate</Button>}
      title={`Add rate to ${zoneName}`}
      action={createShippingRate.bind(null, zoneId)}
      submitLabel="Create rate"
    >
      <RateFields />
    </DrawerForm>
  );
}

export type RateInitial = { id: string; name: string; price: string; minOrderSubtotal: string; maxOrderSubtotal: string };

export function EditRateButton({ rate }: { rate: RateInitial }) {
  return (
    <DrawerForm
      trigger={<Button variant="ghost" size="icon" aria-label={`Edit rate ${rate.name}`}><Pencil className="size-4" /></Button>}
      title="Edit shipping rate"
      action={updateShippingRate.bind(null, rate.id)}
    >
      <RateFields initial={rate} />
    </DrawerForm>
  );
}

function RateFields({ initial }: { initial?: Omit<RateInitial, "id"> }) {
  return (
    <>
      <TextField name="name" label="Rate name" defaultValue={initial?.name} placeholder="e.g. Inside Dhaka" />
      <TextField name="price" label="Price (BDT)" defaultValue={initial?.price} inputMode="decimal" placeholder="60" hint="0 for free shipping." />
      <TextField name="minOrderSubtotal" label="Minimum order subtotal (BDT)" defaultValue={initial?.minOrderSubtotal} inputMode="decimal" hint="Leave blank for no minimum." />
      <TextField name="maxOrderSubtotal" label="Maximum order subtotal (BDT)" defaultValue={initial?.maxOrderSubtotal} inputMode="decimal" hint="Leave blank for no maximum." />
    </>
  );
}
