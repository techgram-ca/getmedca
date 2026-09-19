import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServiceClient } from "@getmed/db/service";
import { PharmacyTopBar, type ChromePharmacy } from "@/components/pharmacy/pharmacy-chrome";
import { OrderForm } from "@/components/order-form";
import { getPublicPharmacy } from "@/lib/pharmacy";

export const metadata: Metadata = { title: "Order your prescription" };
export const dynamic = "force-dynamic";

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ pharmacyId?: string; address?: string; lat?: string; lng?: string; type?: string }> }) {
  const sp = await searchParams;
  if (!sp.pharmacyId) notFound();
  const pharmacy = await getPublicPharmacy(sp.pharmacyId);
  if (!pharmacy) notFound();
  const db = createServiceClient();
  const { data: config } = await db.from("form_field_config").select("*").order("sort_order");

  const lat = Number(sp.lat);
  const lng = Number(sp.lng);
  const initialCoords = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;

  const chrome: ChromePharmacy = {
    id: pharmacy.id,
    slug: pharmacy.slug ?? pharmacy.id,
    name: pharmacy.name ?? "Your pharmacy",
    logoUrl: pharmacy.logoUrl,
    phone: pharmacy.phone,
    offersConsultation: pharmacy.offers_consultation,
  };

  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      <PharmacyTopBar pharmacy={chrome} step="Step 1 of 2 · Your details" />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-950 sm:text-3xl">Order your prescription</h1>
        <p className="mt-2 text-ink-500">
          Fill in your details and {chrome.name} will take it from there. It takes about two minutes.
        </p>
        <div className="mt-8">
          <OrderForm
            pharmacy={{ id: pharmacy.id, name: chrome.name, offersTransfer: pharmacy.offers_transfer }}
            config={config ?? []}
            initialAddress={sp.address ?? ""}
            initialCoords={initialCoords}
            initialType={sp.type === "transfer" ? "transfer" : "new"}
          />
        </div>
      </main>
    </div>
  );
}
