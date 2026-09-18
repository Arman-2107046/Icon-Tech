"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { ActionForm, CheckboxField, SubmitButton, TextField, TextareaField, type FormAction } from "@/src/admin/components/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/admin/components/ui/card";
import { createPage, updatePage } from "@/src/modules/content/actions";

type Initial = { title: string; handle: string; body: string; published: boolean; seoTitle: string | null; seoDescription: string | null };

export function PageForm({ pageId, initial }: { pageId?: string; initial?: Initial }) {
  const router = useRouter();
  const action: FormAction<{ id: string }> = pageId ? updatePage.bind(null, pageId) : createPage;
  const onSuccess = useCallback(() => router.refresh(), [router]);

  return (
    <ActionForm action={action} onSuccess={pageId ? onSuccess : undefined} className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <TextField name="title" label="Title" defaultValue={initial?.title} autoFocus={!pageId} />
            <TextField name="handle" label="Handle" defaultValue={initial?.handle} placeholder="auto-generated" hint="Used in the URL: /pages/<handle>." />
            <TextareaField name="body" label="Body" rows={18} defaultValue={initial?.body} className="font-mono text-sm" hint="Markdown. Headings, lists, links and emphasis are supported." />
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
            <CardTitle>Visibility</CardTitle>
          </CardHeader>
          <CardContent>
            <CheckboxField name="published" label="Published" defaultChecked={initial?.published ?? false} hint="Unpublished pages return 404 on the storefront." />
          </CardContent>
        </Card>
        <div className="flex justify-end">
          <SubmitButton>{pageId ? "Save changes" : "Create page"}</SubmitButton>
        </div>
      </div>
    </ActionForm>
  );
}
