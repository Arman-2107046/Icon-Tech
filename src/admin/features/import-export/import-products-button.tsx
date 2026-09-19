"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/src/admin/components/ui/button";
import { Input } from "@/src/admin/components/ui/input";
import { Label } from "@/src/admin/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/src/admin/components/ui/sheet";
import type { ImportSummary } from "@/src/modules/catalog/types";

type Response = { ok: true; data: ImportSummary } | { ok: false; error: string };

/** Pick a CSV, check it (dry run), then import. Mirrors the export columns. */
export function ImportProductsButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"check" | "import" | null>(null);
  const [result, setResult] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function run(dryRun: boolean) {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose a CSV file first.");
      return;
    }
    setBusy(dryRun ? "check" : "import");
    setError(null);
    const body = new FormData();
    body.set("file", file);
    body.set("dryRun", dryRun ? "1" : "0");
    try {
      const res = await fetch("/api/admin/import/products", { method: "POST", body });
      const json = (await res.json()) as Response;
      if (!json.ok) setError(json.error);
      else {
        setResult(json.data);
        if (!dryRun && json.data.issues.length === 0) router.refresh();
      }
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  const clean = result !== null && result.issues.length === 0;
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setResult(null);
          setError(null);
        }
      }}
    >
      <SheetTrigger render={<Button size="sm" variant="outline" aria-label="Import CSV" />}>
        <Upload className="size-4" />
        <span className="hidden md:inline">Import CSV</span>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Import products</SheetTitle>
          <SheetDescription>Same columns as the export. Products match on handle, variants on SKU. Nothing is written until every row passes.</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
          <div className="space-y-1.5">
            <Label htmlFor="import-file">CSV file</Label>
            <Input id="import-file" ref={fileRef} type="file" accept=".csv,text/csv" onChange={() => { setResult(null); setError(null); }} />
          </div>
          {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
          {result ? (
            <div className="rounded-md border p-3 text-sm" data-testid="import-summary">
              <p className="font-medium">{result.dryRun ? "Check complete" : "Import complete"}</p>
              <ul className="mt-1 grid grid-cols-2 gap-x-4 text-muted-foreground">
                <li>Products: {result.productsCreated} new</li>
                <li>{result.productsUpdated} updated</li>
                <li>Variants: {result.variantsCreated} new</li>
                <li>{result.variantsUpdated} updated</li>
              </ul>
              {result.issues.length ? (
                <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-destructive" data-testid="import-issues">
                  {result.issues.map((i, n) => (
                    <li key={n}>
                      Line {i.line}: {i.message}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
        <SheetFooter className="flex-row justify-end gap-2 border-t">
          <Button variant="outline" disabled={busy !== null} onClick={() => run(true)}>
            {busy === "check" ? "Checking…" : "Check file"}
          </Button>
          <Button disabled={busy !== null || !clean || !result?.dryRun} onClick={() => run(false)}>
            {busy === "import" ? "Importing…" : "Import"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
