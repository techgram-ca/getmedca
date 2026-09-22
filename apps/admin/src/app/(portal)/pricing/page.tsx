import { requireAdmin } from "@getmed/core/auth";
import { defaultPrices, resolvePricingForAll } from "@getmed/core/pricing";
import { getPlatformSettings } from "@getmed/core/settings";
import { Alert, PageHeader } from "@getmed/ui";
import { PricingDefaultsForm } from "@/components/pricing-defaults-form";
import { PharmacyPricingTable } from "@/components/pharmacy-pricing-table";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const { db } = await requireAdmin();
  const settings = await getPlatformSettings(db);
  const { data: pharmacies } = await db
    .from("pharmacies")
    .select("id, name, city, status")
    .not("submitted_at", "is", null)
    .order("name");

  const list = pharmacies ?? [];
  const pricing = await resolvePricingForAll(db, list.map((p) => p.id), settings);

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Delivery pricing"
        description="What each pharmacy is charged per delivered order, by delivery type."
      />

      <Alert tone="info" className="mb-6">
        A pharmacy with no price of its own is charged the default. Custom deliveries have no set price — you type one in when choosing the delivery type for an order. Prices are snapshotted onto each order at that moment, so changing them here never reprices past orders. A delivery a driver marks failed is billed at the rate below, and an order sent out again is billed once per attempt.
      </Alert>

      <PricingDefaultsForm defaults={defaultPrices(settings)} failedDeliveryPercent={Number(settings.failed_delivery_fee_percent)} />

      <div className="mt-8">
        <PharmacyPricingTable
          pharmacies={list.map((p) => ({ id: p.id, name: p.name ?? "Unnamed pharmacy", city: p.city, status: p.status }))}
          pricing={pricing}
          defaults={defaultPrices(settings)}
        />
      </div>
    </div>
  );
}
