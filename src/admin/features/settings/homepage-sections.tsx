"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ActionForm, HiddenField, SubmitButton } from "@/src/admin/components/form";
import { Button } from "@/src/admin/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/admin/components/ui/card";
import { Checkbox } from "@/src/admin/components/ui/checkbox";
import { Input } from "@/src/admin/components/ui/input";
import { Label } from "@/src/admin/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/admin/components/ui/select";
import { updateHomepageSections } from "@/src/modules/content/actions";
import { HOMEPAGE_SECTION_TYPES, SECTION_LABELS, SECTION_USES_COLLECTION, type HomepageSection, type HomepageSectionType } from "@/src/modules/content/types";

type Row = HomepageSection & { key: string };
let seq = 0;
const nextKey = () => `s${++seq}`;

export function HomepageSectionsEditor({ sections, collections }: { sections: HomepageSection[]; collections: { handle: string; title: string }[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() => sections.map((s) => ({ ...s, key: nextKey() })));
  const [addType, setAddType] = useState<HomepageSectionType>("featured-collection");
  const onSuccess = useCallback(() => router.refresh(), [router]);

  const update = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const move = (index: number, delta: -1 | 1) =>
    setRows((rs) => {
      const next = [...rs];
      const [row] = next.splice(index, 1);
      if (!row) return rs;
      next.splice(index + delta, 0, row);
      return next;
    });
  const collectionItems = Object.fromEntries(collections.map((c) => [c.handle, c.title]));
  const payload: HomepageSection[] = rows.map((r) => ({ type: r.type, enabled: r.enabled, collection: r.collection, limit: r.limit }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Homepage sections</CardTitle>
        <CardDescription>Order and enable the sections on the home page. Layout is fixed; only order and basic settings change here.</CardDescription>
      </CardHeader>
      <CardContent>
        <ActionForm action={updateHomepageSections} onSuccess={onSuccess}>
          <HiddenField name="sections" value={JSON.stringify(payload)} />
          <ol className="space-y-2" data-testid="homepage-sections">
            {rows.map((row, index) => (
              <li key={row.key} className="flex flex-wrap items-center gap-3 rounded-md border p-2" data-testid="homepage-section" data-type={row.type}>
                <span className="w-6 text-right text-xs tabular-nums text-muted-foreground">{index + 1}</span>
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Checkbox checked={row.enabled} onCheckedChange={(checked) => update(row.key, { enabled: checked === true })} aria-label={`Enable ${SECTION_LABELS[row.type]} ${index + 1}`} />
                  {SECTION_LABELS[row.type]}
                </Label>
                {SECTION_USES_COLLECTION[row.type] ? (
                  <Select value={row.collection ?? ""} items={{ "": "Choose a collection…", ...collectionItems }} onValueChange={(v) => update(row.key, { collection: v ? String(v) : undefined })}>
                    <SelectTrigger className="w-56" aria-label={`Collection for section ${index + 1}`}>
                      <SelectValue placeholder="Choose a collection…" />
                    </SelectTrigger>
                    <SelectContent>
                      {collections.map((c) => (
                        <SelectItem key={c.handle} value={c.handle}>
                          {c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
                {row.type === "featured-collection" ? (
                  <Input type="number" min={1} max={24} className="w-20" value={row.limit ?? 8} aria-label={`Product limit for section ${index + 1}`} onChange={(e) => update(row.key, { limit: Number(e.target.value) || 8 })} />
                ) : null}
                <span className="ml-auto flex gap-0.5">
                  <Button type="button" variant="ghost" size="icon" className="size-7" aria-label={`Move section ${index + 1} up`} disabled={index === 0} onClick={() => move(index, -1)}>
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="size-7" aria-label={`Move section ${index + 1} down`} disabled={index === rows.length - 1} onClick={() => move(index, 1)}>
                    <ArrowDown className="size-3.5" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="size-7" aria-label={`Remove section ${index + 1}`} onClick={() => setRows((rs) => rs.filter((r) => r.key !== row.key))}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </span>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <span className="flex items-center gap-2">
              <Select value={addType} items={SECTION_LABELS} onValueChange={(v) => setAddType((HOMEPAGE_SECTION_TYPES as readonly string[]).includes(String(v)) ? (v as HomepageSectionType) : "hero")}>
                <SelectTrigger className="w-52" aria-label="Section type to add">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOMEPAGE_SECTION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {SECTION_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="sm" disabled={rows.length >= 12} onClick={() => setRows((rs) => [...rs, { key: nextKey(), type: addType, enabled: true, ...(addType === "featured-collection" ? { limit: 8 } : {}) }])}>
                <Plus className="size-4" />
                Add section
              </Button>
            </span>
            <SubmitButton>Save sections</SubmitButton>
          </div>
        </ActionForm>
      </CardContent>
    </Card>
  );
}
