"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { ActionForm, SelectField, SubmitButton, TextField, TextareaField, type FormAction } from "@/src/admin/components/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/admin/components/ui/card";
import { createCollection, updateCollection } from "@/src/modules/catalog/actions";
import type { CollectionInput } from "@/src/modules/catalog/types";

const TYPE_OPTIONS = [
  { value: "MANUAL", label: "Manual — pick products by hand" },
  { value: "RULE", label: "Automatic — products matching rules" },
];

export function CollectionForm({ collectionId, initial }: { collectionId?: string; initial?: Partial<CollectionInput> }) {
  const router = useRouter();
  const action: FormAction<{ id: string }> = collectionId ? updateCollection.bind(null, collectionId) : createCollection;
  const onSuccess = useCallback(() => router.refresh(), [router]);

  return (
    <ActionForm action={action} onSuccess={collectionId ? onSuccess : undefined} className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <TextField name="title" label="Title" defaultValue={initial?.title} autoFocus={!collectionId} />
            <TextField name="handle" label="Handle" defaultValue={initial?.handle} placeholder="auto-generated" hint="Used in the URL: /collections/<handle>." />
            <TextareaField name="description" label="Description" rows={4} defaultValue={initial?.description} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Search engine listing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <TextField name="seoTitle" label="SEO title" defaultValue={initial?.seoTitle ?? ""} />
            <TextareaField name="seoDescription" label="SEO description" rows={3} defaultValue={initial?.seoDescription ?? ""} />
          </CardContent>
        </Card>
      </div>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Type</CardTitle>
          </CardHeader>
          <CardContent>
            <SelectField name="type" label="Collection type" options={TYPE_OPTIONS} defaultValue={initial?.type ?? "MANUAL"} />
          </CardContent>
        </Card>
        <div className="flex justify-end">
          <SubmitButton>{collectionId ? "Save changes" : "Create collection"}</SubmitButton>
        </div>
      </div>
    </ActionForm>
  );
}
