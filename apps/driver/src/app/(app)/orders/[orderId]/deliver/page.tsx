import { notFound, redirect } from "next/navigation";
import { requireDriver } from "@getmed/core/auth";
import { shortId } from "@getmed/core/format";
import { ProofOfDelivery } from "@/components/proof-of-delivery";

export default async function DeliverPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const { driver, db } = await requireDriver();
  const { data: o } = await db.from("orders_driver").select("id, status, patient_name").eq("id", orderId).eq("assigned_driver_id", driver.id).maybeSingle();
  if (!o) notFound();
  if (o.status !== "picked_up") redirect(`/orders/${orderId}`);
  return (
    <div>
      <h1 className="text-lg font-semibold">Proof of delivery</h1>
      <p className="text-sm text-ink-600">Order {shortId(o.id)} · {o.patient_name}</p>
      <ProofOfDelivery orderId={o.id} />
    </div>
  );
}
