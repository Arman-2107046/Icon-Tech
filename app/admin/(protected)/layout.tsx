import { AdminSidebar } from "@/src/admin/components/admin-sidebar";
import { AdminThemeProvider, AdminThemeScript } from "@/src/admin/components/theme";
import { SidebarInset, SidebarProvider } from "@/src/admin/components/ui/sidebar";
import { TooltipProvider } from "@/src/admin/components/ui/tooltip";
import { requireAdmin } from "@/src/lib/auth/guards";

/**
 * Everything under /admin except /admin/login. Redirects anonymous
 * visitors to the login page; pages and actions re-check via requireAdmin.
 * Sidebar + header + content is the entire admin design language.
 */
export default async function AdminProtectedLayout({ children }: LayoutProps<"/admin">) {
  const session = await requireAdmin();
  return (
    <AdminThemeProvider>
      <AdminThemeScript />
      <TooltipProvider>
        <SidebarProvider>
          <AdminSidebar user={session.user} />
          <SidebarInset>{children}</SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </AdminThemeProvider>
  );
}
