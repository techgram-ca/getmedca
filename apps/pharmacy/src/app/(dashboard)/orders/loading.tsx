import { ListSkeleton, PageHeader } from "@getmed/ui";

export default function Loading() {
  return (
    <div>
      <PageHeader title="Orders" description="Loading your orders…" />
      <ListSkeleton rows={5} />
    </div>
  );
}
