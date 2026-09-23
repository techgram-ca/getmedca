import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Lock } from "lucide-react";
import { requirePharmacy } from "@getmed/core/auth";
import { formatCurrency, formatDate, formatDateOnly, shortId, statusLabel } from "@getmed/core/format";
import { loadDeliveryProof, orderCharges } from "@getmed/core/orders";
import { pharmacyCanModify } from "@getmed/core/orders/state-machine";
import { zoneLabel } from "@getmed/core/pricing";
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, DeliveryPrice, DeliveryProofCard, PageHeader, StatusBadge } from "@getmed/ui";
import { OrderActions } from "@/components/order-actions";
import { RetryDelivery } from "@/components/retry-delivery";
import { SlaCountdown } from "@/components/sla-countdown";

export default async function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const { pharmacy, db } = await requirePharmacy();
  const { data: o } = await db.from("orders").select("*").eq("id", orderId).eq("pharmacy_id", pharmacy.id).not("phone_verified_at", "is", null).maybeSingle();
  if (!o) notFound();
  const [{ data: events }, { data: driver }, proof, charges] = await Promise.all([
    db.from("order_events").select("*").eq("order_id", o.id).order("created_at"),
    o.assigned_driver_id ? db.from("drivers").select("name, phone, vehicle_make, vehicle_model, vehicle_color").eq("id", o.assigned_driver_id).maybeSingle() : Promise.resolve({ data: null }),
    loadDeliveryProof(db, o.id),
    orderCharges(db, o.id),
  ]);
  const billed = charges.reduce((sum, c) => sum + c.amount, 0);
  const locked = !pharmacyCanModify(o.status);

  return (
    <div>
      <PageHeader
        title={<span className="flex items-center gap-3"><span className="font-mono">{shortId(o.id)}</span><StatusBadge status={o.status} />{o.source === "manual" ? <Badge tone="accent">Manual</Badge> : null}</span>}
        description={`${o.order_type === "transfer" ? "Prescription transfer" : "New prescription"} · ${o.source === "manual" ? "entered by your pharmacy" : "submitted online"} ${formatDate(o.phone_verified_at)}`}
        actions={o.status === "pending" ? <SlaCountdown since={o.phone_verified_at ?? o.created_at} /> : null}
      />
      {locked && o.status === "picked_up" ? <Alert tone="info" className="mb-6"><span className="inline-flex items-center gap-2"><Lock className="size-4" /> The driver has picked up this order. It can no longer be modified or cancelled.</span></Alert> : null}
      {o.status === "rejected" || o.status === "cancelled" || o.status === "timed_out" ? (
        <Alert tone="warning" className="mb-6" title={`${statusLabel(o.status)} — GetMed support is handling the patient`}>
          {o.rejection_reason ?? o.cancellation_reason ?? "No pharmacy response within the SLA."}
        </Alert>
      ) : null}
      {o.status === "failed" ? (
        <Alert tone="warning" className="mb-6" title="Delivery failed — GetMed support is contacting the patient">
          {o.failure_reason ?? "No reason recorded."}
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
            <CardContent>
              {o.status === "failed" ? (
                <RetryDelivery orderId={o.id} attempt={o.delivery_attempt} />
              ) : (
                <OrderActions orderId={o.id} status={o.status} />
              )}
            </CardContent>
          </Card>

          {proof ? <DeliveryProofCard proof={proof} capturedAtLabel={formatDate(proof.capturedAt)} /> : null}

          <Card>
            <CardHeader><CardTitle>Patient</CardTitle></CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <Row k="Name" v={o.patient_name} />
              <Row k="Phone" v={<a href={`tel:${o.patient_phone}`} className="text-brand-700 hover:underline">{o.patient_phone}</a>} />
              <Row k="Date of birth" v={formatDateOnly(o.patient_dob)} />
              <Row k="Allergies / notes" v={o.allergies ?? "—"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{o.order_type === "transfer" ? "Transfer details" : "Prescription"}</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {o.order_type === "transfer" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Row k="From pharmacy" v={o.transfer_from_pharmacy_name ?? "—"} />
                  <Row k="Phone / fax" v={[o.transfer_from_phone, o.transfer_from_fax].filter(Boolean).join(" / ") || "—"} />
                  <Row k="Prescription #" v={o.transfer_prescription_number ?? "—"} />
                </div>
              ) : null}
              {o.prescription_file_path ? <FileLink orderId={o.id} kind="prescription" label="Open prescription file" /> : o.order_type === "new" ? <p className="text-ink-500">No file uploaded.</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Insurance & health card</CardTitle></CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <Row k="Insurance provider" v={o.insurance_provider ?? "—"} />
              <Row k="Member / group" v={[o.insurance_member_id, o.insurance_group_number].filter(Boolean).join(" / ") || "—"} />
              <Row k="Health card" v={o.health_card_number ? `${o.health_card_number} ${o.health_card_version ?? ""}` : "—"} />
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                {o.insurance_file_path ? <FileLink orderId={o.id} kind="insurance" label="Insurance card" /> : null}
                {o.health_card_file_path ? <FileLink orderId={o.id} kind="health_card" label="Health card" /> : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Delivery</CardTitle></CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <Row k="Address" v={[o.delivery_address_line, o.delivery_city, o.delivery_postal_code].filter(Boolean).join(", ")} />
              <Row k="Notes" v={o.delivery_notes ?? "—"} />
              <Row k="Driver" v={driver ? `${driver.name} · ${driver.phone}${driver.vehicle_make ? ` · ${[driver.vehicle_color, driver.vehicle_make, driver.vehicle_model].filter(Boolean).join(" ")}` : ""}` : "Not assigned yet"} />
              <Row
                k="Delivery cost"
                v={
                  <DeliveryPrice
                    price={{
                      zoneLabel: o.delivery_type ? zoneLabel(o.delivery_type) : null,
                      fee: o.delivery_fee_charged != null ? formatCurrency(Number(o.delivery_fee_charged)) : null,
                      quote:
                        o.delivery_quote_min != null && o.delivery_quote_max != null
                          ? { min: formatCurrency(Number(o.delivery_quote_min)), max: formatCurrency(Number(o.delivery_quote_max)) }
                          : null,
                    }}
                  />
                }
              />
              <Row k="Attempt" v={o.delivery_attempt > 1 ? `Attempt ${o.delivery_attempt}` : "First attempt"} />
              <Row
                k="Billed"
                v={charges.length ? (
                  <span>
                    {formatCurrency(billed)}
                    {charges.some((c) => c.kind === "failed_delivery") ? (
                      <span className="block text-xs text-ink-500">
                        includes {charges.filter((c) => c.kind === "failed_delivery").length} failed attempt
                        {charges.filter((c) => c.kind === "failed_delivery").length === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </span>
                ) : "Not billed yet"}
              />
              <Row k="Proof of delivery" v={proof ? <Badge tone="success">Captured</Badge> : "—"} />
            </CardContent>
          </Card>
        </div>

        <Card className="self-start">
          <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
          <CardContent>
            <ol className="relative ml-2 space-y-4 border-l border-ink-200 pl-4 text-sm">
              {(events ?? []).map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-brand-500 ring-4 ring-white" />
                  <p className="font-medium capitalize">{e.action.replace(/_/g, " ")}{e.to_status ? ` → ${statusLabel(e.to_status)}` : ""}</p>
                  <p className="text-xs text-ink-500">{formatDate(e.created_at)} · {e.actor_role}</p>
                  {e.note ? <p className="mt-0.5 text-xs text-ink-600">{e.note}</p> : null}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
      <div className="mt-6"><Button asChild variant="link"><Link href="/orders">← Back to orders</Link></Button></div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-ink-500">{k}</p>
      <div className="mt-0.5 text-ink-900">{v}</div>
    </div>
  );
}

function FileLink({ orderId, kind, label }: { orderId: string; kind: string; label: string }) {
  return (
    <Button asChild variant="outline" size="sm">
      <a href={`/api/orders/${orderId}/file?kind=${kind}`} target="_blank" rel="noreferrer"><FileText /> {label}</a>
    </Button>
  );
}
