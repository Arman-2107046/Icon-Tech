"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/src/admin/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/admin/components/ui/card";
import { Input } from "@/src/admin/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/admin/components/ui/table";
import type { ActionResult, FieldErrors } from "@/src/lib/action-result";
import { money, toMajorUnits } from "@/src/lib/money";
import { updateVariant } from "@/src/modules/catalog/actions";

export type VariantRowData = {
  id: string;
  title: string;
  sku: string | null;
  price: number;
  compareAtPrice: number | null;
  available: number;
};

function major(minor: number | null): string {
  return minor === null ? "" : toMajorUnits(money(minor)).toFixed(2);
}

type RowState = { result: ActionResult<null>; values: Record<string, string>; savedAt: number } | null;

/**
 * One editable row. HTML forbids <form> between <tbody> and <tr>, so the
 * <form> element sits inside the last cell and the inputs in the other
 * cells attach to it with the `form` attribute. React resets the inputs
 * after every action, so the submitted values are kept and re-applied
 * while the row is in an error state.
 */
function VariantRow({ variant }: { variant: VariantRowData }) {
  const router = useRouter();
  const formId = `variant-${variant.id}`;
  const [state, formAction, pending] = useActionState<RowState, FormData>(async (_prev, formData) => {
    const values: Record<string, string> = {};
    formData.forEach((v, k) => {
      if (typeof v === "string") values[k] = v;
    });
    const result = await updateVariant(variant.id, null, formData);
    return { result, values: result.ok ? {} : values, savedAt: result.ok ? Date.now() : 0 };
  }, null);

  const handled = useRef<RowState>(null);
  useEffect(() => {
    if (state?.result.ok && handled.current !== state) {
      handled.current = state;
      router.refresh();
    }
  }, [state, router]);

  const failure = state && !state.result.ok ? state.result : null;
  const errors: FieldErrors = failure?.fieldErrors ?? {};
  const rootError = failure && Object.keys(errors).length === 0 ? failure.error : null;
  const preserved = state?.values ?? {};
  const valueFor = (name: string, fallback: string) => (failure && name in preserved ? preserved[name] : fallback);
  const keyFor = (name: string) => (failure ? `err:${preserved[name] ?? ""}` : `ok:${state?.savedAt ?? 0}`);

  const cell = (name: string, label: string, fallback: string, className: string, inputMode?: "decimal" | "numeric") => (
    <TableCell className="align-top">
      <Input
        key={keyFor(name)}
        form={formId}
        name={name}
        defaultValue={valueFor(name, fallback)}
        aria-label={`${variant.title} ${label}`}
        aria-invalid={Boolean(errors[name])}
        inputMode={inputMode}
        className={className}
      />
      {errors[name] ? <p className="mt-1 text-xs text-destructive">{errors[name]}</p> : null}
    </TableCell>
  );

  return (
    <TableRow data-testid={`variant-row-${variant.id}`}>
      <TableCell className="pt-3 align-top font-medium">{variant.title}</TableCell>
      {cell("sku", "SKU", variant.sku ?? "", "w-40 font-mono text-xs")}
      {cell("price", "price", major(variant.price), "w-28 tabular-nums", "decimal")}
      {cell("compareAtPrice", "compare-at price", major(variant.compareAtPrice), "w-28 tabular-nums", "decimal")}
      {cell("available", "stock", String(variant.available), "w-20 tabular-nums", "numeric")}
      <TableCell className="align-top">
        <form id={formId} action={formAction} className="flex items-center justify-end gap-2" noValidate>
          {rootError ? <span className="text-xs text-destructive">{rootError}</span> : null}
          {state?.result.ok && !pending ? <Check className="size-4 text-emerald-600" aria-label="Saved" /> : null}
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </form>
      </TableCell>
    </TableRow>
  );
}

export function VariantsTable({ variants }: { variants: VariantRowData[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Variants</CardTitle>
        <CardDescription>
          {variants.length} variant{variants.length === 1 ? "" : "s"}. Prices in BDT; edit a row and press Save.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[28%]">Variant</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Compare at</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.map((v) => (
                <VariantRow key={v.id} variant={v} />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
