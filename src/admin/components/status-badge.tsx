import { Badge } from "@/src/admin/components/ui/badge";

const STYLES: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Active", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-transparent" },
  DRAFT: { label: "Draft", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-transparent" },
  ARCHIVED: { label: "Archived", className: "bg-muted text-muted-foreground border-transparent" },
};

export function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? { label: status, className: "" };
  return (
    <Badge variant="outline" className={style.className}>
      {style.label}
    </Badge>
  );
}
