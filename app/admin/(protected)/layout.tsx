import { Suspense } from "react";
import { AdminSidebar } from "@/src/admin/components/admin-sidebar";
import { AdminThemeProvider, AdminThemeScript } from "@/src/admin/components/theme";
import { SidebarInset, SidebarProvider } from "@/src/admin/components/ui/sidebar";
import { Skeleton } from "@/src/admin/components/ui/skeleton";
import { TooltipProvider } from "@/src/admin/components/ui/tooltip";
import { requireAdmin } from "@/src/lib/auth/guards";

// Session-gated: never prerendered as an instant shell (dev-only validation).
export const instant = false;

/**
 * Everything under /admin except /admin/login. Redirects anonymous
 * visitors to the login page; pages and actions re-check via requireAdmin.
 * Sidebar + header + content is the entire admin design language.
 *
 * The session read is runtime data, so it lives in an async shell inside
 * Suspense (Cache Components requirement); the layout itself stays static.
 */
export default function AdminProtectedLayout({ children }: LayoutProps<"/admin">) {
  return (
    <AdminThemeProvider>
      <AdminThemeScript />
      <TooltipProvider>
        <SidebarProvider>
          <Suspense fallback={<ShellFallback />}>
            <AdminShell>{children}</AdminShell>
          </Suspense>
        </SidebarProvider>
      </TooltipProvider>
    </AdminThemeProvider>
  );
}

async function AdminShell({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return (
    <>
      <AdminSidebar user={session.user} />
      <SidebarInset>{children}</SidebarInset>
    </>
  );
}

function ShellFallback() {
  return (
    <div className="flex min-h-svh w-full">
      <div className="hidden w-64 border-r p-4 md:block">
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="flex-1 p-6">
        <Skeleton className="h-6 w-48" />
      </div>
    </div>
  );
}
