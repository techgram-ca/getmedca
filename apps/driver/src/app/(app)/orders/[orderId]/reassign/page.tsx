import { notFound } from "next/navigation";
import { requireDriver } from "@getmed/core/auth";
import { shortId } from "@getmed/core/format";
import { ReassignForm } from "@/components/reassign-form";

export default async function ReassignPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const { driver, db } = await requireDriver();
  const { data: o } = await db.from("orders_driver").select("id, status").eq("id", orderId).eq("assigned_driver_id", driver.id).maybeSingle();
  if (!o || !["assigned", "picked_up"].includes(o.status)) notFound();
  const { data: others } = await db.from("drivers").select("id, name, phone, vehicle_make, vehicle_model").eq("active", true).neq("id", driver.id).order("name");
  return (
    <div>
      <h1 className="text-lg font-semibold">Hand off {shortId(o.id)}</h1>
      <p className="text-sm text-ink-600">The other driver sees it immediately and it leaves your list. No approval needed.</p>
      <ReassignForm orderId={o.id} drivers={others ?? []} />
    </div>
  );
}
