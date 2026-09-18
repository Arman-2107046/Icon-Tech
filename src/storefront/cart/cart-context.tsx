"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { addToCart as addToCartAction, fetchCart, removeCartLine, updateCartLine } from "@/src/modules/cart/actions";
import { EMPTY_CART, type CartView } from "@/src/modules/cart/types";

/**
 * Client-side cart state shared by the header count, the drawer and the
 * product page. Quantity changes apply instantly (optimistic) and roll back
 * if the server rejects them; the server's view always wins on success.
 */

type CartContextValue = {
  cart: CartView;
  /** Null until the first server read; the header uses its SSR count meanwhile. */
  loaded: boolean;
  open: boolean;
  pendingLines: Set<string>;
  error: string | null;
  openDrawer: () => void;
  closeDrawer: () => void;
  addLine: (variantId: string, quantity?: number) => Promise<{ ok: boolean; error?: string }>;
  setQuantity: (lineId: string, quantity: number) => Promise<void>;
  removeLine: (lineId: string) => Promise<void>;
  dismissError: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

/** Apply a quantity locally, recomputing totals the same way the server does. */
function withQuantity(cart: CartView, lineId: string, quantity: number): CartView {
  const lines = cart.lines.flatMap((l) => (l.id === lineId ? (quantity <= 0 ? [] : [{ ...l, quantity, lineTotal: l.unitPrice * quantity }]) : [l]));
  return { ...cart, lines, count: lines.reduce((n, l) => n + l.quantity, 0), subtotal: lines.reduce((n, l) => n + l.lineTotal, 0) };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartView>(EMPTY_CART);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [pendingLines, setPending] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  // Serialise mutations per line so a rapid +/+/− never races itself.
  const queues = useRef(new Map<string, Promise<unknown>>());

  const load = useCallback(async () => {
    const result = await fetchCart();
    if (result.ok) {
      setCart(result.data);
      setLoaded(true);
    }
  }, []);

  const openDrawer = useCallback(() => {
    setOpen(true);
    if (!loaded) void load();
  }, [loaded, load]);
  const closeDrawer = useCallback(() => setOpen(false), []);

  const addLine = useCallback(async (variantId: string, quantity = 1) => {
    setError(null);
    const result = await addToCartAction(variantId, quantity);
    if (!result.ok) return { ok: false, error: result.error };
    setCart(result.data);
    setLoaded(true);
    setOpen(true);
    return { ok: true };
  }, []);

  const mutate = useCallback(
    async (lineId: string, quantity: number, run: () => Promise<{ ok: true; data: CartView } | { ok: false; error: string }>) => {
      setError(null);
      const previous = queues.current.get(lineId) ?? Promise.resolve();
      const job = previous.then(async () => {
        let snapshot: CartView = EMPTY_CART;
        setCart((c) => {
          snapshot = c;
          return withQuantity(c, lineId, quantity);
        });
        setPending((p) => new Set(p).add(lineId));
        try {
          const result = await run();
          if (result.ok) setCart(result.data);
          else {
            setCart(snapshot);
            setError(result.error);
          }
        } finally {
          setPending((p) => {
            const next = new Set(p);
            next.delete(lineId);
            return next;
          });
        }
      });
      queues.current.set(lineId, job.catch(() => undefined));
      await job;
    },
    [],
  );

  const setQuantity = useCallback((lineId: string, quantity: number) => mutate(lineId, quantity, () => updateCartLine(lineId, quantity)), [mutate]);
  const removeLine = useCallback((lineId: string) => mutate(lineId, 0, () => removeCartLine(lineId)), [mutate]);
  const dismissError = useCallback(() => setError(null), []);

  const value = useMemo<CartContextValue>(
    () => ({ cart, loaded, open, pendingLines, error, openDrawer, closeDrawer, addLine, setQuantity, removeLine, dismissError }),
    [cart, loaded, open, pendingLines, error, openDrawer, closeDrawer, addLine, setQuantity, removeLine, dismissError],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
