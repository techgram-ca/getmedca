import { ListSkeleton, PageHeader } from "@getmed/ui";

export default function Loading() {
  return (
    <div>
      <PageHeader title="Consultation requests" description="Loading requests…" />
      <ListSkeleton rows={5} />
    </div>
  );
}
