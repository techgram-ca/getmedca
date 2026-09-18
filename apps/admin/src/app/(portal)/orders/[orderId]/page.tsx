import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldOff } from "lucide-react";
import { requireAdmin } from "@getmed/core/auth";
import { formatCurrency, formatDate, shortId, statusLabel } from "@getmed/core/format";
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, PageHeader, StatusBadge } from "@getmed/ui";
import { DriverAssign } from "@/components/driver-assign";
import { EscalationForm } from "@/components/escalation-form";
import { adminOrders, escalationReason, withNames } from "@/lib/queries";

export default async function AdminOrderDetail({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const { db } = await requireAdmin();
  const { data: row } = await adminOrders(db).eq("id", orderId).maybeSingle();
  if (!row) notFound();
  const [o] = await withNames(db, [row]);
  const [{ data: events }, { data: drivers }, { data: pod }] = await Promise.all([
    db.from("order_events").select("*").eq("order_id", orderId).order("created_at"),
    db.from("drivers").select("id, name, phone, vehicle_make, vehicle_model").eq("active", true).order("name"),
    db.from("proof_of_delivery").select("created_at").eq("order_id", orderId).maybeSingle(),
  ]);
  const r = escalationReason(o!);
  const canAssign = o!.status === "ready_for_delivery" || o!.status === "assigned";

  return (
    <div>
      <PageHeader title={<span className="flex items-center gap-3"><span className="font-mono">{shortId(o!.id)}</span><StatusBadge status={o!.status} /></span>} description={`${o!.order_type === "transfer" ? "Transfer" : "New prescription"} · ${o!.pharmacy?.name ?? "—"} · created ${formatDate(o!.created_at)}`} />
      <Alert tone="info" className="mb-6"><span className="inline-flex items-center gap-2"><ShieldOff className="size-4" /> PHI redacted: prescription files, insurance, health card, date of birth and street address are not accessible from the admin portal.</span></Alert>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          {o!.escalated_at ? (
            <Card className="border-accent-300">
              <CardHeader><CardTitle>Escalation — {r.kind}</CardTitle></CardHeader>
              <CardContent>
                {r.text ? <p className="mb-4 rounded-lg bg-accent-50 px-3 py-2 text-sm">{r.text}</p> : null}
                <p className="mb-4 text-sm">Contact <strong>{o!.patient_name}</strong> at <a href={`tel:${o!.patient_phone}`} className="font-medium text-brand-700">{o!.patient_phone}</a>.</p>
                <EscalationForm orderId={o!.id} status={o!.escalation_status ?? "open"} note={o!.escalation_note} />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader><CardTitle>Driver assignment</CardTitle></CardHeader>
            <CardContent>
              {canAssign ? <DriverAssign orderId={o!.id} currentDriverId={o!.assigned_driver_id} drivers={drivers ?? []} /> : <p className="text-sm text-ink-500">{o!.driver ? `Assigned to ${o!.driver.name}.` : "Drivers can be assigned once the pharmacy marks the order ready for delivery."}</p>}
              {o!.reassigned_at ? <p className="mt-2 text-xs text-ink-500">Reassigned driver-to-driver {formatDate(o!.reassigned_at)}.</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Order metadata</CardTitle></CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <Row k="Patient" v={o!.patient_name} /><Row k="Phone" v={o!.patient_phone} />
              <Row k="Pharmacy" v={<Link href={`/pharmacies/${o!.pharmacy_id}`} className="text-brand-700 hover:underline">{o!.pharmacy?.name ?? "—"}</Link>} />
              <Row k="Delivery area" v={[o!.delivery_city, o!.delivery_postal_code].filter(Boolean).join(" ") || "—"} />
              <Row k="Driver" v={o!.driver ? <Link href={`/drivers/${o!.assigned_driver_id}`} className="text-brand-700 hover:underline">{o!.driver.name}</Link> : "—"} />
              <Row k="Delivery fee charged" v={o!.delivery_fee_charged != null ? formatCurrency(o!.delivery_fee_charged) : "—"} />
              <Row k="Proof of delivery" v={pod ? <Badge tone="success">Captured {formatDate(pod.created_at)}</Badge> : "—"} />
            </CardContent>
          </Card>
        </div>
        <Card className="self-start">
          <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
          <CardContent>
            <ol className="relative ml-2 space-y-4 border-l border-ink-200 pl-4 text-sm">
              {(events ?? []).map((e) => (
                <li key={e.id} className="relative"><span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-brand-500 ring-4 ring-white" /><p className="font-medium capitalize">{e.action.replace(/_/g, " ")}{e.to_status ? ` → ${statusLabel(e.to_status)}` : ""}</p><p className="text-xs text-ink-500">{formatDate(e.created_at)} · {e.actor_role}</p>{e.note ? <p className="mt-0.5 text-xs text-ink-600">{e.note}</p> : null}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
      <Button asChild variant="link" className="mt-6"><Link href="/orders">← Orders</Link></Button>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div><p className="text-xs uppercase tracking-wide text-ink-500">{k}</p><div className="mt-0.5">{v}</div></div>;
}
