"use client";

import { ChevronLeft, ChevronRight, GripVertical, ImagePlus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type DragEvent } from "react";
import { Button } from "@/src/admin/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/admin/components/ui/card";
import { deleteMedia, reorderMedia } from "@/src/modules/catalog/actions";
import { readImageMeta } from "./image-meta";
import { MediaAltForm } from "./media-alt-form";

export type MediaCardData = {
  id: string;
  url: string;
  alt: string;
  width: number;
  height: number;
  blurhash: string | null;
  position: number;
};

type OwnerType = "PRODUCT" | "VARIANT" | "COLLECTION" | "PAGE";

type UploadState = { name: string; status: "reading" | "uploading" | "error"; error?: string };

export function MediaManager({ ownerType, ownerId, media }: { ownerType: OwnerType; ownerId: string; media: MediaCardData[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [isPending, startTransition] = useTransition();

  // Order is owned locally while dragging; the server order (props) wins
  // once router.refresh() lands after a successful reorder.
  const [order, setOrder] = useState<string[] | null>(null);
  const serverIds = media.map((m) => m.id).join(",");
  const [seenServerIds, setSeenServerIds] = useState(serverIds);
  if (serverIds !== seenServerIds) {
    setSeenServerIds(serverIds);
    setOrder(null);
  }
  const byId = new Map(media.map((m) => [m.id, m]));
  const ordered = (order ?? media.map((m) => m.id)).flatMap((id) => {
    const m = byId.get(id);
    return m ? [m] : [];
  });
  const [dragId, setDragId] = useState<string | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);

  // Commits are serialised: a second drag while the first is saving must
  // not race it (both would read stale state), so each waits for the last.
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  function commit(next: string[]) {
    setOrder(next);
    setReorderError(null);
    startTransition(async () => {
      const run = queue.current.then(() => reorderMedia(ownerType, ownerId, next));
      queue.current = run.catch(() => undefined);
      const result = await run;
      if (!result.ok) setReorderError(result.error);
      router.refresh();
    });
  }

  function move(id: string, delta: -1 | 1) {
    const ids = ordered.map((m) => m.id);
    const from = ids.indexOf(id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= ids.length) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, id);
    commit(next);
  }

  function onDragStart(e: DragEvent, id: string) {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }

  function onDrop(e: DragEvent, targetId: string) {
    e.preventDefault();
    const sourceId = dragId ?? e.dataTransfer.getData("text/plain");
    setDragId(null);
    if (!sourceId || sourceId === targetId) return;
    const ids = ordered.map((m) => m.id);
    const from = ids.indexOf(sourceId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, sourceId);
    commit(next);
  }

  const setStatus = (name: string, patch: Partial<UploadState>) =>
    setUploads((list) => list.map((u) => (u.name === name ? { ...u, ...patch } : u)));

  async function upload(file: File) {
    setUploads((list) => [...list, { name: file.name, status: "reading" }]);
    try {
      const meta = await readImageMeta(file);
      setStatus(file.name, { status: "uploading" });
      const body = new FormData();
      body.set("file", file);
      body.set("ownerType", ownerType);
      body.set("ownerId", ownerId);
      body.set("width", String(meta.width));
      body.set("height", String(meta.height));
      body.set("blurhash", meta.blurhash);
      body.set("alt", "");
      const res = await fetch("/api/admin/media", { method: "POST", body });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? `Upload failed (${res.status})`);
      setUploads((list) => list.filter((u) => u.name !== file.name));
      router.refresh();
    } catch (error) {
      setStatus(file.name, { status: "error", error: error instanceof Error ? error.message : "Upload failed" });
    }
  }

  function onFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) void upload(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteMedia(id);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Media</CardTitle>
        <CardDescription>JPEG, PNG, WebP, GIF or AVIF up to 10 MB. Drag to reorder; the first image is the cover.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {reorderError ? <p role="alert" className="text-sm text-destructive">{reorderError}</p> : null}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" data-testid="media-grid">
          {ordered.map((m, index) => (
            <figure
              key={m.id}
              className={`space-y-2 rounded-md border p-2 ${dragId === m.id ? "opacity-50" : ""}`}
              data-testid="media-item"
              data-media-id={m.id}
              data-blurhash={m.blurhash ?? ""}
              draggable
              onDragStart={(e) => onDragStart(e, m.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDrop(e, m.id)}
              onDragEnd={() => setDragId(null)}
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded bg-muted">
                <span className="absolute bottom-1.5 left-1.5 rounded bg-background/90 p-0.5 text-muted-foreground" aria-hidden>
                  <GripVertical className="size-3.5" />
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of arbitrary hosts */}
                <img src={m.url} alt={m.alt} className="size-full object-cover" />
                {index === 0 ? (
                  <span className="absolute left-1.5 top-1.5 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                    Cover
                  </span>
                ) : null}
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute right-1.5 top-1.5 size-7"
                  aria-label={`Delete image ${index + 1}`}
                  disabled={isPending}
                  onClick={() => remove(m.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              <MediaAltForm mediaId={m.id} alt={m.alt} index={index} />
              <figcaption className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  {m.width} × {m.height}
                </span>
                <span className="flex gap-0.5">
                  <Button type="button" variant="ghost" size="icon" className="size-6" aria-label={`Move image ${index + 1} earlier`} disabled={index === 0 || isPending} onClick={() => move(m.id, -1)}>
                    <ChevronLeft className="size-3.5" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="size-6" aria-label={`Move image ${index + 1} later`} disabled={index === ordered.length - 1 || isPending} onClick={() => move(m.id, 1)}>
                    <ChevronRight className="size-3.5" />
                  </Button>
                </span>
              </figcaption>
            </figure>
          ))}

          {uploads.map((u) => (
            <div key={u.name} className="flex aspect-[4/5] flex-col items-center justify-center rounded-md border border-dashed p-2 text-center text-xs">
              <span className="truncate font-medium">{u.name}</span>
              <span className={u.status === "error" ? "text-destructive" : "text-muted-foreground"}>
                {u.status === "reading" ? "Reading…" : u.status === "uploading" ? "Uploading…" : u.error}
              </span>
            </div>
          ))}

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-md border border-dashed text-sm text-muted-foreground hover:bg-muted/50"
          >
            <ImagePlus className="size-5" />
            Add images
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          multiple
          className="sr-only"
          aria-label="Upload images"
          onChange={(e) => onFiles(e.target.files)}
        />
      </CardContent>
    </Card>
  );
}
