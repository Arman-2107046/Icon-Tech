"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { ActionForm, SelectField, SubmitButton, TextField, TextareaField, type FormAction } from "@/src/admin/components/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/admin/components/ui/card";
import { createProduct, updateProduct } from "@/src/modules/catalog/actions";
import type { ProductInput } from "@/src/modules/catalog/types";

type Values = Partial<Omit<ProductInput, "tags">> & { tags?: string[] };

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "ARCHIVED", label: "Archived" },
];

export function ProductForm({ productId, initial }: { productId?: string; initial?: Values }) {
  const router = useRouter();
  const action: FormAction<{ id: string }> = productId ? updateProduct.bind(null, productId) : createProduct;
  const onSuccess = useCallback(() => router.refresh(), [router]);

  return (
    <ActionForm action={action} onSuccess={productId ? onSuccess : undefined} className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <TextField name="title" label="Title" defaultValue={initial?.title} autoFocus={!productId} />
            <TextField
              name="handle"
              label="Handle"
              defaultValue={initial?.handle}
              hint={productId ? "Changing this breaks existing links unless you add a redirect." : "Leave blank to generate from the title."}
              placeholder="auto-generated"
            />
            <TextareaField name="description" label="Description" rows={8} defaultValue={initial?.description} hint="Markdown is supported." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Search engine listing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <TextField name="seoTitle" label="SEO title" defaultValue={initial?.seoTitle ?? ""} hint="Up to 70 characters. Falls back to the product title." />
            <TextareaField name="seoDescription" label="SEO description" rows={3} defaultValue={initial?.seoDescription ?? ""} hint="Up to 160 characters." />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Organisation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SelectField name="status" label="Status" options={STATUS_OPTIONS} defaultValue={initial?.status ?? "DRAFT"} />
            <TextField name="vendor" label="Vendor" defaultValue={initial?.vendor ?? ""} />
            <TextField name="tags" label="Tags" defaultValue={initial?.tags?.join(", ")} hint="Comma-separated. Used by filters and rule-based collections." />
          </CardContent>
        </Card>
        <div className="flex justify-end">
          <SubmitButton>{productId ? "Save changes" : "Create product"}</SubmitButton>
        </div>
      </div>
    </ActionForm>
  );
}
