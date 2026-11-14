import { requireAdmin } from "@getmed/core/auth";
import {
  defaultZonePrices,
  listPostalAreas,
  loadDeliveryConfigs,
  resolvePerKm,
  resolveRefrigerationFee,
  resolvePricingForAll,
} from "@getmed/core/pricing";
import { getPlatformSettings } from "@getmed/core/settings";
import { MapPin } from "lucide-react";
import Link from "next/link";
import { Alert, Button, Card, CardContent, PageHeader } from "@getmed/ui";
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
  const [pricing, configs, { data: taggedRows }] = await Promise.all([
    resolvePricingForAll(db, ids, settings),
    loadDeliveryConfigs(db, ids),
    // Counted in the database, one row per pharmacy. Fetching the tag rows
    // themselves and counting them here meant one row per pharmacy per
    // postal area — thousands of them — and PostgREST stops returning rows
    // at its cap without saying so, which showed tagged pharmacies as
    // untagged depending only on where they fell in the result.
    db.from("pharmacy_zone_area_counts").select("pharmacy_id, tagged").in("pharmacy_id", ids.length ? ids : ["-"]),
  ]);
  const taggedCounts = Object.fromEntries((taggedRows ?? []).map((r) => [r.pharmacy_id, r.tagged]));
  const cities = await listPostalAreas(db);

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Delivery pricing"
        description="What each pharmacy is charged per delivered order, by zone."
      />

      <Alert tone="info" className="mb-6">
        An order is priced when it arrives: a postal code tagged to a zone for its pharmacy takes that zone's price. Anything untagged falls to Zone 5 and is charged per kilometre, with an admin confirming the amount. Prices are snapshotted onto each order at that moment, so changing them here never reprices past orders. A delivery a driver marks failed is billed at the rate below, and an order sent out again is billed once per attempt.
      </Alert>

      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <p className="text-sm text-ink-600">
            <span className="font-semibold text-ink-950">{cities.length} cities</span> ·{" "}
            {cities.reduce((n, c) => n + c.fsas.length, 0)} postal areas available to tag against a pharmacy&apos;s zones.
          </p>
          <Button asChild size="sm" variant="outline"><Link href="/postal-areas"><MapPin /> Manage postal areas</Link></Button>
        </CardContent>
      </Card>

      <PricingDefaultsForm
        defaults={{
          prices: defaultZonePrices(settings),
          remotePerKm: resolvePerKm(settings, null),
          refrigerationFee: resolveRefrigerationFee(settings, null),
          failedDeliveryPercent: Number(settings.failed_delivery_fee_percent),
        }}
      />

      <div className="mt-8">
        <PharmacyPricingTable
          pharmacies={list.map((p) => ({ id: p.id, name: p.name ?? "Unnamed pharmacy", city: p.city, status: p.status }))}
          pricing={pricing}
          defaults={defaultZonePrices(settings)}
          configs={Object.fromEntries(configs)}
          taggedCounts={taggedCounts}
        />
      </div>
    </div>
  );
}
