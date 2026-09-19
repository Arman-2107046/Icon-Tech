"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { ActionForm, SubmitButton, TextareaField } from "@/src/admin/components/form";
import { saveInternalNote } from "@/src/modules/orders/actions";

export function InternalNoteForm({ orderId, note }: { orderId: string; note: string }) {
  const router = useRouter();
  const onSuccess = useCallback(() => router.refresh(), [router]);
  return (
    <ActionForm action={saveInternalNote.bind(null, orderId)} onSuccess={onSuccess}>
      <TextareaField name="internalNote" label="Internal notes" rows={4} defaultValue={note} hint="Only staff can see this." />
      <div className="flex justify-end">
        <SubmitButton size="sm" variant="outline">
          Save note
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
