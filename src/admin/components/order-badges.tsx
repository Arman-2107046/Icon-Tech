import { Badge } from "@/src/admin/components/ui/badge";

const ORDER: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  PAID: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  FULFILLED: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  COMPLETED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  CANCELLED: "bg-muted text-muted-foreground",
  REFUNDED: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
};
const MONEY: Record<string, string> = {
  UNPAID: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  AUTHORIZED: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  PAID: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  PARTIALLY_REFUNDED: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  REFUNDED: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  VOIDED: "bg-muted text-muted-foreground",
};
const SHIP: Record<string, string> = {
  UNFULFILLED: "bg-muted text-muted-foreground",
  PARTIALLY_FULFILLED: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  FULFILLED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};

const label = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");

export function OrderStatusBadge({ status }: { status: string }) {
  return <Badge variant="outline" className={`border-transparent ${ORDER[status] ?? ""}`}>{label(status)}</Badge>;
}
export function FinancialBadge({ status }: { status: string }) {
  return <Badge variant="outline" className={`border-transparent ${MONEY[status] ?? ""}`}>{label(status)}</Badge>;
}
export function FulfillmentBadge({ status }: { status: string }) {
  return <Badge variant="outline" className={`border-transparent ${SHIP[status] ?? ""}`}>{label(status)}</Badge>;
}
