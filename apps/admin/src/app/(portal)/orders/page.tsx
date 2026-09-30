import { requireAdmin } from "@getmed/core/auth";
import { dayBounds, defaultDateWindow } from "@getmed/core/format";
import { PageHeader } from "@getmed/ui";
import { AdminOrdersTable, type AdminOrderRow } from "@/components/orders-table";
import { adminOrders, withNames } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * Loads one window of orders and hands them to the table, which filters in the
 * browser. Only a change of dates comes back here.
 */
export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  const fallback = defaultDateWindow();
  const from = sp.from ?? fallback.from;
  const to = sp.to ?? fallback.to;
  const { startIso, endIso } = dayBounds(from, to);

  const { db } = await requireAdmin();
  const [{ data }, { data: pharmacies }, { data: drivers }] = await Promise.all([
    adminOrders(db).gte("created_at", startIso).lt("created_at", endIso).order("created_at", { ascending: false }).limit(1000),
    db.from("pharmacies").select("id, name").not("submitted_at", "is", null).order("name"),
    db.from("drivers").select("id, name").eq("active", true).order("name"),
  ]);
  const named = await withNames(db, data ?? []);

  const rows: AdminOrderRow[] = named.map((o) => ({
    id: o.id,
    created_at: o.created_at,
    status: o.status,
    order_type: o.order_type,
    source: o.source,
    patient_name: o.patient_name,
    patient_phone: o.patient_phone,
    pharmacy_id: o.pharmacy_id,
    pharmacyName: o.pharmacy?.name ?? null,
    driverName: o.driver?.name ?? null,
    assigned_driver_id: o.assigned_driver_id,
    delivery_type: o.delivery_type,
    delivery_fee_charged: o.delivery_fee_charged != null ? Number(o.delivery_fee_charged) : null,
    delivery_quote_min: o.delivery_quote_min != null ? Number(o.delivery_quote_min) : null,
    delivery_quote_max: o.delivery_quote_max != null ? Number(o.delivery_quote_max) : null,
  }));

  return (
    <div>
      <PageHeader title="Orders" description="Metadata only — prescription, insurance and health-card details are never available here." />
      <AdminOrdersTable rows={rows} pharmacies={pharmacies ?? []} drivers={drivers ?? []} from={from} to={to} />
    </div>
  );
}
