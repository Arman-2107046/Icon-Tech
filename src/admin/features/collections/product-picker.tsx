"use client";

import { GripVertical, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type DragEvent } from "react";
import { StatusBadge } from "@/src/admin/components/status-badge";
import { Button } from "@/src/admin/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/admin/components/ui/card";
import { Input } from "@/src/admin/components/ui/input";
import {
  addProductToCollection,
  removeProductFromCollection,
  reorderCollectionProducts,
  searchProductsForPicker,
  type PickerProduct,
} from "@/src/modules/catalog/actions";

export type CollectionProductRow = { id: string; title: string; handle: string; status: string; imageUrl: string | null };

/**
 * Manual collection membership: search and add products, remove them, and
 * drag (or use the keyboard buttons) to set their position.
 */
export function ProductPicker({ collectionId, products }: { collectionId: string; products: CollectionProductRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickerProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local order while dragging; server order wins after refresh.
  const [order, setOrder] = useState<string[] | null>(null);
  const serverIds = products.map((p) => p.id).join(",");
  const [seen, setSeen] = useState(serverIds);
  if (seen !== serverIds) {
    setSeen(serverIds);
    setOrder(null);
  }
  const byId = new Map(products.map((p) => [p.id, p]));
  const ordered = (order ?? products.map((p) => p.id)).flatMap((id) => {
    const p = byId.get(id);
    return p ? [p] : [];
  });
  const [dragId, setDragId] = useState<string | null>(null);

  // Debounced search excluding products already in the collection.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onQueryChange = (value: string) => {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    const q = value.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(async () => {
      const result = await searchProductsForPicker(q, products.map((p) => p.id));
      setSearching(false);
      if (result.ok) setResults(result.data);
      else setError(result.error);
    }, 250);
  };

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(null);
      const result = await fn();
      if (!result.ok) setError(result.error ?? "Something went wrong.");
      router.refresh();
    });

  const add = (productId: string) => {
    setResults((r) => r.filter((p) => p.id !== productId));
    run(() => addProductToCollection(collectionId, productId));
  };
  const remove = (productId: string) => run(() => removeProductFromCollection(collectionId, productId));

  const commit = (next: string[]) => {
    setOrder(next);
    run(() => reorderCollectionProducts(collectionId, next));
  };
  const moveTo = (sourceId: string, targetId: string) => {
    const ids = ordered.map((p) => p.id);
    const from = ids.indexOf(sourceId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0 || from === to) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, sourceId);
    commit(next);
  };
  const move = (id: string, delta: -1 | 1) => {
    const ids = ordered.map((p) => p.id);
    const target = ids[ids.indexOf(id) + delta];
    if (target) moveTo(id, target);
  };
  const onDrop = (e: DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = dragId ?? e.dataTransfer.getData("text/plain");
    setDragId(null);
    if (sourceId) moveTo(sourceId, targetId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Products</CardTitle>
        <CardDescription>
          {ordered.length} product{ordered.length === 1 ? "" : "s"}. Drag rows to change the order shown on the storefront.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search products to add…"
            className="pl-8"
            aria-label="Search products to add"
          />
          {query.trim() ? (
            <ul className="absolute z-20 mt-1 w-full rounded-md border bg-popover p-1 shadow-md" role="listbox" aria-label="Search results">
              {searching && results.length === 0 ? <li className="px-2 py-1.5 text-sm text-muted-foreground">Searching…</li> : null}
              {!searching && results.length === 0 ? <li className="px-2 py-1.5 text-sm text-muted-foreground">No products found.</li> : null}
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                    onClick={() => add(p.id)}
                    disabled={isPending}
                  >
                    <Thumb url={p.imageUrl} />
                    <span className="flex-1 truncate">{p.title}</span>
                    <Plus className="size-4 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {ordered.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">No products yet. Search above to add some.</p>
        ) : (
          <ol className="divide-y rounded-md border" data-testid="collection-products">
            {ordered.map((p, index) => (
              <li
                key={p.id}
                data-product-id={p.id}
                draggable
                onDragStart={(e) => {
                  setDragId(p.id);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", p.id);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(e, p.id)}
                onDragEnd={() => setDragId(null)}
                className={`flex items-center gap-3 px-2 py-2 ${dragId === p.id ? "opacity-50" : ""}`}
              >
                <GripVertical className="size-4 cursor-grab text-muted-foreground" aria-hidden />
                <span className="w-6 text-right text-xs tabular-nums text-muted-foreground">{index + 1}</span>
                <Thumb url={p.imageUrl} />
                <span className="min-w-0 flex-1">
                  <Link href={`/admin/products/${p.id}`} className="block truncate text-sm font-medium hover:underline">
                    {p.title}
                  </Link>
                  <span className="block truncate text-xs text-muted-foreground">/{p.handle}</span>
                </span>
                <StatusBadge status={p.status} />
                <span className="flex gap-0.5">
                  <Button type="button" variant="ghost" size="icon" className="size-7" aria-label={`Move ${p.title} up`} disabled={index === 0 || isPending} onClick={() => move(p.id, -1)}>
                    ↑
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="size-7" aria-label={`Move ${p.title} down`} disabled={index === ordered.length - 1 || isPending} onClick={() => move(p.id, 1)}>
                    ↓
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="size-7" aria-label={`Remove ${p.title}`} disabled={isPending} onClick={() => remove(p.id)}>
                    <X className="size-4" />
                  </Button>
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function Thumb({ url }: { url: string | null }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
    <img src={url} alt="" className="size-8 shrink-0 rounded object-cover" />
  ) : (
    <span className="size-8 shrink-0 rounded bg-muted" />
  );
}
