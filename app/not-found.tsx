import type { Metadata } from "next";
import { CartProvider } from "@/src/storefront/cart/cart-context";
import { CartDrawer } from "@/src/storefront/cart/cart-drawer";
import { Footer } from "@/src/storefront/components/footer/footer";
import { Header } from "@/src/storefront/components/header/header";
import { MotionProvider } from "@/src/storefront/motion/provider";
import StorefrontNotFound from "./(storefront)/not-found";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

/** Unknown URLs outside any route group get the full storefront chrome. */
export default function RootNotFound() {
  return (
    <MotionProvider>
      <CartProvider>
        <div className="flex min-h-full flex-1 flex-col bg-canvas font-text text-ink">
          <Header />
          <main className="flex-1">
            <StorefrontNotFound />
          </main>
          <Footer />
        </div>
        <CartDrawer />
      </CartProvider>
    </MotionProvider>
  );
}
