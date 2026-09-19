import { ConfirmDeleteButton } from "@/src/admin/components/confirm-delete-button";
import { PageHeader } from "@/src/admin/components/page-header";
import { Badge } from "@/src/admin/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/admin/components/ui/table";
import { AddDiscountButton, EditDiscountButton, type DiscountInitial } from "@/src/admin/features/discounts/discount-forms";
import { requireAdmin } from "@/src/lib/auth/guards";
import { formatMoney, money, toMajorUnits } from "@/src/lib/money";
import { listDiscounts } from "@/src/modules/discounts";
import { deleteDiscount } from "@/src/modules/discounts/actions";

const major = (minor: number | null) => (minor === null ? "" : toMajorUnits(money(minor)).toFixed(2));
/** datetime-local wants local wall time without zone or seconds. */
const local = (d: Date | null) => {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function describe(d: { type: string; value: number }): string {
  if (d.type === "PERCENTAGE") return `${(d.value / 100).toFixed(d.value % 100 ? 2 : 0)}% off`;
  if (d.type === "FIXED_AMOUNT") return `${formatMoney(money(d.value))} off`;
  return "Free shipping";
}

function statusOf(d: { active: boolean; startsAt: Date | null; endsAt: Date | null; usageLimit: number | null; _count: { redemptions: number } }): { label: string; variant: "default" | "secondary" | "outline" } {
  const now = Date.now();
  if (!d.active) return { label: "Inactive", variant: "outline" };
  if (d.startsAt && d.startsAt.getTime() > now) return { label: "Scheduled", variant: "secondary" };
  if (d.endsAt && d.endsAt.getTime() < now) return { label: "Expired", variant: "outline" };
  if (d.usageLimit !== null && d._count.redemptions >= d.usageLimit) return { label: "Exhausted", variant: "outline" };
  return { label: "Active", variant: "default" };
}

export default async function DiscountsPage() {
  await requireAdmin();
  const discounts = await listDiscounts();

  return (
    <>
      <PageHeader title="Discounts" description="Codes customers enter at checkout. Stackable codes combine; others are exclusive." actions={<AddDiscountButton />} />
      <div className="p-6">
        {discounts.length === 0 ? (
          <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">No discounts yet.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Minimum</TableHead>
                  <TableHead className="text-right">Used</TableHead>
                  <TableHead>Stacking</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {discounts.map((d) => {
                  const status = statusOf(d);
                  const initial: DiscountInitial = {
                    id: d.id,
                    code: d.code,
                    title: d.title,
                    type: d.type,
                    value: d.type === "PERCENTAGE" ? (d.value / 100).toString() : d.type === "FIXED_AMOUNT" ? major(d.value) : "",
                    minOrderSubtotal: major(d.minOrderSubtotal),
                    usageLimit: d.usageLimit?.toString() ?? "",
                    usageLimitPerUser: d.usageLimitPerUser?.toString() ?? "",
                    stackable: d.stackable,
                    active: d.active,
                    startsAt: local(d.startsAt),
                    endsAt: local(d.endsAt),
                  };
                  return (
                    <TableRow key={d.id} data-testid="discount-row">
                      <TableCell>
                        <span className="font-mono font-medium">{d.code}</span>
                        <span className="block text-xs text-muted-foreground">{d.title}</span>
                      </TableCell>
                      <TableCell>{describe(d)}</TableCell>
                      <TableCell>{d.minOrderSubtotal === null ? <span className="text-muted-foreground">—</span> : formatMoney(money(d.minOrderSubtotal))}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {d._count.redemptions}
                        {d.usageLimit !== null ? <span className="text-muted-foreground"> / {d.usageLimit}</span> : null}
                      </TableCell>
                      <TableCell>{d.stackable ? <Badge variant="secondary">Stackable</Badge> : <span className="text-muted-foreground">Exclusive</span>}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <EditDiscountButton discount={initial} />
                          <ConfirmDeleteButton iconOnly label={`Delete discount ${d.code}`} message={`Delete "${d.code}"? Past orders keep their totals.`} action={deleteDiscount.bind(null, d.id)} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  );
}
