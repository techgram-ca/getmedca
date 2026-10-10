import { requireAdmin } from "@getmed/core/auth";
import { PageHeader } from "@getmed/ui";
import { RateCardsEditor } from "@/components/rate-cards-editor";

export default async function DeliveryRatesPage() {
  const { db } = await requireAdmin();
  const [{ data: cards }, { data: rows }] = await Promise.all([
    db.from("delivery_rate_cards").select("*").order("city"),
    db.from("delivery_rate_rows").select("*").order("sort_order"),
  ]);

  const byCard = new Map<string, { destination: string; price: number }[]>();
  for (const r of rows ?? []) {
    const list = byCard.get(r.card_id) ?? [];
    list.push({ destination: r.destination, price: Number(r.price) });
    byCard.set(r.card_id, list);
  }

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Delivery rates"
        description="Public rate cards, one per city, at pharmacy.getmed.ca/delivery-rates/<city>. These are the quoted rates a pharmacy sees before signing up — they do not price live orders."
      />
      <RateCardsEditor
        cards={(cards ?? []).map((c) => ({ ...c, rows: byCard.get(c.id) ?? [] }))}
        pharmacyUrl={process.env.NEXT_PUBLIC_PHARMACY_URL ?? "https://pharmacy.getmed.ca"}
      />
    </div>
  );
}
