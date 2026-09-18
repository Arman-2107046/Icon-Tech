import { CartProvider } from "@/src/storefront/cart/cart-context";
import { CartDrawer } from "@/src/storefront/cart/cart-drawer";
import { Footer } from "@/src/storefront/components/footer/footer";
import { Header } from "@/src/storefront/components/header/header";

export default function StorefrontLayout({ children }: LayoutProps<"/">) {
  return (
    <CartProvider>
      <div className="flex min-h-full flex-1 flex-col bg-canvas font-text text-ink">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
      <CartDrawer />
    </CartProvider>
  );
}
