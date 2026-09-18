"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, type KeyboardEvent } from "react";
import { ActionForm, HiddenField, SubmitButton } from "@/src/admin/components/form";
import { Button } from "@/src/admin/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/admin/components/ui/card";
import { Input } from "@/src/admin/components/ui/input";
import { Label } from "@/src/admin/components/ui/label";
import { saveProductOptions } from "@/src/modules/catalog/actions";
import { MAX_VARIANTS, type OptionsInput } from "@/src/modules/catalog/types";

type Draft = { key: string; id?: string; name: string; values: { key: string; id?: string; value: string }[] };

let seq = 0;
const nextKey = () => `k${++seq}`;

function toDraft(options: OptionsInput): Draft[] {
  return options.map((o) => ({
    key: nextKey(),
    id: o.id,
    name: o.name,
    values: o.values.map((v) => ({ key: nextKey(), id: v.id, value: v.value })),
  }));
}

function toInput(drafts: Draft[]): OptionsInput {
  return drafts.map((d) => ({ id: d.id, name: d.name, values: d.values.map((v) => ({ id: v.id, value: v.value })) }));
}

/**
 * Add/remove options and values; the server regenerates the variant matrix.
 * Values are entered as chips: type and press Enter or comma.
 */
export function OptionBuilder({
  productId,
  initial,
  existingKeys,
}: {
  productId: string;
  initial: OptionsInput;
  /** selectionKey() of every existing variant, to preview what survives. */
  existingKeys: string[];
}) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Draft[]>(() => toDraft(initial));
  const [pendingValue, setPendingValue] = useState<Record<string, string>>({});

  const update = (key: string, fn: (d: Draft) => Draft) => setDrafts((ds) => ds.map((d) => (d.key === key ? fn(d) : d)));

  const addOption = () => setDrafts((ds) => [...ds, { key: nextKey(), name: "", values: [] }]);
  const removeOption = (key: string) => setDrafts((ds) => ds.filter((d) => d.key !== key));

  const commitValue = (option: Draft) => {
    const raw = (pendingValue[option.key] ?? "").trim();
    if (!raw) return;
    if (!option.values.some((v) => v.value.toLowerCase() === raw.toLowerCase())) {
      update(option.key, (d) => ({ ...d, values: [...d.values, { key: nextKey(), value: raw }] }));
    }
    setPendingValue((p) => ({ ...p, [option.key]: "" }));
  };

  const onValueKey = (option: Draft, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitValue(option);
    } else if (e.key === "Backspace" && !(pendingValue[option.key] ?? "") && option.values.length) {
      update(option.key, (d) => ({ ...d, values: d.values.slice(0, -1) }));
    }
  };

  // Preview: how many variants the matrix will have and how many survive.
  const preview = useMemo(() => {
    const clean = drafts.filter((d) => d.name.trim() && d.values.length);
    const total = clean.reduce((n, d) => n * d.values.length, 1);
    const combos: Record<string, string>[] = clean.reduce<Record<string, string>[]>(
      (acc, d) => acc.flatMap((p) => d.values.map((v) => ({ ...p, [d.name.trim()]: v.value }))),
      [{}],
    );
    const keys = new Set(
      combos.map((c) =>
        Object.keys(c)
          .sort()
          .map((k) => `${k}=${c[k]}`)
          .join("|"),
      ),
    );
    const kept = existingKeys.filter((k) => keys.has(k)).length;
    return { total, kept, created: total - kept, removed: existingKeys.length - kept };
  }, [drafts, existingKeys]);

  const onSuccess = useCallback(() => router.refresh(), [router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Options</CardTitle>
        <CardDescription>Up to 3 options such as Size or Colour. Every combination becomes a variant.</CardDescription>
      </CardHeader>
      <CardContent>
        <ActionForm action={saveProductOptions.bind(null, productId)} onSuccess={onSuccess}>
          <HiddenField name="options" value={JSON.stringify(toInput(drafts))} />

          <div className="space-y-4">
            {drafts.map((option, index) => (
              <div key={option.key} className="rounded-md border p-3">
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor={`opt-${option.key}`}>Option {index + 1} name</Label>
                    <Input
                      id={`opt-${option.key}`}
                      value={option.name}
                      placeholder="e.g. Size"
                      onChange={(e) => update(option.key, (d) => ({ ...d, name: e.target.value }))}
                    />
                  </div>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Remove option ${option.name || index + 1}`} onClick={() => removeOption(option.key)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div className="mt-3 space-y-1.5">
                  <Label htmlFor={`val-${option.key}`}>Values</Label>
                  <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-input px-2 py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
                    {option.values.map((v) => (
                      <span key={v.key} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-sm">
                        {v.value}
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          aria-label={`Remove ${v.value}`}
                          onClick={() => update(option.key, (d) => ({ ...d, values: d.values.filter((x) => x.key !== v.key) }))}
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      id={`val-${option.key}`}
                      className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                      placeholder={option.values.length ? "Add another…" : "Type a value and press Enter"}
                      value={pendingValue[option.key] ?? ""}
                      onChange={(e) => setPendingValue((p) => ({ ...p, [option.key]: e.target.value }))}
                      onKeyDown={(e) => onValueKey(option, e)}
                      onBlur={() => commitValue(option)}
                    />
                  </div>
                </div>
              </div>
            ))}

            {drafts.length < 3 ? (
              <Button type="button" variant="outline" size="sm" onClick={addOption}>
                <Plus className="size-4" />
                Add option
              </Button>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm">
            <p className={preview.total > MAX_VARIANTS ? "text-destructive" : "text-muted-foreground"} data-testid="matrix-preview">
              {preview.total} variant{preview.total === 1 ? "" : "s"}
              {existingKeys.length ? ` · ${preview.kept} kept, ${preview.created} new, ${preview.removed} removed` : ""}
              {preview.total > MAX_VARIANTS ? ` — limit is ${MAX_VARIANTS}` : ""}
            </p>
            <SubmitButton disabled={preview.total > MAX_VARIANTS}>Save options</SubmitButton>
          </div>
        </ActionForm>
      </CardContent>
    </Card>
  );
}
