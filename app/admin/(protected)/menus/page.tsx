import { ConfirmDeleteButton } from "@/src/admin/components/confirm-delete-button";
import { PageHeader } from "@/src/admin/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/admin/components/ui/card";
import { AddMenuButton, AddMenuItemButton, EditMenuButton, EditMenuItemButton, MoveItemButtons } from "@/src/admin/features/menus/menu-forms";
import { requireAdmin } from "@/src/lib/auth/guards";
import { buildMenuTree, listMenusForAdmin, type AdminMenuItem } from "@/src/modules/content";
import { deleteMenu, deleteMenuItem } from "@/src/modules/content/actions";

function ItemRow({ item, parents, index, count, depth }: { item: AdminMenuItem; parents: { value: string; label: string }[]; index: number; count: number; depth: 0 | 1 }) {
  return (
    <li className={`flex items-center gap-2 py-1.5 ${depth === 1 ? "pl-8" : ""}`} data-testid="menu-item" data-depth={depth}>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{item.label}</span>
        <span className="block truncate text-xs text-muted-foreground">{item.url}</span>
      </span>
      <MoveItemButtons itemId={item.id} label={item.label} isFirst={index === 0} isLast={index === count - 1} />
      <EditMenuItemButton item={{ id: item.id, label: item.label, url: item.url, parentId: item.parentId }} parents={parents} />
      <ConfirmDeleteButton iconOnly className="size-7" label={`Delete item ${item.label}`} message={`Delete "${item.label}"${depth === 0 ? " and its sub-items" : ""}?`} action={deleteMenuItem.bind(null, item.id)} />
    </li>
  );
}

export default async function MenusPage() {
  await requireAdmin();
  const menus = await listMenusForAdmin();

  return (
    <>
      <PageHeader title="Menus" description="Navigation shown on the storefront." actions={<AddMenuButton />} />
      <div className="space-y-6 p-6">
        {menus.length === 0 ? <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">No menus yet.</p> : null}
        {menus.map((menu) => {
          const tree = buildMenuTree(menu.items);
          const parents = tree.map((t) => ({ value: t.id, label: t.label }));
          return (
            <Card key={menu.id} data-testid="menu" data-handle={menu.handle}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>{menu.title}</CardTitle>
                  <CardDescription>
                    handle: <code>{menu.handle}</code> · {menu.items.length} item{menu.items.length === 1 ? "" : "s"}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <AddMenuItemButton menuId={menu.id} menuTitle={menu.title} parents={parents} />
                  <EditMenuButton menu={{ id: menu.id, title: menu.title, handle: menu.handle }} />
                  <ConfirmDeleteButton iconOnly label={`Delete menu ${menu.title}`} message={`Delete the "${menu.title}" menu and all its items?`} action={deleteMenu.bind(null, menu.id)} />
                </div>
              </CardHeader>
              <CardContent>
                {tree.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No items yet.</p>
                ) : (
                  <ol className="divide-y">
                    {tree.map((root, i) => (
                      <li key={root.id}>
                        <ol>
                          <ItemRow item={root} parents={parents} index={i} count={tree.length} depth={0} />
                          {root.children.map((child, j) => (
                            <ItemRow key={child.id} item={child} parents={parents} index={j} count={root.children.length} depth={1} />
                          ))}
                        </ol>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
