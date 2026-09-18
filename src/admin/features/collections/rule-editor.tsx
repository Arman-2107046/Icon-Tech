"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActionForm, HiddenField, SubmitButton, useFormState } from "@/src/admin/components/form";
import { Button } from "@/src/admin/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/admin/components/ui/card";
import { Input } from "@/src/admin/components/ui/input";
import { Label } from "@/src/admin/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/admin/components/ui/select";
import { previewCollectionRules, saveCollectionRules } from "@/src/modules/catalog/actions";
import { NEEDS_VALUE, OPERATORS_FOR, RULE_FIELDS, type CollectionRules, type RuleField, type RuleOperator } from "@/src/modules/catalog/types";

const FIELD_LABELS: Record<RuleField, string> = {
  tag: "Tag",
  vendor: "Vendor",
  title: "Title",
  price: "Price (৳)",
  compare_at_price: "Compare-at price",
};

const OPERATOR_LABELS: Record<RuleOperator, string> = {
  equals: "is",
  not_equals: "is not",
  contains: "contains",
  starts_with: "starts with",
  gt: "is greater than",
  lt: "is less than",
  is_set: "is set",
  is_not_set: "is not set",
};

type Row = { key: string; field: RuleField; operator: RuleOperator; value: string };

let seq = 0;
const nextKey = () => `r${++seq}`;

const EMPTY: CollectionRules = { match: "all", conditions: [{ field: "tag", operator: "equals", value: "" }] };

function defaultOperator(field: RuleField): RuleOperator {
  return OPERATORS_FOR[field][0] ?? "equals";
}

export function RuleEditor({ collectionId, initial }: { collectionId: string; initial: CollectionRules | null }) {
  const router = useRouter();
  const start = initial ?? EMPTY;
  const [match, setMatch] = useState<"all" | "any">(start.match);
  const [rows, setRows] = useState<Row[]>(() => start.conditions.map((c) => ({ key: nextKey(), ...c })));
  const [preview, setPreview] = useState<{ count: number; sample: { id: string; title: string }[] } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const rules: CollectionRules = { match, conditions: rows.map(({ field, operator, value }) => ({ field, operator, value })) };
  const json = JSON.stringify(rules);

  // Live preview, debounced; runs on every edit and once on mount.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const result = await previewCollectionRules(JSON.parse(json));
      if (result.ok) {
        setPreview(result.data);
        setPreviewError(null);
      } else {
        setPreview(null);
        setPreviewError(result.fieldErrors ? Object.values(result.fieldErrors)[0] ?? result.error : result.error);
      }
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [json]);

  const update = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const onSuccess = useCallback(() => router.refresh(), [router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conditions</CardTitle>
        <CardDescription>Products are included automatically when they match these conditions.</CardDescription>
      </CardHeader>
      <CardContent>
        <ActionForm action={saveCollectionRules.bind(null, collectionId)} onSuccess={onSuccess}>
          <HiddenField name="rules" value={json} />

          <div className="flex items-center gap-2 text-sm">
            <span>Products must match</span>
            <Select value={match} items={{ all: "all conditions", any: "any condition" }} onValueChange={(v) => setMatch(v === "any" ? "any" : "all")}>
              <SelectTrigger className="w-40" aria-label="Match mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">all conditions</SelectItem>
                <SelectItem value="any">any condition</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ol className="space-y-2">
            {rows.map((row, index) => {
              const operators = OPERATORS_FOR[row.field];
              return (
                <li key={row.key} className="flex flex-wrap items-end gap-2 rounded-md border p-2" data-testid="rule-row">
                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor={`f-${row.key}`}>
                      Field
                    </Label>
                    <Select
                      value={row.field}
                      items={FIELD_LABELS}
                      onValueChange={(v) => {
                        const field = (RULE_FIELDS as readonly string[]).includes(String(v)) ? (v as RuleField) : "tag";
                        update(row.key, { field, operator: defaultOperator(field), value: "" });
                      }}
                    >
                      <SelectTrigger id={`f-${row.key}`} className="w-40" aria-label={`Condition ${index + 1} field`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RULE_FIELDS.map((f) => (
                          <SelectItem key={f} value={f}>
                            {FIELD_LABELS[f]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor={`o-${row.key}`}>
                      Operator
                    </Label>
                    <Select
                      value={row.operator}
                      items={Object.fromEntries(operators.map((o) => [o, OPERATOR_LABELS[o]]))}
                      onValueChange={(v) => update(row.key, { operator: operators.includes(v as RuleOperator) ? (v as RuleOperator) : defaultOperator(row.field) })}
                    >
                      <SelectTrigger id={`o-${row.key}`} className="w-40" aria-label={`Condition ${index + 1} operator`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map((o) => (
                          <SelectItem key={o} value={o}>
                            {OPERATOR_LABELS[o]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {NEEDS_VALUE[row.operator] ? (
                    <div className="min-w-40 flex-1 space-y-1">
                      <Label className="text-xs" htmlFor={`v-${row.key}`}>
                        Value
                      </Label>
                      <Input
                        id={`v-${row.key}`}
                        value={row.value}
                        inputMode={row.field === "price" ? "decimal" : undefined}
                        placeholder={row.field === "price" ? "e.g. 5000" : row.field === "tag" ? "e.g. audio" : ""}
                        onChange={(e) => update(row.key, { value: e.target.value })}
                        aria-label={`Condition ${index + 1} value`}
                      />
                    </div>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove condition ${index + 1}`}
                    disabled={rows.length === 1}
                    onClick={() => setRows((rs) => rs.filter((r) => r.key !== row.key))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              );
            })}
          </ol>

          {rows.length < 10 ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setRows((rs) => [...rs, { key: nextKey(), field: "tag", operator: "equals", value: "" }])}>
              <Plus className="size-4" />
              Add condition
            </Button>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm">
            <div data-testid="rules-preview" className={previewError ? "text-destructive" : "text-muted-foreground"}>
              {previewError
                ? previewError
                : preview
                  ? `${preview.count} matching product${preview.count === 1 ? "" : "s"}${preview.sample.length ? `: ${preview.sample.map((p) => p.title).join(", ")}${preview.count > preview.sample.length ? ", …" : ""}` : ""}`
                  : "Checking…"}
            </div>
            <SaveButton />
          </div>
        </ActionForm>
      </CardContent>
    </Card>
  );
}

function SaveButton() {
  const { rootError } = useFormState();
  return (
    <span className="flex items-center gap-2">
      {rootError ? <span className="text-xs text-destructive">{rootError}</span> : null}
      <SubmitButton>Save conditions</SubmitButton>
    </span>
  );
}
