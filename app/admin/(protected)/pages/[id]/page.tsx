import { notFound } from "next/navigation";
import { PageHeader } from "@/src/admin/components/page-header";
import { DeletePageButton } from "@/src/admin/features/pages/delete-page-button";
import { PageForm } from "@/src/admin/features/pages/page-form";
import { requireAdmin } from "@/src/lib/auth/guards";
import { getPageForAdmin } from "@/src/modules/content";

export default async function EditPagePage({ params }: PageProps<"/admin/pages/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const page = await getPageForAdmin(id);
  if (!page) notFound();
  return (
    <>
      <PageHeader title={page.title} actions={<DeletePageButton pageId={page.id} title={page.title} />} />
      <div className="p-6">
        <PageForm
          pageId={page.id}
          initial={{ title: page.title, handle: page.handle, body: page.body, published: page.publishedAt !== null, seoTitle: page.seoTitle, seoDescription: page.seoDescription }}
        />
      </div>
    </>
  );
}
