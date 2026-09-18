"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, type ReactElement, type ReactNode } from "react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/src/admin/components/ui/sheet";
import { Button } from "@/src/admin/components/ui/button";
import { ActionForm, type FormAction } from "./action-form";
import { SubmitButton } from "./fields";

/**
 * Sheet + ActionForm. Opens from `trigger`, submits to `action`, and on
 * success closes, refreshes the Server Component tree so the list behind it
 * shows the change, and calls `onSuccess`. Failures keep the drawer open
 * with errors inline.
 */
export function DrawerForm<T>({
  trigger,
  title,
  description,
  action,
  submitLabel = "Save",
  onSuccess,
  side = "right",
  children,
}: {
  /** A <Button> (or other native button element) that opens the drawer. */
  trigger: ReactElement;
  title: string;
  description?: string;
  action: FormAction<T>;
  submitLabel?: string;
  onSuccess?: (data: T) => void;
  side?: "right" | "left";
  children: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleSuccess = useCallback(
    (data: T) => {
      setOpen(false);
      router.refresh();
      onSuccess?.(data);
    },
    [router, onSuccess],
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={trigger} />
      <SheetContent side={side} className="flex w-full flex-col gap-0 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        {/* key resets useActionState each time the drawer opens */}
        <ActionForm key={String(open)} action={action} onSuccess={handleSuccess} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">{children}</div>
          <SheetFooter className="border-t">
            <SheetClose render={<Button type="button" variant="outline" />}>Cancel</SheetClose>
            <SubmitButton>{submitLabel}</SubmitButton>
          </SheetFooter>
        </ActionForm>
      </SheetContent>
    </Sheet>
  );
}
