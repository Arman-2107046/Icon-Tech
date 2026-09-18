"use client";

import { ArrowDown, ArrowUp, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { DrawerForm, SelectField, TextField } from "@/src/admin/components/form";
import { Button } from "@/src/admin/components/ui/button";
import { createMenu, createMenuItem, moveMenuItem, updateMenu, updateMenuItem } from "@/src/modules/content/actions";

export function AddMenuButton() {
  return (
    <DrawerForm trigger={<Button size="sm"><Plus className="size-4" />Add menu</Button>} title="Add menu" action={createMenu} submitLabel="Create menu">
      <TextField name="title" label="Title" placeholder="e.g. Main navigation" />
      <TextField name="handle" label="Handle" placeholder="auto-generated" hint="The storefront looks menus up by handle, e.g. main or footer." />
    </DrawerForm>
  );
}

export function EditMenuButton({ menu }: { menu: { id: string; title: string; handle: string } }) {
  return (
    <DrawerForm trigger={<Button variant="ghost" size="icon" aria-label={`Edit menu ${menu.title}`}><Pencil className="size-4" /></Button>} title="Edit menu" action={updateMenu.bind(null, menu.id)}>
      <TextField name="title" label="Title" defaultValue={menu.title} />
      <TextField name="handle" label="Handle" defaultValue={menu.handle} />
    </DrawerForm>
  );
}

type ParentOption = { value: string; label: string };
const ROOT: ParentOption = { value: "__root__", label: "Top level" };

export function AddMenuItemButton({ menuId, menuTitle, parents }: { menuId: string; menuTitle: string; parents: ParentOption[] }) {
  return (
    <DrawerForm trigger={<Button variant="outline" size="sm"><Plus className="size-4" />Add item</Button>} title={`Add item to ${menuTitle}`} action={createMenuItem.bind(null, menuId)} submitLabel="Create item">
      <ItemFields parents={[ROOT, ...parents]} />
    </DrawerForm>
  );
}

export function EditMenuItemButton({ item, parents }: { item: { id: string; label: string; url: string; parentId: string | null }; parents: ParentOption[] }) {
  return (
    <DrawerForm trigger={<Button variant="ghost" size="icon" className="size-7" aria-label={`Edit item ${item.label}`}><Pencil className="size-3.5" /></Button>} title="Edit menu item" action={updateMenuItem.bind(null, item.id)}>
      <ItemFields parents={[ROOT, ...parents.filter((p) => p.value !== item.id)]} initial={item} />
    </DrawerForm>
  );
}

function ItemFields({ parents, initial }: { parents: ParentOption[]; initial?: { label: string; url: string; parentId: string | null } }) {
  return (
    <>
      <TextField name="label" label="Label" defaultValue={initial?.label} />
      <TextField name="url" label="URL" defaultValue={initial?.url} placeholder="/collections/audio" hint="A path on this site or a full URL." />
      <SelectField name="parentId" label="Parent" options={parents} defaultValue={initial?.parentId ?? "__root__"} />
    </>
  );
}

export function MoveItemButtons({ itemId, label, isFirst, isLast }: { itemId: string; label: string; isFirst: boolean; isLast: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const move = (direction: "up" | "down") =>
    startTransition(async () => {
      await moveMenuItem(itemId, direction);
      router.refresh();
    });
  return (
    <>
      <Button type="button" variant="ghost" size="icon" className="size-7" aria-label={`Move ${label} up`} disabled={isFirst || isPending} onClick={() => move("up")}>
        <ArrowUp className="size-3.5" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="size-7" aria-label={`Move ${label} down`} disabled={isLast || isPending} onClick={() => move("down")}>
        <ArrowDown className="size-3.5" />
      </Button>
    </>
  );
}
