"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { startCheckout } from "@/src/modules/checkout/actions";

/**
 * On entering checkout, (re)reserve the cart's stock. If quantities had to
 * be reduced, say so and refresh so the summary matches.
 */
export function ReservationRefresher() {
  const router = useRouter();
  const ran = useRef(false);
  const [notices, setNotices] = useState<string[]>([]);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void startCheckout().then((result) => {
      if (result.ok && result.data.adjusted.length) {
        setNotices(result.data.adjusted);
        router.refresh();
      } else if (!result.ok) {
        setNotices([result.error]);
      }
    });
  }, [router]);
  if (notices.length === 0) return null;
  return (
    <ul role="alert" className="mb-s4 space-y-s0-5 rounded-sf-md bg-danger-soft px-s2 py-s1 text-t-sm text-danger" data-testid="stock-notice">
      {notices.map((n) => (
        <li key={n}>{n}</li>
      ))}
    </ul>
  );
}
