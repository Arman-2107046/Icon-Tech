"use client";

import { ConfirmDeleteButton } from "@/src/admin/components/confirm-delete-button";
import { deletePage } from "@/src/modules/content/actions";

export function DeletePageButton({ pageId, title }: { pageId: string; title: string }) {
  return <ConfirmDeleteButton variant="outline" message={`Delete the page "${title}"?`} action={() => deletePage(pageId)} />;
}
