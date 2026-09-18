import type { ReactNode } from "react";
import { Separator } from "@/src/admin/components/ui/separator";
import { SidebarTrigger } from "@/src/admin/components/ui/sidebar";

/** Sticky page header: sidebar toggle, title, optional actions on the right. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div className="flex min-w-0 flex-1 items-baseline gap-2">
        <h1 className="truncate text-base font-semibold">{title}</h1>
        {description ? <p className="hidden truncate text-sm text-muted-foreground sm:block">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}
