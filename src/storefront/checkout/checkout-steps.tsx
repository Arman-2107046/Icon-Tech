"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import type { CheckoutState } from "@/src/modules/checkout";
import { goToStep, placeOrder, saveAddress, saveContact, selectShippingRate } from "@/src/modules/checkout/actions";
import { CHECKOUT_STEPS, COUNTRIES, type AddressInput, type CheckoutStep } from "@/src/modules/checkout/types";
import { Form, FormCheckbox, FormInput, FormSelect, FormTextarea, useForm } from "@/src/storefront/components/form";
import { Button, Price } from "@/src/storefront/components/ui";
import { cx } from "@/src/storefront/lib/cx";

const TITLES: Record<CheckoutStep, string> = { contact: "Contact", address: "Delivery address", shipping: "Delivery method", payment: "Payment" };

/**
 * Four collapsible steps. The open step is `data.step`; completed steps
 * show a one-line summary with an Edit link. Every submit is a Server
 * Action that validates, saves to the cart and advances the step; the
 * page refreshes so the summary column re-derives totals from the server.
 */
export function CheckoutSteps({ state }: { state: CheckoutState }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const refresh = useCallback(() => router.refresh(), [router]);
  const current = state.data.step;
  const order = (s: CheckoutStep) => CHECKOUT_STEPS.indexOf(s);
  const edit = (step: CheckoutStep) =>
    startTransition(async () => {
      await goToStep(step);
      router.refresh();
    });

  return (
    <ol className="space-y-s2" data-testid="checkout-steps">
      {CHECKOUT_STEPS.map((step, index) => {
        const open = step === current;
        const done = order(step) < order(state.reachable) && !open;
        const locked = order(step) > order(state.reachable);
        return (
          <li key={step} className={cx("rounded-sf-lg border bg-surface", open ? "border-ink" : "border-line")} data-testid={`step-${step}`} data-open={open}>
            <div className="flex items-center gap-s2 px-s3 py-s2">
              <span className={cx("inline-flex size-7 items-center justify-center rounded-sf-full text-t-xs font-medium", done ? "bg-ink text-canvas" : open ? "border border-ink" : "border border-line text-ink-subtle")}>{done ? "✓" : index + 1}</span>
              <h2 className={cx("flex-1 text-t-base font-medium", locked && "text-ink-subtle")}>{TITLES[step]}</h2>
              {done ? (
                <button type="button" onClick={() => edit(step)} className="text-t-sm text-ink-muted underline underline-offset-4 hover:text-ink">
                  Edit
                </button>
              ) : null}
            </div>
            {done ? <Summary step={step} state={state} /> : null}
            {open ? (
              <div className="border-t border-line px-s3 py-s3">
                {step === "contact" ? <ContactStep state={state} onSaved={refresh} /> : null}
                {step === "address" ? <AddressStep state={state} onSaved={refresh} /> : null}
                {step === "shipping" ? <ShippingStep state={state} onSaved={refresh} /> : null}
                {step === "payment" ? <PaymentStep state={state} /> : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function Summary({ step, state }: { step: CheckoutStep; state: CheckoutState }) {
  const { data, selectedRate } = state;
  let text: string | null = null;
  if (step === "contact" && data.contact) text = `${data.contact.email} · ${data.contact.phone}`;
  if (step === "address" && data.shippingAddress) {
    const a = data.shippingAddress;
    text = [`${a.firstName} ${a.lastName}`, a.line1, a.line2, a.city, a.region, a.country].filter(Boolean).join(", ");
  }
  if (step === "shipping" && selectedRate) text = selectedRate.name;
  return text ? <p className="px-s3 pb-s2 pl-[calc(var(--space-3)+28px+var(--space-2))] text-t-sm text-ink-muted">{text}</p> : null;
}

function SubmitRow({ label }: { label: string }) {
  const { pending } = useForm();
  return (
    <div className="mt-s4">
      <Button type="submit" size="lg" loading={pending}>
        {label}
      </Button>
    </div>
  );
}

function ContactStep({ state, onSaved }: { state: CheckoutState; onSaved: () => void }) {
  const c = state.data.contact;
  return (
    <Form action={saveContact} onSuccess={onSaved}>
      <div className="grid gap-s3 sm:grid-cols-2">
        <FormInput name="email" label="Email" type="email" autoComplete="email" defaultValue={c?.email ?? state.customer?.email ?? ""} hint="Order updates go here." />
        <FormInput name="phone" label="Phone" type="tel" autoComplete="tel" defaultValue={c?.phone ?? ""} hint="For the courier." placeholder="+880 17…" />
      </div>
      <div className="mt-s3">
        <FormCheckbox name="acceptsMarketing" label="Email me about new products (one a month, at most)" defaultChecked={c?.acceptsMarketing ?? false} />
      </div>
      <SubmitRow label="Continue to address" />
    </Form>
  );
}

function AddressFields({ prefix, initial }: { prefix: string; initial?: Partial<AddressInput> | null }) {
  const p = (k: string) => `${prefix}${k}`;
  return (
    <div className="grid gap-s3 sm:grid-cols-2">
      <FormInput name={p("firstName")} label="First name" autoComplete="given-name" defaultValue={initial?.firstName ?? ""} />
      <FormInput name={p("lastName")} label="Last name" autoComplete="family-name" defaultValue={initial?.lastName ?? ""} />
      <FormInput name={p("company")} label="Company (optional)" autoComplete="organization" defaultValue={initial?.company ?? ""} className="sm:col-span-2" />
      <FormInput name={p("line1")} label="Address" autoComplete="address-line1" defaultValue={initial?.line1 ?? ""} className="sm:col-span-2" placeholder="House, road, area" />
      <FormInput name={p("line2")} label="Apartment, floor (optional)" autoComplete="address-line2" defaultValue={initial?.line2 ?? ""} className="sm:col-span-2" />
      <FormInput name={p("city")} label="City" autoComplete="address-level2" defaultValue={initial?.city ?? ""} />
      <FormInput name={p("region")} label="District / region (optional)" autoComplete="address-level1" defaultValue={initial?.region ?? ""} />
      <FormInput name={p("postalCode")} label="Postal code (optional)" autoComplete="postal-code" defaultValue={initial?.postalCode ?? ""} />
      <FormSelect name={p("country")} label="Country" autoComplete="country" defaultValue={initial?.country ?? "BD"} options={COUNTRIES.map((c) => ({ value: c.code, label: c.name }))} />
    </div>
  );
}

function AddressStep({ state, onSaved }: { state: CheckoutState; onSaved: () => void }) {
  const [billingSame, setBillingSame] = useState(state.data.billingAddress == null);
  const [picked, setPicked] = useState<string>("");
  const saved = state.savedAddresses;
  const chosen = saved.find((s) => s.id === picked)?.address ?? null;
  const initial = (chosen as Partial<AddressInput> | null) ?? state.data.shippingAddress ?? null;

  return (
    <Form action={saveAddress} onSuccess={onSaved}>
      {saved.length ? (
        <div className="mb-s3">
          <label className="text-t-sm font-medium" htmlFor="saved-address">
            Saved addresses
          </label>
          <select id="saved-address" className="mt-s1 h-12 w-full rounded-sf-md border border-line-strong bg-surface px-s2 text-t-base" value={picked} onChange={(e) => setPicked(e.target.value)}>
            <option value="">Enter a new address</option>
            {saved.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div key={picked}>
        <AddressFields prefix="" initial={initial} />
      </div>
      {state.customer ? (
        <div className="mt-s3">
          <FormCheckbox name="saveAddress" label="Save this address to my account" defaultChecked={false} />
        </div>
      ) : null}
      <fieldset className="mt-s4">
        <legend className="text-t-sm font-medium">Billing address</legend>
        <div className="mt-s1 flex gap-s3 text-t-sm">
          <label className="flex items-center gap-s1">
            <input type="radio" name="billingSame" value="on" checked={billingSame} onChange={() => setBillingSame(true)} className="accent-ink" />
            Same as delivery
          </label>
          <label className="flex items-center gap-s1">
            <input type="radio" name="billingSame" value="off" checked={!billingSame} onChange={() => setBillingSame(false)} className="accent-ink" />
            Different
          </label>
        </div>
        {!billingSame ? (
          <div className="mt-s3">
            <AddressFields prefix="billing." initial={state.data.billingAddress ?? null} />
          </div>
        ) : null}
      </fieldset>
      <SubmitRow label="Continue to delivery" />
    </Form>
  );
}

function ShippingStep({ state, onSaved }: { state: CheckoutState; onSaved: () => void }) {
  const { rates, data } = state;
  return (
    <Form action={selectShippingRate} onSuccess={onSaved}>
      <RateOptions rates={rates} selected={data.shippingRateId} />
      <SubmitRow label="Continue to payment" />
    </Form>
  );
}

function RateOptions({ rates, selected }: { rates: CheckoutState["rates"]; selected?: string }) {
  const { errors } = useForm();
  return (
    <fieldset>
      <legend className="sr-only">Delivery method</legend>
      {errors.shippingRateId ? (
        <p role="alert" className="mb-s2 text-t-sm text-danger">
          {errors.shippingRateId}
        </p>
      ) : null}
      <div className="space-y-s1">
        {rates.map((rate, i) => (
          <label key={rate.id} className="flex cursor-pointer items-center gap-s2 rounded-sf-md border border-line-strong px-s2 py-s2 has-[:checked]:border-ink has-[:checked]:bg-neutral-100">
            <input type="radio" name="shippingRateId" value={rate.id} defaultChecked={selected ? selected === rate.id : i === 0} className="accent-ink" />
            <span className="flex-1 text-t-sm font-medium">{rate.name}</span>
            {rate.price === 0 ? <span className="text-t-sm text-success">Free</span> : <Price amount={rate.price} size="sm" />}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function PaymentStep({ state }: { state: CheckoutState }) {
  return (
    <Form action={placeOrder}>
      <fieldset>
        <legend className="sr-only">Payment method</legend>
        <label className="flex cursor-pointer items-start gap-s2 rounded-sf-md border border-ink bg-neutral-100 px-s2 py-s2">
          <input type="radio" name="provider" value="COD" defaultChecked className="mt-1 accent-ink" />
          <span>
            <span className="block text-t-sm font-medium">Cash on delivery</span>
            <span className="block text-t-xs text-ink-muted">
              Pay <Price amount={state.totals.total} size="sm" /> in cash when your order arrives. Please have the exact amount ready.
            </span>
          </span>
        </label>
      </fieldset>
      <div className="mt-s3">
        <FormTextarea name="note" label="Delivery note (optional)" placeholder="Gate code, landmark, best time to call…" rows={3} />
      </div>
      <p className="mt-s3 text-t-xs text-ink-muted">By placing the order you agree to our shipping and returns policy.</p>
      <SubmitRow label="Place order" />
    </Form>
  );
}
