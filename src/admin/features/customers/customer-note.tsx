"use client";

import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";
import { ActionForm, SubmitButton, TextareaField } from "@/src/admin/components/form";
import { Button } from "@/src/admin/components/ui/button";
import { saveCustomerNote, setCustomerMarketing } from "@/src/modules/customers/actions";

export function CustomerNoteForm({ customerId, note }: { customerId: string; note: string }) {
  const router = useRouter();
  const onSuccess = useCallback(() => router.refresh(), [router]);
  return (
    <ActionForm action={saveCustomerNote.bind(null, customerId)} onSuccess={onSuccess}>
      <TextareaField name="note" label="Staff notes" rows={4} defaultValue={note} hint="Only staff can see this." />
      <div className="flex justify-end">
        <SubmitButton size="sm" variant="outline">
          Save note
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

export function MarketingToggle({ customerId, accepts }: { customerId: string; accepts: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await setCustomerMarketing(customerId, !accepts);
          router.refresh();
        })
      }
    >
      {accepts ? "Unsubscribe from marketing" : "Subscribe to marketing"}
    </Button>
  );
}
