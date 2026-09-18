"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/src/admin/components/ui/button";
import { deleteCollection } from "@/src/modules/catalog/actions";

export function DeleteCollectionButton({ collectionId, title }: { collectionId: string; title: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => {
          if (!window.confirm(`Delete the collection "${title}"? Products are not deleted.`)) return;
          startTransition(async () => {
            const result = await deleteCollection(collectionId);
            if (!result.ok) setError(result.error);
          });
        }}
      >
        <Trash2 className="size-4" />
        Delete
      </Button>
    </>
  );
}
