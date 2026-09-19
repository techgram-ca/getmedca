import { ListSkeleton, PageHeader } from "@getmed/ui";

export default function Loading() {
  return (
    <div>
      <PageHeader title="Invoices" description="Building your monthly summaries…" />
      <ListSkeleton rows={3} />
    </div>
  );
}
