import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/admin/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/admin/components/ui/table";
import { formatMoney, money } from "@/src/lib/money";
import type { AdminProduct } from "@/src/modules/catalog";

export function VariantsTable({ product }: { product: AdminProduct }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Variants</CardTitle>
        <CardDescription>
          {product.variants.length} variant{product.variants.length === 1 ? "" : "s"} generated from the options above.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Variant</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Compare at</TableHead>
                <TableHead className="text-right">Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {product.variants.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.title}</TableCell>
                  <TableCell className="font-mono text-xs">{v.sku ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(money(v.price))}</TableCell>
                  <TableCell className="text-right tabular-nums">{v.compareAtPrice ? formatMoney(money(v.compareAtPrice)) : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-right tabular-nums">{v.inventory?.available ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
