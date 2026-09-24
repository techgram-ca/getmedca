import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@getmed/core/auth";
import {
  defaultZonePrices,
  listPostalAreas,
  loadDeliveryConfigs,
  loadZoneAreas,
  resolvePerKm,
  resolvePricing,
  toZoneText,
} from "@getmed/core/pricing";
import { getPlatformSettings } from "@getmed/core/settings";
import { Button, PageHeader } from "@getmed/ui";
import { PharmacyPricingForm } from "@/components/pharmacy-pricing-form";

export const dynamic = "force-dynamic";

export default async function PharmacyPricingPage({ params }: { params: Promise<{ pharmacyId: string }> }) {
  const { pharmacyId } = await params;
  const { db } = await requireAdmin();
  const { data: pharmacy } = await db.from("pharmacies").select("id, name, city, status").eq("id", pharmacyId).maybeSingle();
  if (!pharmacy) notFound();

  const settings = await getPlatformSettings(db);
  const [pricing, configs, areas, cities] = await Promise.all([
    resolvePricing(db, pharmacy.id, settings),
    loadDeliveryConfigs(db, [pharmacy.id]),
    loadZoneAreas(db, pharmacy.id),
    listPostalAreas(db),
  ]);
  const config = configs.get(pharmacy.id) ?? null;

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={`Pricing — ${pharmacy.name ?? "Unnamed pharmacy"}`}
        description={[pharmacy.city, pharmacy.status].filter(Boolean).join(" · ")}
        actions={<Button asChild variant="outline"><Link href={`/pharmacies/${pharmacy.id}`}>Open pharmacy</Link></Button>}
      />

      <PharmacyPricingForm
        pharmacyId={pharmacy.id}
        pharmacyName={pharmacy.name ?? "this pharmacy"}
        cities={cities}
        initial={{
          prices: Object.fromEntries(
            (["zone1", "zone2", "zone3", "zone4"] as const).map((z) => [
              z,
              pricing[z].source === "pharmacy" ? String(pricing[z].price) : "",
            ]),
          ) as Record<"zone1" | "zone2" | "zone3" | "zone4", string>,
          config: { remotePerKm: config?.remotePerKm == null ? "" : String(config.remotePerKm) },
          areas: toZoneText(areas),
        }}
        platform={{ prices: defaultZonePrices(settings), perKm: resolvePerKm(settings, null) }}
      />

      <Button asChild variant="link" className="mt-6"><Link href="/pricing">← All pricing</Link></Button>
    </div>
  );
}
