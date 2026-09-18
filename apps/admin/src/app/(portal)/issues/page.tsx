import { requireAdmin } from "@getmed/core/auth";
import { PageHeader } from "@getmed/ui";
import { IssuesEditor } from "@/components/issues-editor";

export default async function IssuesPage() {
  const { db } = await requireAdmin();
  const { data } = await db.from("issues").select("*").order("sort_order").order("name");
  return (
    <div className="max-w-4xl">
      <PageHeader title="Consultation issue categories" description="The master list pharmacies pick from at signup. Patients browse these on the consultation page." />
      <IssuesEditor issues={data ?? []} />
    </div>
  );
}
