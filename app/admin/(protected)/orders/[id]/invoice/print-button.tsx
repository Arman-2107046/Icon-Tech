"use client";

import { Printer } from "lucide-react";
import { Button } from "@/src/admin/components/ui/button";

export function PrintButton() {
  return (
    <Button size="sm" onClick={() => window.print()}>
      <Printer className="size-4" />
      Print
    </Button>
  );
}
