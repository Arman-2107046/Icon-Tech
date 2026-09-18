import { Skeleton } from "@/src/admin/components/ui/skeleton";

/** Suspense boundary for every admin page (they all read the session). */
export default function AdminLoading() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
