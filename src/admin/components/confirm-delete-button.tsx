"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ComponentProps } from "react";
import { Button } from "@/src/admin/components/ui/button";
import type { ActionResult } from "@/src/lib/action-result";

/** Confirms, runs a delete action, refreshes. Shows the action's error inline. */
export function ConfirmDeleteButton({
  action,
  message,
  label = "Delete",
  iconOnly = false,
  ...props
}: {
  action: () => Promise<ActionResult<unknown>>;
  message: string;
  label?: string;
  iconOnly?: boolean;
} & Omit<ComponentProps<typeof Button>, "onClick" | "children">) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
      <Button
        type="button"
        variant="ghost"
        size={iconOnly ? "icon" : "sm"}
        aria-label={iconOnly ? label : undefined}
        disabled={isPending}
        {...props}
        onClick={() => {
          if (!window.confirm(message)) return;
          startTransition(async () => {
            const result = await action();
            if (!result.ok) setError(result.error);
            router.refresh();
          });
        }}
      >
        <Trash2 className="size-4" />
        {iconOnly ? null : label}
      </Button>
    </span>
  );
}
