import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { requireAdmin } from "@getmed/core/auth";
import { formatCurrency, formatDate } from "@getmed/core/format";
import { DAY_KEYS, DAY_LABELS, formatTime, type WeeklyHours } from "@getmed/core/hours";
import { mediaUrl } from "@getmed/core/storage";
import { Avatar, Badge, Button, Card, CardContent, CardHeader, CardTitle, PageHeader } from "@getmed/ui";
import { PharmacyStatusActions } from "@/components/pharmacy-status-actions";

export default async function PharmacyDetail({ params }: { params: Promise<{ pharmacyId: string }> }) {
  const { pharmacyId } = await params;
  const { db } = await requireAdmin();
  const { data: p } = await db.from("pharmacies").select("*").eq("id", pharmacyId).maybeSingle();
  if (!p) notFound();
  const [{ data: pharmacists }, { data: services }, { data: issues }, stats] = await Promise.all([
    db.from("pharmacists").select("*").eq("pharmacy_id", p.id).order("is_main", { ascending: false }),
    db.from("pharmacy_services").select("*").eq("pharmacy_id", p.id),
    db.from("pharmacy_issues").select("issues(name)").eq("pharmacy_id", p.id),
    db.from("orders_admin").select("status").eq("pharmacy_id", p.id),
  ]);
  const logoUrl = await mediaUrl(db, p.logo_path);
  const hours = (p.hours ?? {}) as WeeklyHours;
  const counts = (stats.data ?? []).reduce<Record<string, number>>((acc, o) => ({ ...acc, [o.status]: (acc[o.status] ?? 0) + 1 }), {});
  const total = stats.data?.length ?? 0;

  return (
    <div>
      <PageHeader
        title={<span className="flex items-center gap-3"><Avatar src={logoUrl} name={p.name ?? "P"} size={40} className="rounded-lg" />{p.name ?? "Unnamed pharmacy"}<Badge tone={p.status === "approved" ? "success" : p.status === "pending" ? "warning" : "neutral"} className="capitalize">{p.status}</Badge></span>}
        description={`${[p.address_line, p.city, p.postal_code].filter(Boolean).join(", ")} · submitted ${formatDate(p.submitted_at)}`}
        actions={<PharmacyStatusActions pharmacyId={p.id} status={p.status} />}
      />
      {p.inactive_reason ? <p className="mb-4 rounded-lg bg-warning-100 px-3 py-2 text-sm text-amber-900">Inactive reason: {p.inactive_reason}</p> : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Licensing (verify before approving)</CardTitle></CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <Row k="Licence number" v={p.license_number ?? "—"} /><Row k="Issuing college" v={p.license_college ?? "—"} />
            <Row k="Pharmacist-in-charge" v={p.pic_name ?? "—"} /><Row k="PIC licence #" v={p.pic_license_number ?? "—"} />
            <div className="sm:col-span-2">{p.license_doc_path ? <Button asChild variant="outline" size="sm"><a href={`/api/pharmacies/${p.id}/file`} target="_blank" rel="noreferrer"><FileText /> Open licence document</a></Button> : <span className="text-danger-500">No licence document uploaded</span>}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Contact & operations</CardTitle></CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <Row k="Phone" v={p.phone ?? "—"} /><Row k="Email" v={p.email ?? "—"} />
            <Row k="Delivery radius" v={p.delivery_radius_km ? `${p.delivery_radius_km} km` : "—"} /><Row k="Typical delivery" v={p.estimated_delivery_time ?? "—"} />
            <Row k="Services" v={[p.offers_delivery && "Delivery", p.offers_transfer && "Transfers", p.offers_consultation && "Consultations"].filter(Boolean).join(", ") || "—"} />
            <Row k="Consultation topics" v={((issues ?? []) as unknown as { issues: { name: string } | null }[]).map((i) => i.issues?.name).filter(Boolean).join(", ") || "—"} />
            <div className="sm:col-span-2"><p className="text-xs uppercase tracking-wide text-ink-500">Hours</p><div className="mt-1 grid grid-cols-2 gap-x-4 text-xs">{DAY_KEYS.map((d) => { const h = hours[d]; return <p key={d} className="flex justify-between"><span>{DAY_LABELS[d]}</span><span>{!h || h.closed ? "Closed" : `${formatTime(h.open)}–${formatTime(h.close)}`}</span></p>; })}</div></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Pharmacists ({pharmacists?.length ?? 0})</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">{(pharmacists ?? []).map((s) => <p key={s.id}><span className="font-medium">{s.name}</span>{s.is_main ? <Badge tone="brand" className="ml-2">Main</Badge> : null}<span className="block text-xs text-ink-500">{s.credentials}</span></p>)}{!pharmacists?.length ? <p className="text-ink-500">None added.</p> : null}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Services ({services?.length ?? 0}) & quality</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(services ?? []).map((s) => <p key={s.id} className="flex justify-between"><span>{s.name}</span><span className="text-ink-500">{s.price != null ? formatCurrency(s.price) : ""}</span></p>)}
            <div className="mt-3 border-t border-ink-100 pt-3 text-xs text-ink-600">
              <p>{total} orders total · {counts.delivered ?? 0} delivered</p>
              <p>Rejected {counts.rejected ?? 0} · Cancelled after accept {counts.cancelled ?? 0} · Timed out {counts.timed_out ?? 0}</p>
              {total ? <p className="mt-1">Decline rate {Math.round(((counts.rejected ?? 0) + (counts.timed_out ?? 0)) / total * 100)}% · Accept-then-cancel rate {Math.round((counts.cancelled ?? 0) / total * 100)}%</p> : null}
            </div>
          </CardContent>
        </Card>
      </div>
      <Button asChild variant="link" className="mt-6"><Link href="/pharmacies">← Pharmacies</Link></Button>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div><p className="text-xs uppercase tracking-wide text-ink-500">{k}</p><div className="mt-0.5">{v}</div></div>;
}
