import Link from "next/link";
import { Pencil } from "lucide-react";
import { FIXED_ZONES, zoneLabel, type DeliveryConfigInput, type FixedZone, type PharmacyPricing } from "@getmed/core/pricing";
import { formatCurrency } from "@getmed/core/format";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from "@getmed/ui";

type Pharmacy = { id: string; name: string; city: string | null; status: string };

/**
 * Read-only summary. Editing happens on the pharmacy's own pricing page: there
 * are four prices, a per-km rate, four distance bands and four postal-area
 * boxes to fill, which is more than a dialog can hold.
 */
export function PharmacyPricingTable({
  pharmacies,
  pricing,
  defaults,
  configs,
  taggedCounts,
}: {
  pharmacies: Pharmacy[];
  pricing: Record<string, PharmacyPricing>;
  defaults: Record<FixedZone, number>;
  configs: Record<string, DeliveryConfigInput>;
  taggedCounts: Record<string, number>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Prices by pharmacy</CardTitle>
        <CardDescription>A pharmacy with no price of its own is charged the default.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {pharmacies.length === 0 ? (
          <EmptyState title="No pharmacies yet" description="Prices can be set once a pharmacy has applied." className="m-5" />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Pharmacy</TH>
                {FIXED_ZONES.map((z) => <TH key={z}>{zoneLabel(z)}</TH>)}
                <TH>Zone 5</TH>
                <TH>Cities</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {pharmacies.map((p) => {
                const prices = pricing[p.id];
                const perKm = configs[p.id]?.remotePerKm ?? null;
                const tagged = taggedCounts[p.id] ?? 0;
                return (
                  <TR key={p.id}>
                    <TD>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-ink-500">{[p.city, p.status].filter(Boolean).join(" · ")}</div>
                    </TD>
                    {FIXED_ZONES.map((z) => {
                      const cell = prices?.[z];
                      return (
                        <TD key={z}>
                          <span className="font-semibold tabular-nums">{formatCurrency(cell?.price ?? defaults[z])}</span>
                          {cell?.source === "pharmacy" ? (
                            <Badge tone="brand" className="ml-2">Custom</Badge>
                          ) : (
                            <span className="ml-2 text-xs text-ink-400">default</span>
                          )}
                        </TD>
                      );
                    })}
                    <TD className="whitespace-nowrap">
                      {perKm != null ? (
                        <>
                          <span className="font-semibold tabular-nums">{formatCurrency(perKm)}</span>
                          <span className="text-xs text-ink-500">/km</span>
                        </>
                      ) : (
                        <span className="text-xs text-ink-400">default</span>
                      )}
                    </TD>
                    <TD>
                      {tagged === 0 ? (
                        <Badge tone="warning">None tagged</Badge>
                      ) : (
                        <span className="text-sm tabular-nums text-ink-700">{tagged}</span>
                      )}
                    </TD>
                    <TD className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/pricing/${p.id}`}><Pencil /> Edit</Link>
                      </Button>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
