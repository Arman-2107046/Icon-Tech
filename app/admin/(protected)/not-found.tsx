import Link from "next/link";
import { PageHeader } from "@/src/admin/components/page-header";
import { Button } from "@/src/admin/components/ui/button";

export default function AdminNotFound() {
  return (
    <>
      <PageHeader title="Not found" />
      <div className="p-6">
        <p className="text-sm text-muted-foreground">That page does not exist.</p>
        <Button className="mt-4" variant="outline" render={<Link href="/admin" />}>
          Back to dashboard
        </Button>
      </div>
    </>
  );
}
