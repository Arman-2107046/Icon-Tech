import { ConfirmDeleteButton } from "@/src/admin/components/confirm-delete-button";
import { PageHeader } from "@/src/admin/components/page-header";
import { Badge } from "@/src/admin/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/admin/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/admin/components/ui/table";
import { AddRateButton, AddZoneButton, EditRateButton, EditZoneButton } from "@/src/admin/features/shipping/zone-forms";
import { requireAdmin } from "@/src/lib/auth/guards";
import { formatMoney, money, toMajorUnits } from "@/src/lib/money";
import { listShippingZones } from "@/src/modules/checkout";
import { deleteShippingRate, deleteShippingZone } from "@/src/modules/checkout/actions";

const major = (minor: number | null) => (minor === null ? "" : toMajorUnits(money(minor)).toFixed(2));

export default async function ShippingPage() {
  await requireAdmin();
  const zones = await listShippingZones();

  return (
    <>
      <PageHeader title="Shipping" description="Zones group countries; each zone offers one or more rates." actions={<AddZoneButton />} />
      <div className="space-y-6 p-6">
        {zones.length === 0 ? (
          <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">No shipping zones yet. Add one to start selling.</p>
        ) : null}
        {zones.map((zone) => (
          <Card key={zone.id} data-testid="shipping-zone">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>{zone.name}</CardTitle>
                <CardDescription className="mt-1 flex flex-wrap gap-1">
                  {zone.countries.map((c) => (
                    <Badge key={c} variant="secondary">
                      {c}
                    </Badge>
                  ))}
                </CardDescription>
              </div>
              <div className="flex items-center gap-1">
                <AddRateButton zoneId={zone.id} zoneName={zone.name} />
                <EditZoneButton zone={{ id: zone.id, name: zone.name, countries: zone.countries }} />
                <ConfirmDeleteButton
                  iconOnly
                  label={`Delete zone ${zone.name}`}
                  message={`Delete the "${zone.name}" zone and its ${zone.rates.length} rate(s)?`}
                  action={deleteShippingZone.bind(null, zone.id)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {zone.rates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No rates yet — customers in this zone cannot check out until one exists.</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rate</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead>Applies to subtotal</TableHead>
                        <TableHead className="w-24" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {zone.rates.map((rate) => (
                        <TableRow key={rate.id}>
                          <TableCell className="font-medium">{rate.name}</TableCell>
                          <TableCell className="text-right tabular-nums">{rate.price === 0 ? "Free" : formatMoney(money(rate.price))}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {rate.minOrderSubtotal === null && rate.maxOrderSubtotal === null
                              ? "Any amount"
                              : `${rate.minOrderSubtotal !== null ? `from ${formatMoney(money(rate.minOrderSubtotal))}` : ""}${rate.minOrderSubtotal !== null && rate.maxOrderSubtotal !== null ? " " : ""}${rate.maxOrderSubtotal !== null ? `up to ${formatMoney(money(rate.maxOrderSubtotal))}` : ""}`}
                          </TableCell>
                          <TableCell className="text-right">
                            <EditRateButton rate={{ id: rate.id, name: rate.name, price: major(rate.price), minOrderSubtotal: major(rate.minOrderSubtotal), maxOrderSubtotal: major(rate.maxOrderSubtotal) }} />
                            <ConfirmDeleteButton iconOnly label={`Delete rate ${rate.name}`} message={`Delete the "${rate.name}" rate?`} action={deleteShippingRate.bind(null, rate.id)} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
