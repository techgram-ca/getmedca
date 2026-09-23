import { requireAdmin } from "@getmed/core/auth";
import { FIXED_ZONES, defaultZonePrices, resolveBands, resolvePerKm, type FixedZone } from "@getmed/core/pricing";
import { listPostalAreas, loadDeliveryConfigs, resolvePricingForAll } from "@getmed/core/pricing";
import { getPlatformSettings } from "@getmed/core/settings";
import { MapPin } from "lucide-react";
import { Alert, Card, CardContent, CardDescription, CardHeader, CardTitle, PageHeader } from "@getmed/ui";
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
  const ids = list.map((p) => p.id);
  const [pricing, configs] = await Promise.all([resolvePricingForAll(db, ids, settings), loadDeliveryConfigs(db, ids)]);
  const cities = await listPostalAreas(db);
  const platformBands = resolveBands(settings, null);
  const platformPerKm = resolvePerKm(settings, null);

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Delivery pricing"
        description="What each pharmacy is charged per delivered order, by delivery type."
      />

      <Alert tone="info" className="mb-6">
        A pharmacy with no price of its own is charged the default. Custom deliveries have no set price — you type one in when choosing the delivery type for an order. Prices are snapshotted onto each order at that moment, so changing them here never reprices past orders. A delivery a driver marks failed is billed at the rate below, and an order sent out again is billed once per attempt.
      </Alert>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Cities on file</CardTitle>
          <CardDescription>
            The postal areas available to tag against a pharmacy&apos;s zones, on its own page. A delivery to a postal
            code no pharmacy has tagged is priced by driving distance instead — if one keeps appearing, add it here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cities.length === 0 ? (
            <p className="text-sm text-ink-500">No postal areas loaded yet.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {cities.map((c) => (
                  <span key={c.city} className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1 text-sm">
                    <MapPin className="size-3.5 text-brand-600" />
                    <span className="font-medium text-ink-900">{c.city}</span>
                    <span className="text-xs text-ink-400">{c.fsas.length}</span>
                  </span>
                ))}
              </div>
              <p className="mt-3 text-sm text-ink-500">
                {cities.length} cities · {cities.reduce((n, c) => n + c.fsas.length, 0)} postal areas
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <PricingDefaultsForm
        defaults={{
          prices: defaultZonePrices(settings),
          bands: resolveBands(settings, null),
          remotePerKm: resolvePerKm(settings, null),
          failedDeliveryPercent: Number(settings.failed_delivery_fee_percent),
        }}
      />

      <div className="mt-8">
        <PharmacyPricingTable
          pharmacies={list.map((p) => ({ id: p.id, name: p.name ?? "Unnamed pharmacy", city: p.city, status: p.status }))}
          pricing={pricing}
          defaults={defaultZonePrices(settings)}
          configs={Object.fromEntries(configs)}
          platformBands={platformBands}
          platformPerKm={platformPerKm}
        />
      </div>
    </div>
  );
}
