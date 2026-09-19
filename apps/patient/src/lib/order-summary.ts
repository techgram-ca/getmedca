import { createServiceClient } from "@getmed/db/service";
import { mediaUrl } from "@getmed/core/storage";
import type { ChromePharmacy } from "@/components/pharmacy/pharmacy-chrome";

/** Minimal, non-PHI order summary for the verify/success pages (looked up by opaque UUID only). */
export async function getOrderSummary(orderId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return null;
  const db = createServiceClient();
  const { data: o } = await db
    .from("orders")
    .select("id, status, order_type, patient_phone, phone_verified_at, created_at, pharmacy_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!o) return null;
  const { data: p } = await db
    .from("pharmacies")
    .select("id, slug, name, phone, address_line, city, logo_path, estimated_delivery_time, offers_consultation")
    .eq("id", o.pharmacy_id)
    .maybeSingle();
  return { ...o, pharmacy: p ? { ...p, logoUrl: await mediaUrl(db, p.logo_path) } : null };
}

type SummaryPharmacy = NonNullable<Awaited<ReturnType<typeof getOrderSummary>>>["pharmacy"];

/** Shapes a pharmacy row for the pharmacy-branded chrome. */
export function toChrome(p: SummaryPharmacy): ChromePharmacy | null {
  if (!p) return null;
  return {
    id: p.id,
    slug: p.slug ?? p.id,
    name: p.name ?? "Your pharmacy",
    logoUrl: p.logoUrl,
    phone: p.phone,
    offersConsultation: p.offers_consultation,
  };
}
