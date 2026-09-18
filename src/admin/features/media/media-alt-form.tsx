"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { ActionForm, SubmitButton, TextField } from "@/src/admin/components/form";
import { updateMediaAlt } from "@/src/modules/catalog/actions";

export function MediaAltForm({ mediaId, alt, index }: { mediaId: string; alt: string; index: number }) {
  const router = useRouter();
  const onSuccess = useCallback(() => router.refresh(), [router]);
  return (
    <ActionForm action={updateMediaAlt.bind(null, mediaId)} onSuccess={onSuccess} className="flex items-end gap-1">
      <TextField name="alt" label={`Alt text ${index + 1}`} defaultValue={alt} placeholder="Describe the image" className="flex-1 [&_label]:sr-only" />
      <SubmitButton size="sm" variant="outline" pendingLabel="…">
        Save
      </SubmitButton>
    </ActionForm>
  );
}
