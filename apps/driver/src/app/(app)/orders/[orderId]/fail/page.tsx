import { notFound, redirect } from "next/navigation";
import { requireDriver } from "@getmed/core/auth";
import { shortId } from "@getmed/core/format";
import { FailForm } from "@/components/fail-form";

export default async function FailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const { driver, db } = await requireDriver();
  const { data: o } = await db.from("orders_driver").select("id, status").eq("id", orderId).eq("assigned_driver_id", driver.id).maybeSingle();
  if (!o) notFound();
  if (o.status !== "picked_up") redirect(`/orders/${orderId}`);
  return (
    <div>
      <h1 className="text-lg font-semibold">Delivery failed</h1>
      <p className="text-sm text-ink-600">Order {shortId(o.id)}. GetMed support will contact the patient — please don't re-contact them yourself.</p>
      <FailForm orderId={o.id} />
    </div>
  );
}
