import { ListSkeleton, PageHeader, Skeleton } from "@getmed/ui";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <PageHeader title="Finding pharmacies near you…" description="Checking real driving distance from your address." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ListSkeleton rows={4} />
        <Skeleton className="hidden h-[60vh] rounded-2xl lg:block" />
      </div>
    </div>
  );
}
