import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServiceClient } from "@getmed/db/service";
import { OrderForm } from "@/components/order-form";
import { OrderingFrom } from "@/components/pharmacy/ordering-from";
import { getPublicPharmacy } from "@/lib/pharmacy";

export const metadata: Metadata = { title: "Order your prescription" };
export const dynamic = "force-dynamic";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ pharmacyId?: string; address?: string; lat?: string; lng?: string; type?: string }>;
}) {
  const sp = await searchParams;
  if (!sp.pharmacyId) notFound();
  const pharmacy = await getPublicPharmacy(sp.pharmacyId);
  if (!pharmacy) notFound();
  const db = createServiceClient();
  const { data: config } = await db.from("form_field_config").select("*").order("sort_order");

  const lat = Number(sp.lat);
  const lng = Number(sp.lng);
  const initialCoords = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  const name = pharmacy.name ?? "your pharmacy";

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink-950 sm:text-3xl">Order your prescription</h1>
      <p className="mt-2 text-ink-500">
        Fill in your details and {name} will take it from there. It takes about two minutes.
      </p>

      <OrderingFrom
        className="mt-6"
        pharmacy={{ id: pharmacy.id, slug: pharmacy.slug ?? pharmacy.id, name, logoUrl: pharmacy.logoUrl }}
      />

      <div className="mt-6">
        <OrderForm
          pharmacy={{ id: pharmacy.id, name, offersTransfer: pharmacy.offers_transfer }}
          config={config ?? []}
          initialAddress={sp.address ?? ""}
          initialCoords={initialCoords}
          initialType={sp.type === "transfer" ? "transfer" : "new"}
        />
      </div>
    </div>
  );
}
