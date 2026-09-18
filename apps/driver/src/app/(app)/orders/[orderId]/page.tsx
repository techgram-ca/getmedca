import Link from "next/link";
import { notFound } from "next/navigation";
import { Camera, Navigation, Phone, Users, XCircle } from "lucide-react";
import { requireDriver } from "@getmed/core/auth";
import { shortId } from "@getmed/core/format";
import { Button, Card, CardContent, StatusBadge } from "@getmed/ui";
import { PickupButton } from "@/components/pickup-button";
import { directionsUrl, staticMap } from "@/lib/maps";

export default async function DriverOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const { driver, db } = await requireDriver();
  const { data: o } = await db.from("orders_driver").select("*").eq("id", orderId).eq("assigned_driver_id", driver.id).maybeSingle();
  if (!o) notFound();
  const pharmacyAddr = [o.pharmacy_address_line, o.pharmacy_city, o.pharmacy_postal_code].filter(Boolean).join(", ");
  const deliveryAddr = [o.delivery_address_line, o.delivery_city, o.delivery_postal_code].filter(Boolean).join(", ");
  const pickupMap = staticMap(o.pharmacy_lat, o.pharmacy_lng);
  const dropMap = staticMap(o.delivery_lat, o.delivery_lng);
  const active = o.status === "assigned" || o.status === "picked_up";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="font-mono text-lg font-semibold">{shortId(o.id)}</h1><StatusBadge status={o.status} /></div>

      <Card>
        {pickupMap ? <img src={pickupMap} alt="" className="h-40 w-full rounded-t-2xl object-cover" /> : null}
        <CardContent>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">1 · Pickup</p>
          <p className="mt-1 font-medium">{o.pharmacy_name}</p>
          <p className="text-sm text-ink-600">{pharmacyAddr}</p>
          <div className="mt-3 flex gap-2">
            <Button asChild size="sm" variant="outline" className="flex-1"><a href={directionsUrl(pharmacyAddr, o.pharmacy_lat, o.pharmacy_lng)} target="_blank" rel="noreferrer"><Navigation /> Navigate</a></Button>
            {o.pharmacy_phone ? <Button asChild size="sm" variant="outline" className="flex-1"><a href={`tel:${o.pharmacy_phone}`}><Phone /> Call</a></Button> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        {dropMap ? <img src={dropMap} alt="" className="h-40 w-full rounded-t-2xl object-cover" /> : null}
        <CardContent>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">2 · Deliver</p>
          <p className="mt-1 font-medium">{o.patient_name}</p>
          <p className="text-sm text-ink-600">{deliveryAddr}</p>
          {o.delivery_notes ? <p className="mt-2 rounded-lg bg-accent-50 px-3 py-2 text-sm text-accent-800">{o.delivery_notes}</p> : null}
          <div className="mt-3 flex gap-2">
            <Button asChild size="sm" variant="outline" className="flex-1"><a href={directionsUrl(deliveryAddr, o.delivery_lat, o.delivery_lng)} target="_blank" rel="noreferrer"><Navigation /> Navigate</a></Button>
            <Button asChild size="sm" variant="outline" className="flex-1"><a href={`tel:${o.patient_phone}`}><Phone /> Call patient</a></Button>
          </div>
        </CardContent>
      </Card>

      {active ? (
        <div className="space-y-2">
          {o.status === "assigned" ? <PickupButton orderId={o.id} /> : null}
          {o.status === "picked_up" ? (
            <>
              <Button asChild size="lg" className="w-full"><Link href={`/orders/${o.id}/deliver`}><Camera /> Complete delivery</Link></Button>
              <Button asChild size="lg" variant="outline" className="w-full"><Link href={`/orders/${o.id}/fail`}><XCircle /> Delivery failed</Link></Button>
            </>
          ) : null}
          <Button asChild variant="ghost" className="w-full"><Link href={`/orders/${o.id}/reassign`}><Users /> Hand off to another driver</Link></Button>
        </div>
      ) : (
        <p className="text-center text-sm text-ink-500">This delivery is complete.</p>
      )}
    </div>
  );
}
