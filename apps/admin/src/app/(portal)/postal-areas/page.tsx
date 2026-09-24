import { requireAdmin } from "@getmed/core/auth";
import { listPostalAreasDetailed } from "@getmed/core/pricing";
import { Alert, PageHeader } from "@getmed/ui";
import { PostalAreasManager } from "@/components/postal-areas-manager";

export const dynamic = "force-dynamic";

export default async function PostalAreasPage() {
  const { db } = await requireAdmin();
  const cities = await listPostalAreasDetailed(db);
  const total = cities.reduce((n, c) => n + c.areas.length, 0);

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Postal areas"
        description={`${cities.length} cities · ${total} postal areas`}
      />
      <Alert tone="info" className="mb-6">
        Delivery pricing matches on the postal area — the first three characters of a postal code — never on the city
        name, which is only how these are grouped here. A delivery to a postal area no pharmacy has tagged is priced
        per kilometre as Zone 5, so adding one here is the first step to pricing it as a zone.
      </Alert>
      <PostalAreasManager cities={cities} />
    </div>
  );
}
