import { requirePharmacy } from "@getmed/core/auth";
import { dayBounds, defaultDateWindow } from "@getmed/core/format";
import { PageHeader } from "@getmed/ui";
import { AddOrderDialog } from "@/components/add-order-dialog";
import { PharmacyOrdersTable, type PharmacyOrderRow } from "@/components/orders-table";
import { visibleOrderList } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  const fallback = defaultDateWindow();
  const from = sp.from ?? fallback.from;
  const to = sp.to ?? fallback.to;
  const { startIso, endIso } = dayBounds(from, to);

  const { pharmacy, db } = await requirePharmacy();
  const { data } = await visibleOrderList(db, pharmacy.id)
    .gte("created_at", startIso)
    .lt("created_at", endIso)
    .order("created_at", { ascending: false })
    .limit(1000);

  const rows: PharmacyOrderRow[] = (data ?? []).map((o) => ({
    id: o.id,
    created_at: o.created_at,
    received_at: o.phone_verified_at ?? o.created_at,
    status: o.status,
    order_type: o.order_type,
    source: o.source,
    patient_name: o.patient_name,
    patient_phone: o.patient_phone,
    delivery_type: o.delivery_type,
    delivery_fee_charged: o.delivery_fee_charged != null ? Number(o.delivery_fee_charged) : null,
    delivery_quote_min: o.delivery_quote_min != null ? Number(o.delivery_quote_min) : null,
    delivery_quote_max: o.delivery_quote_max != null ? Number(o.delivery_quote_max) : null,
  }));

  return (
    <div>
      <PageHeader title="Orders" actions={<AddOrderDialog />} />
      <PharmacyOrdersTable rows={rows} from={from} to={to} />
    </div>
  );
}
